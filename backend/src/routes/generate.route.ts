// generate.route.ts
// Express router for content-generation endpoints.
//
// POST /api/generate  — full pipeline: validate → prompt → AI → SSE stream
// POST /api/validate  — pipeline dry-run (no AI call, returns normalized input)
// GET  /api/content-types — field schemas for all supported content types

import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { InputProcessor, ValidationException } from '../processors/InputProcessor';
import { OutputProcessor } from '../processors/OutputProcessor';
import { PromptBuilder } from '../prompts/PromptBuilder';
import { ContentGenerator } from '../services/ContentGenerator';
import { RawInput } from '../types/content.types';
import { initSSE, sendChunk, sendDone, sendError } from '../utils/sse';

const outputProcessor = new OutputProcessor();

const router    = Router();
const processor = new InputProcessor();
const builder   = new PromptBuilder();

// ContentGenerator is instantiated lazily (on first request) so a missing
// API key doesn't crash the server on boot — it just fails the first /generate call.
let generator: ContentGenerator | null = null;

function getGenerator(): ContentGenerator {
  if (!generator) {
    generator = new ContentGenerator();
  }
  return generator;
}

// ─── POST /api/generate ───────────────────────────────────────────────────────
// Full pipeline: raw input → validate → normalize → build prompt → stream AI response.
// Uses SSE — the response is a never-ending stream of `data: {...}` lines.
//
// Client usage (fetch):
//   const res = await fetch('/api/generate', { method: 'POST', body: JSON.stringify(input) });
//   const reader = res.body.getReader();
//   // read chunks until { type: 'done' } arrives
router.post('/generate', async (req: Request, res: Response) => {
  // ── Step 1: validate & normalize input ──────────────────────────────────────
  // Do this BEFORE opening the SSE stream so we can still return a normal
  // JSON error response if the input is bad.
  let normalized;
  try {
    const raw = req.body as RawInput;
    if (!raw?.content_type) {
      res.status(400).json({
        success: false,
        errors: [{ field: 'content_type', message: 'content_type is required' }],
      });
      return;
    }
    normalized = processor.process(raw);
  } catch (err) {
    if (err instanceof ValidationException) {
      res.status(400).json({ success: false, errors: err.errors });
      return;
    }
    res.status(500).json({ success: false, errors: [{ field: 'server', message: 'Input processing failed' }] });
    return;
  }

  // ── Step 2: build the prompt ─────────────────────────────────────────────
  const prompt = builder.build(normalized);

  // ── Step 3: pre-flight check — fail fast before opening the SSE stream ───
  // If the API key is missing we still have a normal HTTP response available.
  // Once initSSE() is called we can only communicate via SSE events.
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({
      success: false,
      errors: [{ field: 'server', message: 'API key not configured. Add ANTHROPIC_API_KEY to your .env file.' }],
    });
    return;
  }

  // ── Step 4: open SSE stream ───────────────────────────────────────────────
  // From this point on we can't send HTTP status codes or JSON — we're in SSE mode.
  // Any errors must be sent as { type: 'error' } events.
  initSSE(res);

  console.log(`[generate] starting stream for content_type=${prompt.content_type}`);

  // ── Step 5: call Claude, forward chunks ──────────────────────────────────
  try {
    const gen = getGenerator();

    const result = await gen.generateStream(
      prompt,
      normalized.generation_params,
      (chunk) => sendChunk(res, chunk),   // called for every text delta
    );

    // ── Step 6: post-process ────────────────────────────────────────────────
    // Extract word target if available (only blog_post and story have one)
    const wordTarget = 'specifications' in normalized &&
      'word_target' in (normalized as { specifications: { word_target?: number } }).specifications
        ? (normalized as { specifications: { word_target: number } }).specifications.word_target
        : null;

    const processed = outputProcessor.process(
      result.full_text,
      normalized.content_type,
      wordTarget,
    );

    console.log(
      `[generate] done. tokens in=${result.metadata.input_tokens} ` +
      `out=${result.metadata.output_tokens} words=${processed.word_count} ` +
      `artifacts_removed=${processed.validation.artifacts_removed}`,
    );

    sendDone(res, result.metadata, processed);

  } catch (err) {
    console.error('[generate] error during generation:', err);

    // Classify the error for the client
    if (err instanceof Error && err.message.includes('ANTHROPIC_API_KEY')) {
      sendError(res, 'API key not configured. Add ANTHROPIC_API_KEY to your .env file.', 'AUTH_ERROR');
    } else if (err instanceof Anthropic.AuthenticationError) {
      sendError(res, 'Invalid API key. Check your ANTHROPIC_API_KEY value.', 'AUTH_ERROR');
    } else if (err instanceof Anthropic.RateLimitError) {
      sendError(res, 'Rate limit reached. Please wait a moment and try again.', 'RATE_LIMIT');
    } else if (err instanceof Anthropic.APIConnectionTimeoutError) {
      sendError(res, 'Request timed out. The AI took too long to respond.', 'TIMEOUT');
    } else if (err instanceof Anthropic.APIError) {
      sendError(res, `API error (${err.status}): ${err.message}`, 'API_ERROR');
    } else {
      sendError(res, 'An unexpected error occurred during generation.', 'UNKNOWN');
    }
  }
});

// ─── POST /api/validate ───────────────────────────────────────────────────────
// Dry-run: validate and normalize input without calling the AI.
// Returns the normalized form so the frontend can inspect what will be sent.
router.post('/validate', (req: Request, res: Response) => {
  try {
    const raw = req.body as RawInput;

    if (!raw?.content_type) {
      res.status(400).json({
        success: false,
        errors: [{ field: 'content_type', message: 'content_type is required' }],
      });
      return;
    }

    const normalized = processor.process(raw);
    res.json({ success: true, normalized });
  } catch (err) {
    if (err instanceof ValidationException) {
      res.status(400).json({ success: false, errors: err.errors });
    } else {
      console.error('[validate] unexpected error:', err);
      res.status(500).json({ success: false, errors: [{ field: 'server', message: 'Internal server error' }] });
    }
  }
});

// ─── GET /api/content-types ───────────────────────────────────────────────────
// Returns supported content types with their field schemas.
// The frontend uses this to render the correct form for each type.
router.get('/content-types', (_req: Request, res: Response) => {
  res.json({
    types: [
      {
        id: 'blog_post',
        label: 'Blog Post',
        description: 'Structured article with SEO optimization',
        fields: ['topic', 'target_audience', 'word_count', 'tone', 'seo_focus', 'expertise_level'],
      },
      {
        id: 'email',
        label: 'Email',
        description: 'Professional email with subject and body',
        fields: ['purpose', 'recipient_context', 'key_points', 'tone', 'urgency_level', 'cta'],
      },
      {
        id: 'story',
        label: 'Short Story',
        description: 'Creative fiction with narrative structure',
        fields: ['genre', 'characters', 'setting', 'length', 'style', 'target_audience', 'mood'],
      },
      {
        id: 'social_media',
        label: 'Social Media',
        description: 'Platform-optimized posts with hashtags',
        fields: ['product_service', 'platform', 'goal', 'tone', 'cta'],
      },
    ],
  });
});

export default router;
