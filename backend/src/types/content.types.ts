// content.types.ts
// All TypeScript interfaces for the input pipeline.
//
// Two layers per content type:
//   Raw*Input   — exactly what the user submits (loose types, strings everywhere)
//   Normalized* — what the processor hands off to the prompt builder (strict types)

// ─── Shared enums ──────────────────────────────────────────────────────────────

// Every content type supports these tones
export type Tone =
  | 'professional'
  | 'casual'
  | 'engaging'
  | 'humorous'
  | 'formal'
  | 'inspirational';

// The 4 content types the platform supports
export type ContentType = 'blog_post' | 'email' | 'story' | 'social_media';

// Generation parameters sent directly to the Claude API
export interface GenerationParams {
  temperature: number;  // 0.0–1.0: lower = more focused, higher = more creative
  max_tokens: number;   // hard cap on response length
  top_p: number;        // nucleus sampling: diversity control (0.0–1.0)
}

// ─── Blog Post ─────────────────────────────────────────────────────────────────

export interface RawBlogPostInput {
  content_type: 'blog_post';
  topic: string;
  target_audience: string;
  word_count: string | number;       // user may type "800-1000" or just 900
  tone: string;
  seo_focus: boolean | string;       // checkbox = boolean, but forms sometimes send "true"
  expertise_level: string;
}

export interface NormalizedBlogPostInput {
  content_type: 'blog_post';
  context: {
    topic: string;
    audience: string;
    tone: Tone;
  };
  specifications: {
    word_target: number;             // always a single number after normalization
    seo_enabled: boolean;
    expertise: 'beginner' | 'intermediate' | 'advanced';
  };
  generation_params: GenerationParams;
}

// ─── Email ─────────────────────────────────────────────────────────────────────

export interface RawEmailInput {
  content_type: 'email';
  purpose: string;
  recipient_context: string;
  key_points: string;                // user types free text; we'll keep as-is
  tone: string;
  urgency_level: string;
  cta: string;                       // call to action, e.g. "Book a call"
}

export interface NormalizedEmailInput {
  content_type: 'email';
  context: {
    purpose: string;
    recipient: string;
    key_points: string;
    tone: Tone;
    cta: string;
  };
  specifications: {
    urgency: 'low' | 'medium' | 'high';
  };
  generation_params: GenerationParams;
}

// ─── Story ─────────────────────────────────────────────────────────────────────

export type StoryGenre =
  | 'fantasy'
  | 'sci-fi'
  | 'romance'
  | 'thriller'
  | 'mystery'
  | 'horror'
  | 'adventure'
  | 'literary';

export type StoryLength = 'short' | 'medium' | 'long';

export interface RawStoryInput {
  content_type: 'story';
  genre: string;
  characters: string;
  setting: string;
  length: string;                    // "short" | "medium" | "long"
  style: string;
  target_audience: string;
  mood: string;
}

export interface NormalizedStoryInput {
  content_type: 'story';
  context: {
    genre: StoryGenre;
    characters: string;
    setting: string;
    mood: string;
    style: string;
    audience: string;
  };
  specifications: {
    length: StoryLength;
    word_target: number;             // short=600, medium=1200, long=2200
  };
  generation_params: GenerationParams;
}

// ─── Social Media ──────────────────────────────────────────────────────────────

export type SocialPlatform = 'twitter' | 'linkedin' | 'instagram';

export interface RawSocialMediaInput {
  content_type: 'social_media';
  product_service: string;
  platform: string;
  goal: string;
  tone: string;
  cta: string;
}

export interface NormalizedSocialMediaInput {
  content_type: 'social_media';
  context: {
    product_service: string;
    platform: SocialPlatform;
    goal: string;
    tone: Tone;
    cta: string;
  };
  specifications: {
    char_limit: number;              // twitter=280, linkedin=3000, instagram=2200
    hashtag_count: number;          // platform-appropriate hashtag count
  };
  generation_params: GenerationParams;
}

// ─── Union types — used throughout the pipeline ────────────────────────────────

// Any raw input the user might submit
export type RawInput =
  | RawBlogPostInput
  | RawEmailInput
  | RawStoryInput
  | RawSocialMediaInput;

// Any normalized input ready for prompt building
export type NormalizedInput =
  | NormalizedBlogPostInput
  | NormalizedEmailInput
  | NormalizedStoryInput
  | NormalizedSocialMediaInput;

// Standard error shape returned when validation fails
export interface ValidationError {
  field: string;
  message: string;
}
