// InputProcessor.ts
// Responsible for: validate → normalize → compute generation params.
//
// Why a class? It groups related logic together and makes it easy to
// unit-test each content type independently.

import {
  RawInput,
  NormalizedInput,
  NormalizedBlogPostInput,
  NormalizedEmailInput,
  NormalizedStoryInput,
  NormalizedSocialMediaInput,
  RawBlogPostInput,
  RawEmailInput,
  RawStoryInput,
  RawSocialMediaInput,
  Tone,
  StoryGenre,
  StoryLength,
  SocialPlatform,
  GenerationParams,
  ValidationError,
} from '../types/content.types';

// ─── Custom error class ────────────────────────────────────────────────────────
// Extends the built-in Error so we can attach structured field-level errors.
// This lets the API route return { errors: [...] } instead of a plain string.
export class ValidationException extends Error {
  constructor(public errors: ValidationError[]) {
    super('Validation failed');
    this.name = 'ValidationException';
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_TONES: Tone[] = [
  'professional', 'casual', 'engaging', 'humorous', 'formal', 'inspirational',
];

const VALID_GENRES: StoryGenre[] = [
  'fantasy', 'sci-fi', 'romance', 'thriller', 'mystery', 'horror', 'adventure', 'literary',
];

const VALID_PLATFORMS: SocialPlatform[] = ['twitter', 'linkedin', 'instagram'];

// Word targets per story length — a design decision baked in here
// so it never has to be computed anywhere else
const STORY_WORD_TARGETS: Record<StoryLength, number> = {
  short: 600,
  medium: 1200,
  long: 2200,
};

// Platform character limits (official as of 2024)
const PLATFORM_CHAR_LIMITS: Record<SocialPlatform, number> = {
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
};

// Platform-appropriate hashtag counts
const PLATFORM_HASHTAG_COUNTS: Record<SocialPlatform, number> = {
  twitter: 2,
  linkedin: 3,
  instagram: 10,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Normalize a tone string: strip whitespace, lowercase, validate against enum.
// Returns the normalized tone, or null if it's not recognized.
function normalizeTone(raw: string): Tone | null {
  const cleaned = raw.trim().toLowerCase() as Tone;
  return VALID_TONES.includes(cleaned) ? cleaned : null;
}

// Parse a word count that may be a range ("800-1000"), a plain number,
// or a number-as-string ("900"). Returns the midpoint for ranges.
function parseWordCount(raw: string | number): number | null {
  if (typeof raw === 'number') {
    return raw > 0 ? Math.round(raw) : null;
  }

  const str = raw.trim();

  // Range format: "800-1000" or "800 - 1000"
  const rangeMatch = str.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    if (min >= max) return null;          // "1000-800" is nonsense
    return Math.round((min + max) / 2);  // midpoint
  }

  // Plain number as string: "900"
  const num = parseInt(str, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

// Normalize a boolean that might arrive as actual boolean or as the
// string "true"/"false" (common with HTML form submissions)
function parseBoolean(raw: boolean | string): boolean {
  if (typeof raw === 'boolean') return raw;
  return raw.toLowerCase().trim() === 'true';
}

// Tokens ≈ words × 1.33 (English average). We add 25% buffer on top
// to avoid truncated responses, then round up to the nearest 100.
function wordsToTokens(words: number): number {
  return Math.ceil((words * 1.33 * 1.25) / 100) * 100;
}

// Validate that a string field is non-empty (after trimming)
function requireNonEmpty(value: string, field: string, errors: ValidationError[]): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    errors.push({ field, message: `${field} is required and cannot be empty` });
    return '';
  }
  return trimmed;
}

// ─── Main class ───────────────────────────────────────────────────────────────

export class InputProcessor {

  // Public entry point: validate then normalize.
  // Throws ValidationException if anything is wrong.
  process(raw: RawInput): NormalizedInput {
    switch (raw.content_type) {
      case 'blog_post':    return this.processBlogPost(raw);
      case 'email':        return this.processEmail(raw);
      case 'story':        return this.processStory(raw);
      case 'social_media': return this.processSocialMedia(raw);
    }
  }

  // ── Blog Post ──────────────────────────────────────────────────────────────

  private processBlogPost(raw: RawBlogPostInput): NormalizedBlogPostInput {
    const errors: ValidationError[] = [];

    // --- Validate & normalize each field ---

    const topic    = requireNonEmpty(raw.topic, 'topic', errors);
    const audience = requireNonEmpty(raw.target_audience, 'target_audience', errors);

    // Word count: parse the potentially-range string
    const wordTarget = parseWordCount(raw.word_count);
    if (wordTarget === null) {
      errors.push({
        field: 'word_count',
        message: 'word_count must be a positive number or a range like "800-1000"',
      });
    } else if (wordTarget < 100 || wordTarget > 5000) {
      errors.push({
        field: 'word_count',
        message: 'word_count must be between 100 and 5000 words',
      });
    }

    // Tone: lowercase + validate
    const tone = normalizeTone(raw.tone);
    if (!tone) {
      errors.push({
        field: 'tone',
        message: `tone must be one of: ${VALID_TONES.join(', ')}`,
      });
    }

    // Expertise: normalize to lowercase, validate
    const rawExpertise = raw.expertise_level?.trim().toLowerCase();
    if (!['beginner', 'intermediate', 'advanced'].includes(rawExpertise)) {
      errors.push({
        field: 'expertise_level',
        message: 'expertise_level must be: beginner, intermediate, or advanced',
      });
    }

    if (errors.length > 0) throw new ValidationException(errors);

    const finalWordTarget = wordTarget!;

    // --- Compute generation params ---
    // Blog posts: moderate temperature (creative but coherent)
    const generation_params: GenerationParams = {
      temperature: 0.7,
      max_tokens: wordsToTokens(finalWordTarget),
      top_p: 0.9,
    };

    return {
      content_type: 'blog_post',
      context: {
        topic,
        audience,
        tone: tone!,
      },
      specifications: {
        word_target: finalWordTarget,
        seo_enabled: parseBoolean(raw.seo_focus),
        expertise: rawExpertise as 'beginner' | 'intermediate' | 'advanced',
      },
      generation_params,
    };
  }

  // ── Email ──────────────────────────────────────────────────────────────────

  private processEmail(raw: RawEmailInput): NormalizedEmailInput {
    const errors: ValidationError[] = [];

    const purpose   = requireNonEmpty(raw.purpose, 'purpose', errors);
    const recipient = requireNonEmpty(raw.recipient_context, 'recipient_context', errors);
    const keyPoints = requireNonEmpty(raw.key_points, 'key_points', errors);
    const cta       = requireNonEmpty(raw.cta, 'cta', errors);

    const tone = normalizeTone(raw.tone);
    if (!tone) {
      errors.push({
        field: 'tone',
        message: `tone must be one of: ${VALID_TONES.join(', ')}`,
      });
    }

    const rawUrgency = raw.urgency_level?.trim().toLowerCase();
    if (!['low', 'medium', 'high'].includes(rawUrgency)) {
      errors.push({
        field: 'urgency_level',
        message: 'urgency_level must be: low, medium, or high',
      });
    }

    if (errors.length > 0) throw new ValidationException(errors);

    // Emails: lower temperature = more focused, professional output
    // urgency affects temperature: high urgency → slightly more direct
    const urgencyTempMap = { low: 0.6, medium: 0.5, high: 0.4 };
    const urgency = rawUrgency as 'low' | 'medium' | 'high';

    const generation_params: GenerationParams = {
      temperature: urgencyTempMap[urgency],
      max_tokens: 600,   // emails should be concise
      top_p: 0.85,
    };

    return {
      content_type: 'email',
      context: {
        purpose,
        recipient,
        key_points: keyPoints,
        tone: tone!,
        cta,
      },
      specifications: { urgency },
      generation_params,
    };
  }

  // ── Story ──────────────────────────────────────────────────────────────────

  private processStory(raw: RawStoryInput): NormalizedStoryInput {
    const errors: ValidationError[] = [];

    const characters = requireNonEmpty(raw.characters, 'characters', errors);
    const setting    = requireNonEmpty(raw.setting, 'setting', errors);
    const mood       = requireNonEmpty(raw.mood, 'mood', errors);
    const style      = requireNonEmpty(raw.style, 'style', errors);
    const audience   = requireNonEmpty(raw.target_audience, 'target_audience', errors);

    // Genre: normalize and validate
    const rawGenre = raw.genre?.trim().toLowerCase() as StoryGenre;
    if (!VALID_GENRES.includes(rawGenre)) {
      errors.push({
        field: 'genre',
        message: `genre must be one of: ${VALID_GENRES.join(', ')}`,
      });
    }

    // Length: normalize and validate
    const rawLength = raw.length?.trim().toLowerCase() as StoryLength;
    if (!['short', 'medium', 'long'].includes(rawLength)) {
      errors.push({
        field: 'length',
        message: 'length must be: short, medium, or long',
      });
    }

    if (errors.length > 0) throw new ValidationException(errors);

    const wordTarget = STORY_WORD_TARGETS[rawLength];

    // Stories: highest temperature — we want creative, varied output
    const generation_params: GenerationParams = {
      temperature: 0.9,
      max_tokens: wordsToTokens(wordTarget),
      top_p: 0.95,
    };

    return {
      content_type: 'story',
      context: {
        genre: rawGenre,
        characters,
        setting,
        mood,
        style,
        audience,
      },
      specifications: {
        length: rawLength,
        word_target: wordTarget,
      },
      generation_params,
    };
  }

  // ── Social Media ───────────────────────────────────────────────────────────

  private processSocialMedia(raw: RawSocialMediaInput): NormalizedSocialMediaInput {
    const errors: ValidationError[] = [];

    const product = requireNonEmpty(raw.product_service, 'product_service', errors);
    const goal    = requireNonEmpty(raw.goal, 'goal', errors);
    const cta     = requireNonEmpty(raw.cta, 'cta', errors);

    const tone = normalizeTone(raw.tone);
    if (!tone) {
      errors.push({
        field: 'tone',
        message: `tone must be one of: ${VALID_TONES.join(', ')}`,
      });
    }

    const rawPlatform = raw.platform?.trim().toLowerCase() as SocialPlatform;
    if (!VALID_PLATFORMS.includes(rawPlatform)) {
      errors.push({
        field: 'platform',
        message: `platform must be one of: ${VALID_PLATFORMS.join(', ')}`,
      });
    }

    if (errors.length > 0) throw new ValidationException(errors);

    // Social: moderate-high temperature — punchy, varied copy
    const generation_params: GenerationParams = {
      temperature: 0.8,
      max_tokens: 400,   // social posts are short
      top_p: 0.9,
    };

    return {
      content_type: 'social_media',
      context: {
        product_service: product,
        platform: rawPlatform,
        goal,
        tone: tone!,
        cta,
      },
      specifications: {
        char_limit: PLATFORM_CHAR_LIMITS[rawPlatform],
        hashtag_count: PLATFORM_HASHTAG_COUNTS[rawPlatform],
      },
      generation_params,
    };
  }
}
