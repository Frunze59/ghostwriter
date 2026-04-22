// generate.route.ts
// Express router for content-generation related endpoints.
//
// Right now: POST /api/validate (Phase 2 — test input pipeline)
// Phase 6 will add: POST /api/generate (full pipeline)

import { Router, Request, Response } from 'express';
import { InputProcessor, ValidationException } from '../processors/InputProcessor';
import { RawInput } from '../types/content.types';

const router = Router();
const processor = new InputProcessor();

// POST /api/validate
// Accepts raw user input, runs it through the processor, returns the
// normalized form. Useful for the frontend to show users what will be sent
// to the AI — and for us to test the pipeline without burning API credits.
router.post('/validate', (req: Request, res: Response) => {
  try {
    const raw = req.body as RawInput;

    // Guard: content_type must be present or we can't even route it
    if (!raw?.content_type) {
      res.status(400).json({
        success: false,
        errors: [{ field: 'content_type', message: 'content_type is required' }],
      });
      return;
    }

    const normalized = processor.process(raw);

    res.json({
      success: true,
      normalized,
    });
  } catch (err) {
    if (err instanceof ValidationException) {
      // Expected: user submitted bad data — 400 Bad Request
      res.status(400).json({
        success: false,
        errors: err.errors,
      });
    } else {
      // Unexpected: something broke in our code — 500
      console.error('[validate] unexpected error:', err);
      res.status(500).json({
        success: false,
        errors: [{ field: 'server', message: 'Internal server error' }],
      });
    }
  }
});

// GET /api/content-types
// Returns the supported content types and their required fields.
// The frontend will use this to dynamically render the correct form.
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
