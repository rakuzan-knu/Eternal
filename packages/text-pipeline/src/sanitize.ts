/**
 * Manual-scan HTML sanitizers. No DOM, no regex on the hot path, no
 * dependencies — identical output on Node, browsers, and Hermes.
 *
 *  - sanitizeText: strips ALL markup (contracts: username/displayName/bio).
 *  - sanitizeRich: tight allowlist for user content (posts/comments bodies).
 */

import { escapeHtml as escapeText } from './linkify';

const RICH_TAGS = new Set([
  'b',
  'strong',
  'i',
  'em',
  'a',
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
]);
const DROP_CONTENT_TAGS = new Set(['script', 'style']);
const MAX_URL_LEN = 2048;

function isSpaceCode(code: number): boolean {
  return code === 32 || code === 9 || code === 10 || code === 13 || code === 12;
}

function decodeEntitiesOnce(text: string): string {
  if (text.indexOf('&') === -1) return text;
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text.charCodeAt(i) !== 38) {
      out += text[i];
      i++;
      continue;
    }
    const semi = text.indexOf(';', i + 1);
    if (semi === -1 || semi - i > 10) {
      out += '&';
      i++;
      continue;
    }
    const entity = text.slice(i + 1, semi);
    let decoded: string | null = null;
    if (entity === 'amp') decoded = '&';
    else if (entity === 'lt') decoded = '<';
    else if (entity === 'gt') decoded = '>';
    else if (entity === 'quot') decoded = '"';
    else if (entity === 'AMP') decoded = '&';
    else if (entity === 'LT') decoded = '<';
    else if (entity === 'GT') decoded = '>';
    else if (entity === 'QUOT') decoded = '"';
    else if (entity === '#x27' || entity === '#X27' || entity === '#39') decoded = "'";
    else if (entity === 'nbsp') decoded = '\u00a0';
    else if (entity.charCodeAt(0) === 35) {
      const isHex = entity.charCodeAt(1) === 120 || entity.charCodeAt(1) === 88;
      const digits = isHex ? entity.slice(2) : entity.slice(1);
      // Strict digits only (unlike parseInt, no prefix parsing — safer).
      let ok = digits.length > 0 && digits.length <= 7;
      if (ok) {
        for (let k = 0; k < digits.length; k++) {
          const d = digits.charCodeAt(k);
          const valid = isHex
            ? (d >= 48 && d <= 57) || (d >= 65 && d <= 70) || (d >= 97 && d <= 102)
            : d >= 48 && d <= 57;
          if (!valid) {
            ok = false;
            break;
          }
        }
      }
      if (ok) {
        const code = isHex ? parseInt(digits, 16) : parseInt(digits, 10);
        if (code > 0 && code <= 0x10ffff) {
          decoded = String.fromCodePoint(code);
        }
      }
    }
    if (decoded === null) {
      out += text.slice(i, semi + 1);
    } else {
      out += decoded;
    }
    i = semi + 1;
  }
  return out;
}

/** Lowercases ASCII A-Z in place over a char array slice. */
function asciiLower(s: string): string {
  let out = '';
  for (let k = 0; k < s.length; k++) {
    const c = s.charCodeAt(k);
    out += c >= 65 && c <= 90 ? String.fromCharCode(c + 32) : s[k];
  }
  return out;
}

interface ParsedTag {
  readonly name: string;
  readonly closing: boolean;
  readonly attrs: Readonly<Record<string, string>>;
  readonly selfClosing: boolean;
  readonly end: number; // index AFTER '>' (-1 when unterminated)
}

