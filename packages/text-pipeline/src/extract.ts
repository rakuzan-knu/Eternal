/**
 * O(N) single-pass @mention / #hashtag extractors. No regex, no backtracking —
 * ReDoS-impossible by construction (this is why the backend time-budget wrapper
 * becomes unnecessary for these paths).
 *
 * Semantics EXACTLY mirror backend safe-regex.util.ts (extractMentions /
 * extractHashtags) so the backend can swap implementations with zero behavior
 * change — proven by the parity spec on a fixed corpus:
 *  - mentions: '@' at start or after [\s!?,;:({[<], then 1..32 of [0-9A-Za-z._],
 *    returned WITHOUT '@'.
 *  - hashtags: '#' anywhere, then 1..100 of [0-9A-Za-z_ U+0400–U+04FF],
 *    returned WITH '#'.
 *  - inputs are truncated to maxLength (default 10_000) BEFORE scanning.
 */

import {
  DEFAULT_MAX_HASHTAG_LEN,
  DEFAULT_MAX_LENGTH,
  DEFAULT_MAX_USERNAME_LEN,
  type Span,
} from './types';

export function isHashtagCharCode(code: number): boolean {
  if (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 95
  ) {
    return true;
  }
  return code >= 0x0400 && code <= 0x04ff;
}

export function isUsernameCharCode(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 46 ||
    code === 95
  );
}

function isMentionBoundary(code: number): boolean {
  return (
    code === 32 || // space
    code === 9 || // tab
    code === 10 || // LF
    code === 13 || // CR
    code === 33 || // !
    code === 63 || // ?
    code === 44 || // ,
    code === 59 || // ;
    code === 58 || // :
    code === 40 || // (
    code === 123 || // {
    code === 91 || // [
    code === 60 // <
  );
}

export interface ExtractOptions {
  readonly maxLength?: number;
  readonly maxUsernameLen?: number;
  readonly maxHashtagLen?: number;
}

function capInput(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

/** Legacy-compatible: mention values without '@'. Lean loop — no Span objects. */
export function extractMentions(
  text: string | null | undefined,
  options?: ExtractOptions,
): string[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  const maxLength = options?.maxLength ?? DEFAULT_MAX_LENGTH;
  const maxName = options?.maxUsernameLen ?? DEFAULT_MAX_USERNAME_LEN;
  const input = capInput(text, maxLength);
  const out: string[] = [];
  const len = input.length;
  let i = 0;
  while (i < len) {
    if (input.charCodeAt(i) === 64 && (i === 0 || isMentionBoundary(input.charCodeAt(i - 1)))) {
      const start = i + 1;
      let end = start;
      while (end < len && isUsernameCharCode(input.charCodeAt(end))) {
        if (end - start >= maxName) break;
        end++;
      }
      if (end > start) {
        out.push(input.slice(start, end));
        i = end;
        continue;
      }
    }
    i++;
  }
  return out;
}

export function extractMentionSpans(
  text: string | null | undefined,
  options?: ExtractOptions,
): Span[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  const maxLength = options?.maxLength ?? DEFAULT_MAX_LENGTH;
  const maxName = options?.maxUsernameLen ?? DEFAULT_MAX_USERNAME_LEN;
  const input = capInput(text, maxLength);
  const spans: Span[] = [];
  const len = input.length;
  let i = 0;
  while (i < len) {
    if (input.charCodeAt(i) === 64 && (i === 0 || isMentionBoundary(input.charCodeAt(i - 1)))) {
      const start = i + 1;
      let end = start;
      while (end < len && isUsernameCharCode(input.charCodeAt(end))) {
        if (end - start >= maxName) break;
        end++;
      }
      if (end > start) {
        spans.push({ value: input.slice(start, end), start, end });
        i = end;
        continue;
      }
    }
    i++;
  }
  return spans;
}

/** Legacy-compatible: hashtag values WITH '#' prefix. Lean loop — no Span objects. */
export function extractHashtags(
  text: string | null | undefined,
  options?: ExtractOptions,
): string[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  const maxLength = options?.maxLength ?? DEFAULT_MAX_LENGTH;
  const maxTag = options?.maxHashtagLen ?? DEFAULT_MAX_HASHTAG_LEN;
  const input = capInput(text, maxLength);
  const out: string[] = [];
  const len = input.length;
  let i = 0;
  while (i < len) {
    if (input.charCodeAt(i) === 35) {
      const start = i + 1;
      let end = start;
      while (end < len && isHashtagCharCode(input.charCodeAt(end))) {
        if (end - start >= maxTag) break;
        end++;
      }
      if (end > start) {
        out.push(input.slice(i, end));
        i = end;
        continue;
      }
    }
    i++;
  }
  return out;
}

export function extractHashtagSpans(
  text: string | null | undefined,
  options?: ExtractOptions,
): Span[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  const maxLength = options?.maxLength ?? DEFAULT_MAX_LENGTH;
  const maxTag = options?.maxHashtagLen ?? DEFAULT_MAX_HASHTAG_LEN;
  const input = capInput(text, maxLength);
  const spans: Span[] = [];
  const len = input.length;
  let i = 0;
  while (i < len) {
    if (input.charCodeAt(i) === 35) {
      const start = i + 1;
      let end = start;
      while (end < len && isHashtagCharCode(input.charCodeAt(end))) {
        if (end - start >= maxTag) break;
        end++;
      }
      if (end > start) {
        spans.push({ value: input.slice(i, end), start: i, end });
        i = end;
        continue;
      }
    }
    i++;
  }
  return spans;
}
