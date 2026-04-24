import { NormalizedStoryInput } from '../../types/content.types';

export function buildStoryPrompt(input: NormalizedStoryInput): {
  system: string;
  user: string;
} {
  const { context, specifications } = input;

  // Story prompts deliberately have less rigid format constraints than
  // blog posts or emails. Narrative needs room to breathe — over-constraining
  // structure kills voice. We guide the shape, not the sentence.
  const system = `You are a skilled fiction writer with a strong sense of narrative structure. \
You write stories with genuine tension, distinct character voices, and satisfying arcs. \
You adapt your style to match the requested genre and mood precisely. \
You output ONLY the story — no meta-commentary, no "here is your story".`;

  const lengthGuidance = {
    short:  'This is a short story (~600 words). Move quickly — establish, escalate, resolve.',
    medium: 'This is a medium-length story (~1200 words). You have room for one subplot or a richer setting.',
    long:   'This is a longer story (~2200 words). Develop characters and setting fully before the climax.',
  }[specifications.length];

  const user = `Write an original ${context.genre} short story with the following specifications:

CHARACTERS: ${context.characters}
SETTING: ${context.setting}
MOOD: ${context.mood}
STYLE: ${context.style}
TARGET AUDIENCE: ${context.audience}

LENGTH GUIDANCE:
${lengthGuidance}

NARRATIVE REQUIREMENTS:
- Open in medias res (in the middle of action) or with a striking image — never "It was a dark and stormy night"
- Establish the central conflict within the first 20% of the story
- Build tension progressively — no flat middle sections
- Dialogue should reveal character, not just exchange information
- The ending must feel earned, not rushed or arbitrary

OUTPUT FORMAT:
# [Story Title]

[story body — use blank lines between paragraphs, not markdown headers]

[Scene breaks, if needed, should use a single centered em dash: —]

Rules:
- Title on the first line as a # heading
- Pure prose after that — no section headers inside the story
- Dialogue in standard quote marks: "like this"
- Do not summarize what happens — show it through scene and action`;

  return { system, user };
}
