import Anthropic from '@anthropic-ai/sdk';
import { GenerationParams } from '../types/content.types';
import { BuiltPrompt } from '../prompts/PromptBuilder';

export interface GenerationMetadata {
  model: string;
  input_tokens: number;
  output_tokens: number;
  content_type: string;
}

export type ChunkCallback = (text: string) => void;

export interface GenerationResult {
  full_text: string;
  metadata: GenerationMetadata;
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 529]);

function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) return RETRYABLE_STATUS_CODES.has(err.status);
  if (err instanceof Error) return err.message.includes('timeout') || err.message.includes('ECONNRESET');
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, label = 'op'): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      // 401/400 won't be fixed by retrying
      if (err instanceof Anthropic.APIError && (err.status === 401 || err.status === 400)) throw err;
      if (attempt === maxRetries || !isRetryable(err)) throw err;

      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`[ContentGenerator] ${label} attempt ${attempt + 1} failed, retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
  throw new Error('Max retries exceeded');
}

export class ContentGenerator {
  private client: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env file.');

    this.client = new Anthropic({ apiKey, timeout: 90_000 });
    this.model  = process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001';
    console.log(`[ContentGenerator] model: ${this.model}`);
  }

  async generateStream(
    prompt: BuiltPrompt,
    params: GenerationParams,
    onChunk: ChunkCallback,
  ): Promise<GenerationResult> {
    return withRetry(async () => {
      let full_text = '';

      const stream = this.client.messages.stream({
        model:       this.model,
        max_tokens:  params.max_tokens,
        temperature: params.temperature,
        system:      prompt.system,
        messages:    [{ role: 'user', content: prompt.user }],
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          full_text += event.delta.text;
          onChunk(event.delta.text);
        }
      }

      const final = await stream.finalMessage();

      return {
        full_text,
        metadata: {
          model:         this.model,
          input_tokens:  final.usage.input_tokens,
          output_tokens: final.usage.output_tokens,
          content_type:  prompt.content_type,
        },
      };
    }, 3, `generate:${prompt.content_type}`);
  }
}
