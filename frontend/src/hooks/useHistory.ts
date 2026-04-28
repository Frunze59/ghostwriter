import { useState, useCallback } from 'react';
import type { ContentType, ProcessedOutput, GenerationMetadata } from '../types';

const STORAGE_KEY = 'ghostwriter_history';
const MAX_ITEMS   = 5;

export interface HistoryItem {
  id: string;
  timestamp: number;
  content_type: ContentType;
  title: string | null;
  preview: string;
  processed: ProcessedOutput;
  metadata: GenerationMetadata;
}

function loadFromStorage(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: HistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota exceeded — ignore
  }
}

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>(loadFromStorage);

  const addItem = useCallback((
    content_type: ContentType,
    processed: ProcessedOutput,
    metadata: GenerationMetadata,
  ) => {
    const item: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      content_type,
      title: processed.title,
      preview: processed.cleaned_text.slice(0, 120).replace(/\n/g, ' '),
      processed,
      metadata,
    };
    setItems(prev => {
      const next = [item, ...prev].slice(0, MAX_ITEMS);
      saveToStorage(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { items, addItem, clearHistory };
}
