import {
  RawInput, NormalizedInput,
  NormalizedBlogPostInput, NormalizedEmailInput,
  NormalizedStoryInput, NormalizedSocialMediaInput,
  RawBlogPostInput, RawEmailInput, RawStoryInput, RawSocialMediaInput,
  Tone, StoryGenre, StoryLength, SocialPlatform,
  GenerationParams, ValidationError,
} from '../types/content.types';

// Carries field-level errors so the API can return all failures at once
export class ValidationException extends Error {
  constructor(public errors: ValidationError[]) {
    super('Validation failed');
    this.name = 'ValidationException';
  }
}

const VALID_TONES: Tone[] = ['professional', 'casual', 'engaging', 'humorous', 'formal', 'inspirational'];
const VALID_GENRES: StoryGenre[] = ['fantasy', 'sci-fi', 'romance', 'thriller', 'mystery', 'horror', 'adventure', 'literary'];
const VALID_PLATFORMS: SocialPlatform[] = ['twitter', 'linkedin', 'instagram'];

const STORY_WORD_TARGETS: Record<StoryLength, number> = { short: 600, medium: 1200, long: 2200 };

const PLATFORM_CHAR_LIMITS: Record<SocialPlatform, number> = { twitter: 280, linkedin: 3000, instagram: 2200 };
const PLATFORM_HASHTAG_COUNTS: Record<SocialPlatform, number> = { twitter: 2, linkedin: 3, instagram: 10 };

function normalizeTone(raw: string): Tone | null {
  const cleaned = raw.trim().toLowerCase() as Tone;
  return VALID_TONES.includes(cleaned) ? cleaned : null;
}

