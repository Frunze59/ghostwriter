export type ContentType = 'blog_post' | 'email' | 'story' | 'social_media';

export type GenerationStatus = 'idle' | 'generating' | 'done' | 'error';

export interface GenerationMetadata {
  model: string;
  input_tokens: number;
  output_tokens: number;
  content_type: string;
}

export interface ValidationResult {
  word_count_ok: boolean;
  word_count_delta_pct: number | null;
  missing_sections: string[];
  artifacts_removed: number;
}

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

export interface GenerationState {
  status: GenerationStatus;
  text: string;
  processed: ProcessedOutput | null;
  metadata: GenerationMetadata | null;
  error: string | null;
  fieldErrors: Record<string, string>;
}

export interface ContentTypeCard {
  id: ContentType;
  label: string;
  description: string;
  icon: string;
}

export type FormValues = Record<string, string | boolean>;
