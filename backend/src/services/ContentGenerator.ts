// ContentGenerator.ts
// Wraps the Anthropic SDK. Responsibilities:
//   1. Send built prompts to Claude
//   2. Stream the response back chunk by chunk
//   3. Retry on transient failures with exponential backoff
//   4. Return usage metadata (token counts) alongside the content

import Anthropic from '@anthropic-ai/sdk';
import { GenerationParams } from '../types/content.types';
import { BuiltPrompt } from '../prompts/PromptBuilder';

// ─── Types ────────────────────────────────────────────────────────────────────

// Metadata returned alongside the generated text
export interface GenerationMetadata {
  model: string;
  input_tokens: number;
  output_tokens: number;
  content_type: string;
}

// The callback the route uses to receive chunks in real time.
// Called once per streamed text delta from Claude.
export type ChunkCallback = (text: string) => void;

// The full result once streaming completes
export interface GenerationResult {
  full_text: string;
  metadata: GenerationMetadata;
}

// ─── Error classification ─────────────────────────────────────────────────────

// Status codes we should retry on (transient server-side problems)
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 529]);

function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    return RETRYABLE_STATUS_CODES.has(err.status);
  }
  // Network errors (ECONNRESET, ETIMEDOUT) are also retryable
  if (err instanceof Error) {
    return err.message.includes('timeout') || err.message.includes('ECONNRESET');
  }
  return false;
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

// Exponential backoff: attempt 0 → 1s, attempt 1 → 2s, attempt 2 → 4s
function backoffMs(attempt: number): number {
  return Math.pow(2, attempt) * 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retries an async operation up to maxRetries times.
// Non-retryable errors are re-thrown immediately.
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  label = 'operation',
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === maxRetries;

      // 401 = bad API key, 400 = bad request — retrying won't help
      if (err instanceof Anthropic.APIError && (err.status === 401 || err.status === 400)) {
        throw err;
      }

      if (isLast || !isRetryable(err)) {
        throw err;
      }

      const delay = backoffMs(attempt);
      console.warn(`[ContentGenerator] ${label} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`, err instanceof Error ? err.message : err);
      await sleep(delay);
    }
  }
  // TypeScript needs this even though the loop always throws or returns
  throw new Error('Max retries exceeded');
}

// ─── ContentGenerator ─────────────────────────────────────────────────────────

export class ContentGenerator {
  private client: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Add it to your .env file.',
      );
    }

    this.client = new Anthropic({
      apiKey,
      // Cap each request at 90 seconds. Free-tier responses can be slow,
      // but we don't want users waiting indefinitely.
      timeout: 90_000,
    });

    // Allow overriding the model via env var so you can easily switch between
    // haiku (fast/cheap) and sonnet (higher quality) without code changes
    this.model = process.env.CLAUDE_MODEL ?? 'claude-3-5-haiku-20241022';
    console.log(`[ContentGenerator] using model: ${this.model}`);
  }

  // ── Main method: stream generation ────────────────────────────────────────
  // Sends the prompt to Claude and calls onChunk for every text delta received.
  // Returns the full concatenated text + usage metadata once streaming completes.
  async generateStream(
    prompt: BuiltPrompt,
    params: GenerationParams,
    onChunk: ChunkCallback,
  ): Promise<GenerationResult> {
    return withRetry(
      async () => {
        let full_text = '';

        // client.messages.stream() opens a streaming connection.
        // It returns an async iterable of events, each typed by the SDK.
        const stream = this.client.messages.stream({
          model: this.model,
          max_tokens: params.max_tokens,
          temperature: params.temperature,
          top_p: params.top_p,
          system: prompt.system,
          messages: [{ role: 'user', content: prompt.user }],
        });

        // Iterate over every event Claude sends back
        for await (const event of stream) {
          // We only care about text deltas — the content being written
          // Other event types (message_start, message_stop, etc.) carry metadata
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const chunk = event.delta.text;
            full_text += chunk;
            onChunk(chunk);              // forward to the SSE writer in the route
          }
        }

        // finalMessage() is safe to call after the stream ends —
        // it contains usage stats (input/output token counts)
        const final = await stream.finalMessage();

        return {
          full_text,
          metadata: {
            model: this.model,
            input_tokens: final.usage.input_tokens,
            output_tokens: final.usage.output_tokens,
            content_type: prompt.content_type,
          },
        };
      },
      3,
      `generate:${prompt.content_type}`,
    );
  }
}