function parseTag(input: string, lt: number): ParsedTag | null {
  // input[lt] === '<'. Returns null for comments/doctype ('<!...').
  let i = lt + 1;
  if (i < input.length && input.charCodeAt(i) === 33) return null;
  if (i < input.length && input.charCodeAt(i) === 63) return null;
  let closing = false;
  if (i < input.length && input.charCodeAt(i) === 47) {
    closing = true;
    i++;
  }
  while (i < input.length && isSpaceCode(input.charCodeAt(i))) i++;
  const nameStart = i;
  while (i < input.length) {
    const c = input.charCodeAt(i);
    if ((c >= 97 && c <= 122) || (c >= 65 && c <= 90) || (c >= 48 && c <= 57)) i++;
    else break;
  }
  if (i === nameStart) return null;
  const name = asciiLower(input.slice(nameStart, i));
  const attrs: Record<string, string> = {};
  let selfClosing = false;
  while (i < input.length) {
    while (i < input.length && isSpaceCode(input.charCodeAt(i))) i++;
    if (i >= input.length) return { name, closing, attrs, selfClosing, end: -1 };
    const c = input.charCodeAt(i);
    if (c === 62) {
      return { name, closing, attrs, selfClosing, end: i + 1 };
    }
    if (c === 47) {
      selfClosing = true;
      i++;
      continue;
    }
    const aStart = i;
    while (i < input.length) {
      const d = input.charCodeAt(i);
      if (
        (d >= 97 && d <= 122) ||
        (d >= 65 && d <= 90) ||
        (d >= 48 && d <= 57) ||
        d === 45 ||
        d === 95 ||
        d === 58
      ) {
        i++;
      } else break;
    }
    if (i === aStart) {
      i++; // skip garbage char inside tag
      continue;
    }
    const attrName = asciiLower(input.slice(aStart, i));
    while (i < input.length && isSpaceCode(input.charCodeAt(i))) i++;
    let value = '';
    if (i < input.length && input.charCodeAt(i) === 61) {
      i++;
      while (i < input.length && isSpaceCode(input.charCodeAt(i))) i++;
      if (i < input.length && (input.charCodeAt(i) === 34 || input.charCodeAt(i) === 39)) {
        const q = input[i];
        i++;
        const vStart = i;
        const vEnd = input.indexOf(q, i);
        if (vEnd === -1) {
          value = input.slice(vStart);
          i = input.length;
        } else {
          value = input.slice(vStart, vEnd);
          i = vEnd + 1;
        }
      } else {
        const vStart = i;
        while (i < input.length) {
          const d = input.charCodeAt(i);
          if (isSpaceCode(d) || d === 62 || d === 47 || d === 34 || d === 39 || d === 60) break;
          i++;
        }
        value = input.slice(vStart, i);
      }
    }
    if (!(attrName in attrs)) attrs[attrName] = value;
  }
  return { name, closing, attrs, selfClosing, end: -1 };
}

/** http(s) URL gate for href/src. Mirrors backend isSafeHttpUrl semantics. */
export function isSafeHttpUrl(url: string): boolean {
  if (url.length === 0 || url.length > MAX_URL_LEN) return false;
  const trimmed = url.trim();
  const lower = asciiLower(trimmed.slice(0, 8));
  if (lower !== 'http://' && lower !== 'https://') return false;
  for (let k = 0; k < trimmed.length; k++) {
    if (trimmed.charCodeAt(k) <= 32 || trimmed.charCodeAt(k) === 127) return false;
  }
  return true;
}

function findTagCloseLower(input: string, lower: string, tag: string, from: number): number {
  const needle = `</${tag}`;
  let pos = lower.indexOf(needle, from);
  while (pos !== -1) {
    let k = pos + needle.length;
    while (k < lower.length && (lower.charCodeAt(k) === 32 || lower.charCodeAt(k) === 9)) k++;
    if (lower.charCodeAt(k) === 62) return k + 1;
    pos = lower.indexOf(needle, pos + 1);
  }
  return -1;
}

/**
 * Strips ALL markup and returns HTML-escaped safe text (entities decoded,
 * then re-escaped — exactly like sanitize-html's text serializer, so outputs
 * match byte-for-byte for migration parity).
 * Drops script/style content, removes comments, trims. Use for contracts
 * (username/displayName/bio).
 */
