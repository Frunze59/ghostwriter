// PromptBuilder.ts
// Single entry point for all prompt construction.
//
// Accepts a NormalizedInput, dispatches to the right template,
// returns a { system, user } pair ready to send to the Claude API.
//
// Why keep this as a separate class from the templates?
// The templates are pure functions (data in → string out).
// This class owns the dispatch logic and could later add
// shared pre/post processing (e.g. injecting a global content policy
// into every system prompt) without touching individual templates.

import { NormalizedInput } from '../types/content.types';
import { buildBlogPostPrompt }    from './templates/blogPost.template';
import { buildEmailPrompt }       from './templates/email.template';
import { buildStoryPrompt }       from './templates/story.template';
import { buildSocialMediaPrompt } from './templates/socialMedia.template';

export interface BuiltPrompt {
  system: string;
  user: string;
  // We echo the content_type so the caller can log/debug without
  // having to re-inspect the original input
  content_type: string;
}

export class PromptBuilder {

  build(normalized: NormalizedInput): BuiltPrompt {
    let prompt: { system: string; user: string };

    switch (normalized.content_type) {
      case 'blog_post':
        prompt = buildBlogPostPrompt(normalized);
        break;
      case 'email':
        prompt = buildEmailPrompt(normalized);
        break;
      case 'story':
        prompt = buildStoryPrompt(normalized);
        break;
      case 'social_media':
        prompt = buildSocialMediaPrompt(normalized);
        break;
      default:
        // TypeScript's exhaustiveness check: if a new content_type is added
        // to the union but not handled here, the compiler will error at build time
        throw new Error(`Unhandled content type: ${(normalized as NormalizedInput).content_type}`);
    }

    return {
      ...prompt,
      content_type: normalized.content_type,
    };
  }
}
