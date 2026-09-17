/**
 * Single-pass pipeline: sanitize + extract + linkify + score in one scan
 * budget. One input walk per stage (extract/linkify share the truncated
 * input), zero intermediate HTML parses.
 */

import { extractHashtagSpans, extractMentionSpans } from './extract';
import { escapeHtml, findLinks } from './linkify';
import { sanitizeRich, sanitizeText } from './sanitize';
import { scoreSpamText } from './spam';
import {
  DEFAULT_MAX_LENGTH,
  type LinkSpan,
  type PipelineOptions,
  type PipelineResult,
} from './types';

export function processText(
  input: string | null | undefined,
  options?: PipelineOptions,
): PipelineResult {
  const maxLength = options?.maxLength ?? DEFAULT_MAX_LENGTH;
  const mode = options?.mode ?? 'text';
  const linkify = options?.linkify ?? mode === 'rich';
  const maxMentions = options?.maxMentions ?? 10;
  const maxHashtags = options?.maxHashtags ?? 8;
  const maxLinks = options?.maxLinks ?? 2;

  const raw = typeof input === 'string' ? input : '';
  const truncated = raw.length > maxLength;
  const src = truncated ? raw.slice(0, maxLength) : raw;

  const text = sanitizeText(src, maxLength);
  const mentionSpans = extractMentionSpans(src, { maxLength });
  const hashtagSpans = extractHashtagSpans(src, { maxLength });
  const links: readonly LinkSpan[] = linkify ? findLinks(src, maxLength) : [];
  const mentions = mentionSpans.map((s) => s.value);
  const hashtags = hashtagSpans.map((s) => s.value);

  const spam = scoreSpamText(text, {
    mentionCount: mentions.length,
    hashtagCount: hashtags.length,
    linkCount: links.length,
    maxMentions,
    maxHashtags,
    maxLinks,
  });
  const capped =
    mentions.length > maxMentions || hashtags.length > maxHashtags || links.length > maxLinks;

  let html: string;
  if (mode === 'rich') {
    html = sanitizeRich(src, maxLength);
    if (linkify) html = renderLinks(html, links);
  } else {
    // sanitizeText already returns HTML-escaped safe text — no second pass.
    html = text;
  }

  return {
    text,
    html,
    mentions,
    mentionSpans,
    hashtags,
    hashtagSpans,
    links,
    spam,
    capped,
    truncated,
  };
}

/**
 * Wraps bare-URL occurrences in ALREADY-ESCAPED html with anchors.
 * Link spans were computed on the raw input; rich sanitizing preserves text
 * order, so we re-locate each raw URL occurrence sequentially in the output.
 */
function renderLinks(escapedHtml: string, links: readonly LinkSpan[]): string {
  if (links.length === 0) return escapedHtml;
  let out = '';
  let cursor = 0;
  for (const link of links) {
    const needle = escapeHtml(link.value);
    const at = escapedHtml.indexOf(needle, cursor);
    if (at === -1) continue;
    out += escapedHtml.slice(cursor, at);
    out += `<a href="${escapeHtml(link.url)}" rel="noopener noreferrer nofollow">${needle}</a>`;
    cursor = at + needle.length;
  }
  out += escapedHtml.slice(cursor);
  return out;
}
