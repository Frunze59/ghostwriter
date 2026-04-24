import { NormalizedEmailInput } from '../../types/content.types';
import { TONE_INSTRUCTIONS, URGENCY_INSTRUCTIONS } from '../toneInstructions';

export function buildEmailPrompt(input: NormalizedEmailInput): {
  system: string;
  user: string;
} {
  const { context, specifications } = input;
  const toneDir   = TONE_INSTRUCTIONS[context.tone];
  const urgencyDir = URGENCY_INSTRUCTIONS[specifications.urgency];

  const system = `You are a professional email copywriter. \
You craft emails that are clear, purposeful, and always end with a strong call to action. \
You match the tone and urgency to the context precisely. \
You output ONLY the email content — no commentary, no "here is your email".`;

  const user = `Write a professional email with the following specifications:

PURPOSE: ${context.purpose}
RECIPIENT CONTEXT: ${context.recipient}
KEY POINTS TO COVER:
${context.key_points}

CALL TO ACTION: ${context.cta}
URGENCY LEVEL: ${specifications.urgency}

TONE INSTRUCTIONS:
${toneDir}

URGENCY INSTRUCTIONS:
${urgencyDir}

OUTPUT FORMAT — return the email using this exact structure:

Subject: [a specific, compelling subject line — not generic]

---

[email body — greeting, purpose statement, key points, CTA, sign-off]

Rules:
- Subject line must be on the first line, prefixed with "Subject: "
- Follow it with exactly "---" on its own line, then the body
- Keep the body under 200 words — respect the reader's time
- The CTA ("${context.cta}") must appear in the final paragraph
- Sign off with "Best regards," followed by a blank line for the sender's name
- No placeholder text like "[Your Name]" — leave the sign-off line genuinely blank`;

  return { system, user };
}
