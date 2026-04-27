// OutputProcessor.ts
// Sits between the completed AI stream and the SSE `done` event.
// Cleans, parses, validates, and prepares the raw markdown for the frontend.

import { ContentType } from '../types/content.types';

// ─── Output types ─────────────────────────────────────────────────────────────

export interface ParsedSection {
  type: 'title' | 'heading' | 'body';
  level?: number;      // heading level: 1, 2, 3
  heading?: string;    // the heading text (without #)
  content: string;     // the paragraph text under this section
}

export interface ValidationResult {
  word_count_ok: boolean;
  word_count_delta_pct: number | null;  // null if no target was set
  missing_sections: string[];
  artifacts_removed: number;
}

export interface ProcessedOutput {
  // Cleaned markdown — AI artifacts stripped, spacing normalised
  cleaned_text: string;

  // Parsed document structure
  title: string | null;
  sections: ParsedSection[];

  // Metadata
  word_count: number;
  estimated_read_time: string;   // e.g. "4 min read"

  // Validation report
  validation: ValidationResult;

  // Export formats ready to hand to the frontend
  exports: {
    markdown: string;            // same as cleaned_text
    plain_text: string;          // markdown stripped, structure preserved
  };
}

// ─── AI artifact patterns ─────────────────────────────────────────────────────
// These are phrases Claude (and other LLMs) sometimes emit that break immersion.
// We remove complete sentences/lines that match, rather than just the phrase,
// to avoid leaving dangling text.

const ARTIFACT_PATTERNS: RegExp[] = [
  // Opening disclaimers
  /^(Certainly!|Of course!|Sure!|Absolutely!|Great!|I'd be happy to[^.]*\.)\s*/gim,
  // Identity statements
  /^(As an AI( language model)?[^.]*\.)\s*/gim,
  /^(I('m| am) an AI[^.]*\.)\s*/gim,
  // Closing filler
  /^(I hope (this|that) (helps?|article|email|story|post)[^.]*\.)\s*/gim,
  /^(Feel free to (ask|let me know)[^.]*\.)\s*/gim,
  /^(Let me know if you('d like| want| need)[^.]*\.)\s*/gim,
  /^(Please note that[^.]*\.)\s*/gim,
  // Word count announcements
  /^\[?(This|The) (article|post|email|story|content) (is |contains |runs )?\(?(approximately |about )?\d+[\s-]*(words?)\)?\.?\]?\s*/gim,
];

// ─── Required sections per content type ──────────────────────────────────────
// Used for validation: we check the parsed headings against these expectations.

const REQUIRED_SECTIONS: Partial<Record<ContentType, string[]>> = {
  blog_post:    ['introduction', 'conclusion'],
  email:        ['subject'],
  story:        [],      // stories are freeform — no required headings
  social_media: [],      // social posts are usually one block
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text
    .replace(/```[\s\S]*?```/g, '')  // strip code blocks
    .replace(/[#*_`~\[\]()>]/g, '')  // strip markdown syntax characters
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function estimateReadTime(wordCount: number): string {
  // Average adult reads ~200–250 words per minute
  const minutes = Math.ceil(wordCount / 225);
  return minutes <= 1 ? '1 min read' : `${minutes} min read`;
}

// Strip markdown formatting to produce plain readable text
function toPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')        // headings → plain line
    .replace(/\*\*(.*?)\*\*/g, '$1')     // bold
    .replace(/\*(.*?)\*/g, '$1')         // italic
    .replace(/`([^`]+)`/g, '$1')         // inline code
    .replace(/```[\s\S]*?```/g, '')      // code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → link text
    .replace(/^[-*+]\s+/gm, '• ')       // unordered list items
    .replace(/^\d+\.\s+/gm, '')         // ordered list numbers
    .replace(/^>\s+/gm, '')             // blockquotes
    .replace(/\n{3,}/g, '\n\n')         // collapse excessive blank lines
    .trim();
}

// Parse the markdown into a flat list of sections (heading + content pairs)
function parseSections(markdown: string): { title: string | null; sections: ParsedSection[] } {
  const lines  = markdown.split('\n');
  const result: ParsedSection[] = [];
  let title: string | null = null;
  let currentHeading: Omit<ParsedSection, 'content'> | null = null;
  let buffer: string[] = [];

  function flush() {
    if (currentHeading) {
      result.push({ ...currentHeading, content: buffer.join('\n').trim() });
    } else if (buffer.length > 0 && !title) {
      // Text before any heading — treat as intro body
      result.push({ type: 'body', content: buffer.join('\n').trim() });
    }
    buffer = [];
  }

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);

    if (h1) {
      flush();
      title = h1[1].trim();
      currentHeading = { type: 'title', level: 1, heading: title };
    } else if (h2) {
      flush();
      currentHeading = { type: 'heading', level: 2, heading: h2[1].trim() };
    } else if (h3) {
      flush();
      currentHeading = { type: 'heading', level: 3, heading: h3[1].trim() };
    } else {
      buffer.push(line);
    }
  }

  flush(); // don't forget the last section

  return { title, sections: result };
}

// ─── Main class ───────────────────────────────────────────────────────────────

export class OutputProcessor {

  process(
    rawText: string,
    contentType: ContentType,
    wordTarget: number | null = null,
  ): ProcessedOutput {

    // ── Step 1: Sanitize ──────────────────────────────────────────────────────
    let cleaned = rawText;
    let artifactsRemoved = 0;

    for (const pattern of ARTIFACT_PATTERNS) {
      const before = cleaned;
      cleaned = cleaned.replace(pattern, '');
      if (cleaned !== before) artifactsRemoved++;
    }

    // Normalize whitespace: collapse 3+ blank lines into 2, trim ends
    cleaned = cleaned
      .replace(/\r\n/g, '\n')       // normalize line endings
      .replace(/\n{3,}/g, '\n\n')   // max 2 consecutive blank lines
      .replace(/[ \t]+$/gm, '')      // strip trailing spaces on each line
      .trim();

    // ── Step 2: Parse ─────────────────────────────────────────────────────────
    const { title, sections } = parseSections(cleaned);
    const wordCount            = countWords(cleaned);
    const readTime             = estimateReadTime(wordCount);

    // ── Step 3: Validate ──────────────────────────────────────────────────────
    // Word count: acceptable if within ±10% of target
    let wordCountOk   = true;
    let deltaPercent: number | null = null;

    if (wordTarget !== null && wordTarget > 0) {
      deltaPercent = Math.round(((wordCount - wordTarget) / wordTarget) * 100);
      wordCountOk  = Math.abs(deltaPercent) <= 10;
    }

    // Check required headings (case-insensitive substring match)
    const required      = REQUIRED_SECTIONS[contentType] ?? [];
    const headingTexts  = sections
      .filter(s => s.heading)
      .map(s => s.heading!.toLowerCase());

    const missingSections = required.filter(
      req => !headingTexts.some(h => h.includes(req)),
    );

    // ── Step 4: Export prep ───────────────────────────────────────────────────
    const plainText = toPlainText(cleaned);

    return {
      cleaned_text: cleaned,
      title,
      sections,
      word_count:           wordCount,
      estimated_read_time:  readTime,
      validation: {
        word_count_ok:      wordCountOk,
        word_count_delta_pct: deltaPercent,
        missing_sections:   missingSections,
        artifacts_removed:  artifactsRemoved,
      },
      exports: {
        markdown:   cleaned,
        plain_text: plainText,
      },
    };
  }
}
