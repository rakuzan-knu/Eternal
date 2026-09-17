/**
 * O(N) linkifier: finds bare http(s):// and www. URLs with manual boundary
 * scanning (no regex — no ReDoS surface, Hermes-safe).
 *
 * Rules:
 *  - scheme must be http:// or https:// (case-insensitive); 'www.' is expanded
 *    to 'https://www.'.
 *  - preceding char must be start-of-input or whitespace / opening bracket.
 *  - trailing '.,;:!?' quotes/brackets are trimmed; a trailing ')' is trimmed
 *    when parens are unbalanced.
 *  - javascript:/data:/vbscript: and control chars are never linkified.
 *  - offsets are UTF-16 code units over the scanned (possibly truncated) input.
 */

import type { LinkSpan } from './types';

const TRAILING_TRIM = new Set([46, 44, 59, 58, 33, 63, 34, 39, 93, 125]);
// 46 .  44 ,  59 ;  58 :  33 !  63 ?  34 "  39 '  93 ]  125 }

function isWhitespaceOrOpen(code: number): boolean {
  return (
    code === 32 ||
    code === 9 ||
    code === 10 ||
    code === 13 ||
    code === 40 ||
    code === 91 ||
    code === 123 ||
    code === 60
  );
}

function isUrlBodyChar(code: number): boolean {
  if (code <= 32 || code === 127) return false;
  // Stop at whitespace, '<', '>', quotes; ')' handled by balance logic.
  return code !== 60 && code !== 62 && code !== 34 && code !== 39;
}

function startsSchemeAt(input: string, i: number): number {
  // Returns body offset after 'http://' or 'https://' (case-insensitive), else -1.
  // 'http://'  = h t t p : / /  (colon at +4, slashes at +5/+6)
  // 'https://' = h t t p s : / / (colon at +5, slashes at +6/+7)
  const rest = input.length - i;
  if (
    rest >= 7 &&
    input.charCodeAt(i + 4) === 58 &&
    input.charCodeAt(i + 5) === 47 &&
    input.charCodeAt(i + 6) === 47
  ) {
    if (asciiLower4(input, i) === 'http') return i + 7;
  }
  if (
    rest >= 8 &&
    input.charCodeAt(i + 5) === 58 &&
    input.charCodeAt(i + 6) === 47 &&
    input.charCodeAt(i + 7) === 47
  ) {
    if (asciiLower5(input, i) === 'https') return i + 8;
  }
  return -1;
}

function asciiLower4(input: string, i: number): string {
  let s = '';
  for (let k = 0; k < 4; k++) {
    const c = input.charCodeAt(i + k);
    s += c >= 65 && c <= 90 ? String.fromCharCode(c + 32) : input[i + k];
  }
  return s;
}

function asciiLower5(input: string, i: number): string {
  return (
    asciiLower4(input, i) +
    (input.charCodeAt(i + 4) >= 65 && input.charCodeAt(i + 4) <= 90
      ? String.fromCharCode(input.charCodeAt(i + 4) + 32)
      : input[i + 4])
  );
}

function startsWwwAt(input: string, i: number): boolean {
  return (
    input.length - i > 4 &&
    (input[i] === 'w' || input[i] === 'W') &&
    (input[i + 1] === 'w' || input[i + 1] === 'W') &&
    (input[i + 2] === 'w' || input[i + 2] === 'W') &&
    input[i + 3] === '.'
  );
}

function trimEnd(input: string, start: number, end: number): number {
  let e = end;
  while (e > start && TRAILING_TRIM.has(input.charCodeAt(e - 1))) e--;
  // Unbalanced trailing ')': trim extras beyond opens inside the URL.
  let opens = 0;
  let closes = 0;
  for (let k = start; k < e; k++) {
    const c = input.charCodeAt(k);
    if (c === 40) opens++;
    else if (c === 41) closes++;
  }
  while (e > start && input.charCodeAt(e - 1) === 41 && closes > opens) {
    e--;
    closes--;
  }
  return e;
}

function hasHost(candidate: string): boolean {
  // Minimal host sanity: something before first / ? # and a dot or localhost-ish token.
  let hostEnd = candidate.length;
  for (let k = 0; k < candidate.length; k++) {
    const c = candidate.charCodeAt(k);
    if (c === 47 || c === 63 || c === 35) {
      hostEnd = k;
      break;
    }
  }
  if (hostEnd === 0) return false;
  const host = candidate.slice(0, hostEnd);
  const colon = host.indexOf(':');
  let bare = host;
  if (colon !== -1) {
    // Allow a single numeric :port (dev links, self-hosted instances).
    if (host.indexOf(':', colon + 1) !== -1) return false;
    const port = host.slice(colon + 1);
    if (port.length === 0 || port.length > 5) return false;
    for (let k = 0; k < port.length; k++) {
      const d = port.charCodeAt(k);
      if (d < 48 || d > 57) return false;
    }
    bare = host.slice(0, colon);
  }
  return bare.indexOf('.') !== -1 || bare.toLowerCase() === 'localhost';
}

export function findLinks(text: string | null | undefined, maxLength = 10_000): LinkSpan[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  const input = text.length > maxLength ? text.slice(0, maxLength) : text;
  const links: LinkSpan[] = [];
  const len = input.length;
  let i = 0;
  while (i < len) {
    const okBoundary = i === 0 || isWhitespaceOrOpen(input.charCodeAt(i - 1));
    if (!okBoundary) {
      i++;
      continue;
    }
    let bodyStart = -1;
    let isWww = false;
    const schemeEnd = startsSchemeAt(input, i);
    if (schemeEnd > 0) {
      bodyStart = schemeEnd;
    } else if (startsWwwAt(input, i)) {
      bodyStart = i;
      isWww = true;
    }
    if (bodyStart < 0) {
      i++;
      continue;
    }
    let end = bodyStart;
    while (end < len && isUrlBodyChar(input.charCodeAt(end))) end++;
    end = trimEnd(input, bodyStart, end);
    if (end <= bodyStart) {
      i++;
      continue;
    }
    const raw = input.slice(i, end);
    const candidate = isWww ? `https://${raw}` : raw;
    const hostPart = isWww ? raw : candidate.slice(candidate.indexOf('://') + 3);
    if (!hasHost(hostPart)) {
      i++;
      continue;
    }
    links.push({ value: raw, start: i, end, url: candidate });
    i = end;
  }
  return links;
}

/** Escapes &<>"' for safe HTML text/attribute embedding. */
const ESCAPE_NEEDED = /[&<>"']/;
export function escapeHtml(text: string): string {
  // Fast path: plain text returns by reference, zero allocations.
  // (Character-class test is a DFA scan — no backtracking, no ReDoS.)
  if (!ESCAPE_NEEDED.test(text)) return text;
  let out = '';
  for (let k = 0; k < text.length; k++) {
    const c = text.charCodeAt(k);
    if (c === 38) out += '&amp;';
    else if (c === 60) out += '&lt;';
    else if (c === 62) out += '&gt;';
    else if (c === 34) out += '&quot;';
    else if (c === 39) out += '&#x27;';
    else out += text[k];
  }
  return out;
}
