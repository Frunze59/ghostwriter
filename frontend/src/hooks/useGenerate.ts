import { useState, useCallback, useRef } from 'react';
import type { FormValues, GenerationState, GenerationMetadata } from '../types';

const INITIAL_STATE: GenerationState = {
  status: 'idle',
  text: '',
  metadata: null,
  error: null,
};

export function useGenerate() {
  const [state, setState] = useState<GenerationState>(INITIAL_STATE);

  // We keep a ref to the reader so we can cancel mid-stream if the user
  // clicks "Stop" or navigates away
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const generate = useCallback(async (formValues: FormValues) => {
    // Cancel any in-progress stream before starting a new one
    if (readerRef.current) {
      await readerRef.current.cancel();
      readerRef.current = null;
    }

    setState({ status: 'generating', text: '', metadata: null, error: null });

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });

      // If validation failed before SSE opened, we get a regular JSON error
      if (!response.ok) {
        const err = await response.json();
        const message = err.errors?.[0]?.message ?? 'Generation failed';
        setState(s => ({ ...s, status: 'error', error: message }));
        return;
      }

      // Read the SSE stream
      const reader = response.body!.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the incoming bytes and append to the buffer
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines: "data: {...}\n\n"
        // We split on \n\n to extract complete events, keeping any partial
        // event at the end of the buffer for the next iteration
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(line.slice(6));  // strip "data: "

            if (event.type === 'chunk') {
              // Append the new text delta to what we have so far
              setState(s => ({ ...s, text: s.text + event.text }));
            } else if (event.type === 'done') {
              setState(s => ({
                ...s,
                status: 'done',
                metadata: event.metadata as GenerationMetadata,
              }));
            } else if (event.type === 'error') {
              setState(s => ({ ...s, status: 'error', error: event.message }));
            }
          } catch {
            // Malformed JSON in SSE event — skip silently
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setState(s => ({ ...s, status: 'error', error: message }));
    } finally {
      readerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    readerRef.current?.cancel();
    readerRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  return { ...state, generate, reset };
}
