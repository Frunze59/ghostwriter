import { ContentType } from '../types/content.types';

export interface ParsedSection {
  type: 'title' | 'heading' | 'body';
  level?: number;
  heading?: string;
  content: string;
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
  sections: ParsedSection[];
  word_count: number;
  estimated_read_time: string;
  validation: ValidationResult;
  exports: {
    markdown: string;
    plain_text: string;
  };
}

// Phrases the model sometimes emits that break immersion.
// Matched line-by-line so we don't leave dangling punctuation.
const ARTIFACT_PATTERNS: RegExp[] = [
  /^(Certainly!|Of course!|Sure!|Absolutely!|Great!|I'd be happy to[^.]*\.)\s*/gim,
  /^(As an AI( language model)?[^.]*\.)\s*/gim,
  /^(I('m| am) an AI[^.]*\.)\s*/gim,
  /^(I hope (this|that) (helps?|article|email|story|post)[^.]*\.)\s*/gim,
  /^(Feel free to (ask|let me know)[^.]*\.)\s*/gim,
  /^(Let me know if you('d like| want| need)[^.]*\.)\s*/gim,
  /^(Please note that[^.]*\.)\s*/gim,
  /^\[?(This|The) (article|post|email|story|content) (is |contains |runs )?\(?(approximately |about )?\d+[\s-]*(words?)\)?\.?\]?\s*/gim,
];

const REQUIRED_SECTIONS: Partial<Record<ContentType, string[]>> = {
  blog_post: ['introduction', 'conclusion'],
  email:     ['subject'],
};

function countWords(text: string): number {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*_`~\[\]()>]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function estimateReadTime(wordCount: number): string {
  const minutes = Math.ceil(wordCount / 225);
  return minutes <= 1 ? '1 min read' : `${minutes} min read`;
}

function toPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseSections(markdown: string): { title: string | null; sections: ParsedSection[] } {
  const lines  = markdown.split('\n');
  const result: ParsedSection[] = [];
  let title:          string | null = null;
  let currentHeading: Omit<ParsedSection, 'content'> | null = null;
  let buffer:         string[] = [];

  function flush() {
    if (currentHeading) {
      result.push({ ...currentHeading, content: buffer.join('\n').trim() });
    } else if (buffer.length > 0 && !title) {
      result.push({ type: 'body', content: buffer.join('\n').trim() });
    }
    buffer = [];
  }

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);

    if (h1)      { flush(); title = h1[1].trim(); currentHeading = { type: 'title',   level: 1, heading: title }; }
    else if (h2) { flush(); currentHeading = { type: 'heading', level: 2, heading: h2[1].trim() }; }
    else if (h3) { flush(); currentHeading = { type: 'heading', level: 3, heading: h3[1].trim() }; }
    else         { buffer.push(line); }
  }
  flush();

  return { title, sections: result };
}

export class OutputProcessor {
  process(rawText: string, contentType: ContentType, wordTarget: number | null = null): ProcessedOutput {
    let cleaned = rawText;
    let artifactsRemoved = 0;

    for (const pattern of ARTIFACT_PATTERNS) {
      const before = cleaned;
      cleaned = cleaned.replace(pattern, '');
      if (cleaned !== before) artifactsRemoved++;
    }

    cleaned = cleaned
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+$/gm, '')
      .trim();

    const { title, sections } = parseSections(cleaned);
    const wordCount = countWords(cleaned);

    let wordCountOk   = true;
    let deltaPercent: number | null = null;
    if (wordTarget !== null && wordTarget > 0) {
      deltaPercent = Math.round(((wordCount - wordTarget) / wordTarget) * 100);
      wordCountOk  = Math.abs(deltaPercent) <= 10;
    }

    const headingTexts  = sections.filter(s => s.heading).map(s => s.heading!.toLowerCase());
    const missingSections = (REQUIRED_SECTIONS[contentType] ?? [])
      .filter(req => !headingTexts.some(h => h.includes(req)));

    return {
      cleaned_text:         cleaned,
      title,
      sections,
      word_count:           wordCount,
      estimated_read_time:  estimateReadTime(wordCount),
      validation: {
        word_count_ok:        wordCountOk,
        word_count_delta_pct: deltaPercent,
        missing_sections:     missingSections,
        artifacts_removed:    artifactsRemoved,
      },
      exports: {
        markdown:   cleaned,
        plain_text: toPlainText(cleaned),
      },
    };
  }
}
