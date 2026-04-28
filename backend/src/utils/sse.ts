import { Response } from 'express';
import type { GenerationMetadata } from '../services/ContentGenerator';
import type { ProcessedOutput } from '../processors/OutputProcessor';

// SSE wire format: each event is "data: <json>\n\n"
// Two newlines are required — one closes the data field, one ends the event.

export function initSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx proxy buffering
  res.flushHeaders();
}

export function sendChunk(res: Response, text: string): void {
  res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
}

export function sendDone(
  res: Response,
  metadata: GenerationMetadata,
  processed: ProcessedOutput,
): void {
  res.write(`data: ${JSON.stringify({ type: 'done', metadata, processed })}\n\n`);
  res.end();
}

export function sendError(res: Response, message: string, code?: string): void {
  res.write(`data: ${JSON.stringify({ type: 'error', message, code })}\n\n`);
  res.end();
}