export function sanitizeText(input: string | null | undefined, maxLength = 10_000): string {
  if (typeof input !== 'string' || input.length === 0) return '';
  const src = input.length > maxLength ? input.slice(0, maxLength) : input;
  // Fast path: no markup at all — decode + re-escape, no lowercase copy.
  if (src.indexOf('<') === -1) return escapeText(decodeEntitiesOnce(src).trim());
  const lower = asciiLower(src);
  let out = '';
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt === -1) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, lt);
    // Comment?
    if (src.startsWith('<!--', lt)) {
      const end = src.indexOf('-->', lt + 4);
      i = end === -1 ? src.length : end + 3;
      continue;
    }
    const tag = parseTag(src, lt);
    if (tag === null || tag.end === -1) {
      // Not a tag (doctype, bogus markup): keep the '<' as text, move on.
      out += '<';
      i = lt + 1;
      continue;
    }
    if (!tag.closing && DROP_CONTENT_TAGS.has(tag.name)) {
      const closeEnd = findTagCloseLower(src, lower, tag.name, tag.end);
      i = closeEnd === -1 ? src.length : closeEnd;
      continue;
    }
    i = tag.end; // drop the tag itself, keep inner text
  }
  return escapeText(decodeEntitiesOnce(out).trim());
}

/**
 * Tight allowlist sanitizer for user content.
 * Allowed: b strong i em a[href] p br ul ol li blockquote code pre.
 * Links: http/https only, forced rel="noopener noreferrer nofollow".
 */
export function sanitizeRich(input: string | null | undefined, maxLength = 10_000): string {
  if (typeof input !== 'string' || input.length === 0) return '';
  const src = input.length > maxLength ? input.slice(0, maxLength) : input;
  // Fast path: plain text — straight to escaping (itself fast-pathed).
  if (src.indexOf('<') === -1) return escapeText(src);
  const lower = asciiLower(src);
  let out = '';
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt === -1) {
      out += escapeText(src.slice(i));
      break;
    }
    out += escapeText(src.slice(i, lt));
    if (src.startsWith('<!--', lt)) {
      const end = src.indexOf('-->', lt + 4);
      i = end === -1 ? src.length : end + 3;
      continue;
    }
    const tag = parseTag(src, lt);
    if (tag === null || tag.end === -1) {
      out += '&lt;';
      i = lt + 1;
      continue;
    }
    if (!tag.closing && DROP_CONTENT_TAGS.has(tag.name)) {
      const closeEnd = findTagCloseLower(src, lower, tag.name, tag.end);
      i = closeEnd === -1 ? src.length : closeEnd;
      continue;
    }
    if (!RICH_TAGS.has(tag.name)) {
      i = tag.end; // drop tag, keep children text
      continue;
    }
    if (tag.name === 'br') {
      out += '<br>';
    } else if (tag.closing) {
      out += `</${tag.name}>`;
    } else if (tag.name === 'a') {
      const href = tag.attrs['href'] ?? '';
      if (isSafeHttpUrl(href)) {
        out += `<a href="${escapeAttr(href.trim())}" rel="noopener noreferrer nofollow">`;
      } else {
        // Unsafe href: drop the anchor, keep the text.
        const closeEnd = findTagCloseLower(src, lower, 'a', tag.end);
        if (closeEnd !== -1) {
          out += escapeText(decodeEntitiesOnce(src.slice(tag.end, closeEnd - 4)));
          i = closeEnd;
          continue;
        }
      }
    } else {
      out += `<${tag.name}>`;
    }
    i = tag.end;
  }
  return out;
}

function escapeAttr(value: string): string {
  let out = '';
  for (let k = 0; k < value.length; k++) {
    const c = value.charCodeAt(k);
    if (c === 38) out += '&amp;';
    else if (c === 34) out += '&quot;';
    else if (c === 60) out += '&lt;';
    else if (c === 62) out += '&gt;';
    else out += value[k];
  }
  return out;
}