// Accepts plain numbers, number strings, or ranges ("800-1000") → midpoint
function parseWordCount(raw: string | number): number | null {
  if (typeof raw === 'number') return raw > 0 ? Math.round(raw) : null;

  const str = raw.trim();
  const range = str.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (range) {
    const min = parseInt(range[1], 10);
    const max = parseInt(range[2], 10);
    return min < max ? Math.round((min + max) / 2) : null;
  }

  const num = parseInt(str, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

function parseBoolean(raw: boolean | string): boolean {
  if (typeof raw === 'boolean') return raw;
  return raw.toLowerCase().trim() === 'true';
}

// words × 1.33 (avg tokens/word) × 1.25 buffer, rounded up to nearest 100
function wordsToTokens(words: number): number {
  return Math.ceil((words * 1.33 * 1.25) / 100) * 100;
}

function requireNonEmpty(value: string, field: string, errors: ValidationError[]): string {
  const trimmed = value?.trim();
  if (!trimmed) errors.push({ field, message: `${field} is required` });
  return trimmed ?? '';
}

export class InputProcessor {
  process(raw: RawInput): NormalizedInput {
    switch (raw.content_type) {
      case 'blog_post':    return this.processBlogPost(raw);
      case 'email':        return this.processEmail(raw);
      case 'story':        return this.processStory(raw);
      case 'social_media': return this.processSocialMedia(raw);
    }
  }

  private processBlogPost(raw: RawBlogPostInput): NormalizedBlogPostInput {
    const errors: ValidationError[] = [];

    const topic    = requireNonEmpty(raw.topic, 'topic', errors);
    const audience = requireNonEmpty(raw.target_audience, 'target_audience', errors);

    const wordTarget = parseWordCount(raw.word_count);
    if (wordTarget === null) {
      errors.push({ field: 'word_count', message: 'Enter a number or range like "800-1000"' });
    } else if (wordTarget < 100 || wordTarget > 5000) {
      errors.push({ field: 'word_count', message: 'Must be between 100 and 5000 words' });
    }

    const tone = normalizeTone(raw.tone);
    if (!tone) errors.push({ field: 'tone', message: `Must be one of: ${VALID_TONES.join(', ')}` });

    const rawExpertise = raw.expertise_level?.trim().toLowerCase();
    if (!['beginner', 'intermediate', 'advanced'].includes(rawExpertise)) {
      errors.push({ field: 'expertise_level', message: 'Must be: beginner, intermediate, or advanced' });
    }

    if (errors.length > 0) throw new ValidationException(errors);

    return {
      content_type: 'blog_post',
      context:       { topic, audience, tone: tone! },
      specifications: {
        word_target: wordTarget!,
        seo_enabled: parseBoolean(raw.seo_focus),
        expertise:   rawExpertise as 'beginner' | 'intermediate' | 'advanced',
      },
      generation_params: { temperature: 0.7, max_tokens: wordsToTokens(wordTarget!) },
    };
  }

  private processEmail(raw: RawEmailInput): NormalizedEmailInput {
    const errors: ValidationError[] = [];

    const purpose   = requireNonEmpty(raw.purpose, 'purpose', errors);
    const recipient = requireNonEmpty(raw.recipient_context, 'recipient_context', errors);
    const keyPoints = requireNonEmpty(raw.key_points, 'key_points', errors);
    const cta       = requireNonEmpty(raw.cta, 'cta', errors);

    const tone = normalizeTone(raw.tone);
    if (!tone) errors.push({ field: 'tone', message: `Must be one of: ${VALID_TONES.join(', ')}` });

    const rawUrgency = raw.urgency_level?.trim().toLowerCase();
    if (!['low', 'medium', 'high'].includes(rawUrgency)) {
      errors.push({ field: 'urgency_level', message: 'Must be: low, medium, or high' });
    }

    if (errors.length > 0) throw new ValidationException(errors);

    // higher urgency → lower temperature (more direct, less meandering)
    const urgency = rawUrgency as 'low' | 'medium' | 'high';
    const tempByUrgency = { low: 0.6, medium: 0.5, high: 0.4 };

    return {
      content_type: 'email',
      context:       { purpose, recipient, key_points: keyPoints, tone: tone!, cta },
      specifications: { urgency },
      generation_params: { temperature: tempByUrgency[urgency], max_tokens: 600 },
    };
  }

  private processStory(raw: RawStoryInput): NormalizedStoryInput {
    const errors: ValidationError[] = [];

    const characters = requireNonEmpty(raw.characters, 'characters', errors);
    const setting    = requireNonEmpty(raw.setting, 'setting', errors);
    const mood       = requireNonEmpty(raw.mood, 'mood', errors);
    const style      = requireNonEmpty(raw.style, 'style', errors);
    const audience   = requireNonEmpty(raw.target_audience, 'target_audience', errors);

    const rawGenre = raw.genre?.trim().toLowerCase() as StoryGenre;
    if (!VALID_GENRES.includes(rawGenre)) {
      errors.push({ field: 'genre', message: `Must be one of: ${VALID_GENRES.join(', ')}` });
    }

    const rawLength = raw.length?.trim().toLowerCase() as StoryLength;
    if (!['short', 'medium', 'long'].includes(rawLength)) {
      errors.push({ field: 'length', message: 'Must be: short, medium, or long' });
    }

    if (errors.length > 0) throw new ValidationException(errors);

    const wordTarget = STORY_WORD_TARGETS[rawLength];

    return {
      content_type: 'story',
      context:       { genre: rawGenre, characters, setting, mood, style, audience },
      specifications: { length: rawLength, word_target: wordTarget },
      generation_params: { temperature: 0.9, max_tokens: wordsToTokens(wordTarget) },
    };
  }

  private processSocialMedia(raw: RawSocialMediaInput): NormalizedSocialMediaInput {
    const errors: ValidationError[] = [];

    const product = requireNonEmpty(raw.product_service, 'product_service', errors);
    const goal    = requireNonEmpty(raw.goal, 'goal', errors);
    const cta     = requireNonEmpty(raw.cta, 'cta', errors);

    const tone = normalizeTone(raw.tone);
    if (!tone) errors.push({ field: 'tone', message: `Must be one of: ${VALID_TONES.join(', ')}` });

    const rawPlatform = raw.platform?.trim().toLowerCase() as SocialPlatform;
    if (!VALID_PLATFORMS.includes(rawPlatform)) {
      errors.push({ field: 'platform', message: `Must be one of: ${VALID_PLATFORMS.join(', ')}` });
    }

    if (errors.length > 0) throw new ValidationException(errors);

    return {
      content_type: 'social_media',
      context:       { product_service: product, platform: rawPlatform, goal, tone: tone!, cta },
      specifications: { char_limit: PLATFORM_CHAR_LIMITS[rawPlatform], hashtag_count: PLATFORM_HASHTAG_COUNTS[rawPlatform] },
      generation_params: { temperature: 0.8, max_tokens: 400 },
    };
  }
}
