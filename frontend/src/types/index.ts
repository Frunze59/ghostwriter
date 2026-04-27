// Shared frontend types

export type ContentType = 'blog_post' | 'email' | 'story' | 'social_media';

export type GenerationStatus = 'idle' | 'generating' | 'done' | 'error';

// AI usage metadata from the Anthropic API
export interface GenerationMetadata {
  model: string;
  input_tokens: number;
  output_tokens: number;
  content_type: string;
}

// Post-processing validation report
export interface ValidationResult {
  word_count_ok: boolean;
  word_count_delta_pct: number | null;
  missing_sections: string[];
  artifacts_removed: number;
}

// Processed output from the OutputProcessor (mirrors backend type)
export interface ProcessedOutput {
  cleaned_text: string;
  title: string | null;
  word_count: number;
  estimated_read_time: string;
  validation: ValidationResult;
  exports: {
    markdown: string;
    plain_text: string;
  };
}

// The state managed by useGenerate
export interface GenerationState {
  status: GenerationStatus;
  text: string;                          // raw streamed text (shown while generating)
  processed: ProcessedOutput | null;     // cleaned + parsed (available after done)
  metadata: GenerationMetadata | null;
  error: string | null;
}

// One content type card shown in the selector
export interface ContentTypeCard {
  id: ContentType;
  label: string;
  description: string;
  icon: string;
}

// Raw form values — keyed by field name, value always a string or boolean
export type FormValues = Record<string, string | boolean>;
