// sse.ts
// Server-Sent Events helper.
//
// SSE wire format (from the spec):
//   data: <json string>\n\n
//
// Each message must end with TWO newlines — one ends the data field,
// one ends the event. A single newline would be treated as a continuation.
//
// Event types we send:
//   { type: 'chunk',    text: string }                       — content delta
//   { type: 'done',     metadata: GenerationMetadata }       — stream complete
//   { type: 'error',    message: string, code?: string }     — something went wrong

import { Response } from 'express';
import type { GenerationMetadata } from '../services/ContentGenerator';
import type { ProcessedOutput } from '../processors/OutputProcessor';

// Call this before writing any events — sets the required HTTP headers
export function initSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Disable nginx/proxy buffering so chunks reach the browser immediately
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

// Send a text chunk (called once per Claude delta)
export function sendChunk(res: Response, text: string): void {
  res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
}

// Send the completion event — includes both AI metadata and post-processed output
export function sendDone(
  res: Response,
  metadata: GenerationMetadata,
  processed: ProcessedOutput,
): void {
  res.write(`data: ${JSON.stringify({ type: 'done', metadata, processed })}\n\n`);
  res.end();
}

// Send an error event and close the stream
export function sendError(res: Response, message: string, code?: string): void {
  res.write(`data: ${JSON.stringify({ type: 'error', message, code })}\n\n`);
  res.end();
}
