// toneInstructions.ts
// Maps a tone enum value → concrete writing directive.
//
// Why not just pass "engaging" directly to Claude?
// Because "engaging" is vague. Claude will interpret it differently each time.
// Specific behavioral instructions ("use rhetorical questions") produce
// consistent, predictable output across generations.

import { Tone } from '../types/content.types';

export const TONE_INSTRUCTIONS: Record<Tone, string> = {
  professional:
    'Write in a clear, authoritative, and business-appropriate style. ' +
    'Use precise language. Avoid slang, contractions, and casual expressions.',

  casual:
    'Write conversationally, as if explaining to a friend. ' +
    'Use contractions, everyday language, and a relaxed sentence rhythm. ' +
    'Avoid jargon.',

  engaging:
    'Write with energy and momentum. Use rhetorical questions to draw readers in, ' +
    'vivid concrete examples over abstract statements, and varied sentence lengths ' +
    'to control pace. Make every paragraph earn its place.',

  humorous:
    'Use light wit and tasteful humor. Wordplay and unexpected analogies are welcome. ' +
    'Keep it appropriate for a general audience — no edgy or divisive humor.',

  formal:
    'Use precise, structured language. No contractions, no colloquialisms. ' +
    'Sentences should be complete and grammatically conservative. ' +
    'Maintain an authoritative, measured tone throughout.',

  inspirational:
    'Write with warmth and forward momentum. Use uplifting language, ' +
    'powerful imagery, and second-person ("you") to speak directly to the reader. ' +
    'End sections on a motivating note.',
};

// Expertise level → reading level directive
// Used by blog posts to calibrate vocabulary and concept depth
export const EXPERTISE_INSTRUCTIONS: Record<string, string> = {
  beginner:
    'Assume the reader has no prior knowledge. Define every technical term. ' +
    'Use simple analogies and short sentences. Avoid jargon entirely.',

  intermediate:
    'Assume the reader is familiar with the basics. You can use standard ' +
    'terminology without defining it, but explain nuanced or advanced concepts.',

  advanced:
    'Assume an expert reader. Use technical language freely, skip foundational ' +
    'explanations, and focus on depth, nuance, and precision.',
};

// Urgency level → behavioral cue for emails
export const URGENCY_INSTRUCTIONS: Record<string, string> = {
  low:    'Keep the tone relaxed and informative. No pressure language.',
  medium: 'Convey mild time-sensitivity without being pushy.',
  high:   'Open with the most important point. Use direct, action-oriented language. ' +
          'Every sentence should push toward the CTA.',
};
