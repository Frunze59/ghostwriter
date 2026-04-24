import { NormalizedSocialMediaInput, SocialPlatform } from '../../types/content.types';
import { TONE_INSTRUCTIONS } from '../toneInstructions';

// Platform-specific writing conventions — what works on LinkedIn kills on Twitter
const PLATFORM_GUIDANCE: Record<SocialPlatform, string> = {
  twitter:
    'Twitter/X: Maximum 280 characters for the post body. ' +
    'Hook in the first line — it\'s the only thing shown before "show more". ' +
    'Be punchy and opinionated. Threads are NOT requested — single post only.',

  linkedin:
    'LinkedIn: Professional context. Start with a bold opening line (not "I am excited to..."). ' +
    'Use short paragraphs (1–2 sentences max) — LinkedIn compresses long blocks. ' +
    'A personal story or lesson performs better than a sales pitch. ' +
    'Keep under 1300 characters to avoid the "see more" truncation.',

  instagram:
    'Instagram: The caption supports the visual, so write as if a striking image ' +
    'accompanies the post. Lead with emotion or a question. ' +
    'You have 2200 characters but the sweet spot is 138–150 for engagement. ' +
    'Write a compelling short version first, then optionally expand.',
};

export function buildSocialMediaPrompt(input: NormalizedSocialMediaInput): {
  system: string;
  user: string;
} {
  const { context, specifications } = input;
  const toneDir      = TONE_INSTRUCTIONS[context.tone];
  const platformDir  = PLATFORM_GUIDANCE[context.platform];
  const platformLabel = {
    twitter: 'Twitter/X',
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
  }[context.platform];

  const system = `You are a social media content specialist who writes high-performing posts \
for ${platformLabel}. You understand platform-specific conventions, character limits, and \
what drives engagement on each network. \
You output ONLY the post content and hashtags — no commentary.`;

  const user = `Write a ${platformLabel} post with the following specifications:

PRODUCT/SERVICE: ${context.product_service}
GOAL: ${context.goal}
CALL TO ACTION: ${context.cta}

TONE INSTRUCTIONS:
${toneDir}

PLATFORM GUIDANCE:
${platformDir}

OUTPUT FORMAT — return exactly this structure:

POST:
[the post body — respect the character limit for ${platformLabel}]

CTA:
[the call to action line, naturally integrated or as a standalone closing line]

HASHTAGS:
[exactly ${specifications.hashtag_count} relevant hashtags, space-separated, starting with #]

Rules:
- The three sections (POST, CTA, HASHTAGS) must appear with those exact labels
- Hashtags go ONLY in the HASHTAGS section, never inside the POST body
- Do not add emoji unless they genuinely serve the message
- The CTA must reference this action: "${context.cta}"`;

  return { system, user };
}
