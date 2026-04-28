import { useState, useCallback, useRef } from 'react';
import type { FormValues, GenerationState, GenerationMetadata, ProcessedOutput } from '../types';

const INITIAL_STATE: GenerationState = {
  status: 'idle',
  text: '',
  processed: null,
  metadata: null,
  error: null,
  fieldErrors: {},
};

export function useGenerate() {
  const [state, setState] = useState<GenerationState>(INITIAL_STATE);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const stop = useCallback(async () => {
    if (readerRef.current) {
      await readerRef.current.cancel();
      readerRef.current = null;
    }
    setState(s => s.status === 'generating' ? { ...s, status: 'done' } : s);
  }, []);

  const generate = useCallback(async (formValues: FormValues) => {
    if (readerRef.current) {
      await readerRef.current.cancel();
      readerRef.current = null;
    }

    setState({ status: 'generating', text: '', processed: null, metadata: null, error: null, fieldErrors: {} });

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });

      if (!response.ok) {
        const err = await response.json();
        const errors: { field: string; message: string }[] = err.errors ?? [];
        const fieldErrors = Object.fromEntries(errors.map(e => [e.field, e.message]));
        const message = errors[0]?.message ?? 'Generation failed';
        setState(s => ({ ...s, status: 'error', error: message, fieldErrors }));
        return;
      }

      const reader = response.body!.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'chunk') {
              setState(s => ({ ...s, text: s.text + event.text }));
            } else if (event.type === 'done') {
              const processed = event.processed as ProcessedOutput;
              setState(s => ({
                ...s,
                status: 'done',
                text: processed?.cleaned_text ?? s.text,
                processed,
                metadata: event.metadata as GenerationMetadata,
              }));
            } else if (event.type === 'error') {
              setState(s => ({ ...s, status: 'error', error: event.message }));
            }
          } catch {
            // malformed JSON — skip
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

  const restore = useCallback((processed: ProcessedOutput, metadata: GenerationMetadata) => {
    setState({
      status: 'done',
      text: processed.cleaned_text,
      processed,
      metadata,
      error: null,
      fieldErrors: {},
    });
  }, []);

  const reset = useCallback(() => {
    readerRef.current?.cancel();
    readerRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  return { ...state, generate, stop, restore, reset };
}
