// Shared frontend types

export type ContentType = 'blog_post' | 'email' | 'story' | 'social_media';

export type GenerationStatus = 'idle' | 'generating' | 'done' | 'error';

// What streams back from the server
export interface GenerationMetadata {
  model: string;
  input_tokens: number;
  output_tokens: number;
  content_type: string;
}

// The state managed by useGenerate
export interface GenerationState {
  status: GenerationStatus;
  text: string;                        // accumulated output so far
  metadata: GenerationMetadata | null;
  error: string | null;
}

// One content type card shown in the selector
export interface ContentTypeCard {
  id: ContentType;
  label: string;
  description: string;
  icon: string;                        // emoji — simple and zero-dependency
}

// Raw form values — keyed by field name, value always a string or boolean
// (we let the backend normalize everything)
export type FormValues = Record<string, string | boolean>;
