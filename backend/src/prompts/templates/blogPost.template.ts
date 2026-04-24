import { NormalizedBlogPostInput } from '../../types/content.types';
import { TONE_INSTRUCTIONS, EXPERTISE_INSTRUCTIONS } from '../toneInstructions';

export function buildBlogPostPrompt(input: NormalizedBlogPostInput): {
  system: string;
  user: string;
} {
  const { context, specifications } = input;
  const toneDir     = TONE_INSTRUCTIONS[context.tone];
  const expertiseDir = EXPERTISE_INSTRUCTIONS[specifications.expertise];
  const seoDir      = specifications.seo_enabled
    ? 'Include natural keyword variations of the topic in at least two section headers ' +
      'and in the introduction. Do not keyword-stuff — keep it readable.'
    : 'SEO optimization is not required for this piece.';

  // ── System message ─────────────────────────────────────────────────────────
  // Sets Claude's persona for the entire conversation.
  // Keep it focused: one role, one domain, clear ground rules.
  const system = `You are an expert content writer specializing in blog posts. \
You write clear, well-structured articles tailored to specific audiences. \
You always follow the requested format exactly. \
You never add preamble like "Sure!" or "Here's your blog post:" — \
you output ONLY the requested content.`;

  // ── User message ───────────────────────────────────────────────────────────
  // The actual request. Order matters: context first, then requirements,
  // then format spec. Claude performs best when it understands the "what"
  // before the "how".
  const user = `Write a blog post with the following specifications:

TOPIC: ${context.topic}
AUDIENCE: ${context.audience}
TARGET LENGTH: approximately ${specifications.word_target} words
EXPERTISE LEVEL: ${specifications.expertise}

TONE INSTRUCTIONS:
${toneDir}

EXPERTISE INSTRUCTIONS:
${expertiseDir}

SEO INSTRUCTIONS:
${seoDir}

OUTPUT FORMAT — return the post using this exact markdown structure:
# [Title]

## Introduction
[2–3 paragraphs that hook the reader and state the post's purpose]

## [Section 1 heading]
[body]

## [Section 2 heading]
[body]

## [Section 3 heading]
[body — add a 4th section only if the topic genuinely requires it]

## Conclusion
[1–2 paragraphs that summarize key takeaways and leave the reader with something to act on]

Rules:
- Use the exact markdown headers shown above (##, not bold text)
- Do not include a word count or any meta-commentary
- Do not add "---" separators between sections
- The title should be compelling and specific, not generic`;

  return { system, user };
}
