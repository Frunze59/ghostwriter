import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { InputProcessor, ValidationException } from '../processors/InputProcessor';
import { OutputProcessor } from '../processors/OutputProcessor';
import { PromptBuilder } from '../prompts/PromptBuilder';
import { ContentGenerator } from '../services/ContentGenerator';
import { RawInput } from '../types/content.types';
import { initSSE, sendChunk, sendDone, sendError } from '../utils/sse';

const router          = Router();
const processor       = new InputProcessor();
const builder         = new PromptBuilder();
const outputProcessor = new OutputProcessor();

// Lazy init: a missing API key fails the request, not the server boot
let generator: ContentGenerator | null = null;
function getGenerator(): ContentGenerator {
  if (!generator) generator = new ContentGenerator();
  return generator;
}

router.post('/generate', async (req: Request, res: Response) => {
  // Validate before opening SSE — while we can still return a JSON error response
  let normalized;
  try {
    const raw = req.body as RawInput;
    if (!raw?.content_type) {
      res.status(400).json({ success: false, errors: [{ field: 'content_type', message: 'content_type is required' }] });
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

  const prompt = builder.build(normalized);

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ success: false, errors: [{ field: 'server', message: 'API key not configured. Add ANTHROPIC_API_KEY to your .env file.' }] });
    return;
  }

  // Past this point errors must travel as SSE events — the HTTP response is already open
  initSSE(res);
  console.log(`[generate] ${prompt.content_type}`);

  try {
    const result = await getGenerator().generateStream(
      prompt,
      normalized.generation_params,
      chunk => sendChunk(res, chunk),
    );

    const wordTarget = 'specifications' in normalized &&
      'word_target' in (normalized as { specifications: { word_target?: number } }).specifications
        ? (normalized as { specifications: { word_target: number } }).specifications.word_target
        : null;

    const processed = outputProcessor.process(result.full_text, normalized.content_type, wordTarget);

    console.log(`[generate] done — ${processed.word_count} words, ${result.metadata.output_tokens} tokens out`);
    sendDone(res, result.metadata, processed);

  } catch (err) {
    console.error('[generate] error:', err);

    if (err instanceof Error && err.message.includes('ANTHROPIC_API_KEY')) {
      sendError(res, 'API key not configured.', 'AUTH_ERROR');
    } else if (err instanceof Anthropic.AuthenticationError) {
      sendError(res, 'Invalid API key.', 'AUTH_ERROR');
    } else if (err instanceof Anthropic.RateLimitError) {
      sendError(res, 'Rate limit reached. Please wait and try again.', 'RATE_LIMIT');
    } else if (err instanceof Anthropic.APIConnectionTimeoutError) {
      sendError(res, 'Request timed out.', 'TIMEOUT');
    } else if (err instanceof Anthropic.APIError) {
      sendError(res, `API error (${err.status}): ${err.message}`, 'API_ERROR');
    } else {
      sendError(res, 'An unexpected error occurred.', 'UNKNOWN');
    }
  }
});

router.post('/validate', (req: Request, res: Response) => {
  try {
    const raw = req.body as RawInput;
    if (!raw?.content_type) {
      res.status(400).json({ success: false, errors: [{ field: 'content_type', message: 'content_type is required' }] });
      return;
    }
    res.json({ success: true, normalized: processor.process(raw) });
  } catch (err) {
    if (err instanceof ValidationException) {
      res.status(400).json({ success: false, errors: err.errors });
    } else {
      res.status(500).json({ success: false, errors: [{ field: 'server', message: 'Internal server error' }] });
    }
  }
});

router.get('/content-types', (_req: Request, res: Response) => {
  res.json({
    types: [
      { id: 'blog_post',    label: 'Blog Post',     description: 'Structured article with SEO optimisation' },
      { id: 'email',        label: 'Email',          description: 'Professional email with subject and body' },
      { id: 'story',        label: 'Short Story',    description: 'Creative fiction with narrative structure' },
      { id: 'social_media', label: 'Social Media',   description: 'Platform-optimised post with hashtags' },
    ],
  });
});

export default router;
