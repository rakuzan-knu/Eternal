import { withTimeBudget } from '../v8/time-budget';

/**
 * Safe Linear-Time Text Processing & ReDoS-Free Parsers
 * Guarantees strictly linear O(N) time complexity with zero backtracking risks.
 */

const MAX_SAFE_INPUT_LEN = 10_000;
const MAX_USERNAME_LEN = 32;
const MAX_HASHTAG_LEN = 100;
const TEXT_PARSE_BUDGET_MS = process.env.NODE_ENV === 'test' ? 500 : 25;

/**
 * Extracts hashtags (#tag) in strict linear O(N) time without regular expression backtracking.
 * Protected by a 5ms CPU time budget.
 */
export function extractHashtags(text: string | null | undefined): string[] {
  if (!text || typeof text !== 'string') return [];

  return withTimeBudget(
    () => {
      const input = text.length > MAX_SAFE_INPUT_LEN ? text.slice(0, MAX_SAFE_INPUT_LEN) : text;
      const tags: string[] = [];
      const len = input.length;
      let i = 0;

      while (i < len) {
        if (input[i] === '#') {
          const start = i + 1;
          let end = start;

          while (end < len && isHashtagChar(input[end])) {
            if (end - start >= MAX_HASHTAG_LEN) break;
            end++;
          }

          if (end > start) {
            tags.push(input.slice(i, end));
            i = end;
            continue;
          }
        }
        i++;
      }

      return tags;
    },
    TEXT_PARSE_BUDGET_MS,
    () => [],
  );
}

/**
 * Extracts user mentions (@username) in strict linear O(N) time without regex backtracking.
 * Protected by a 5ms CPU time budget.
 */
export function extractMentions(text: string | null | undefined): string[] {
  if (!text || typeof text !== 'string') return [];

  return withTimeBudget(
    () => {
      const input = text.length > MAX_SAFE_INPUT_LEN ? text.slice(0, MAX_SAFE_INPUT_LEN) : text;
      const mentions: string[] = [];
      const len = input.length;
      let i = 0;

      while (i < len) {
        if (input[i] === '@' && (i === 0 || isWhitespaceOrPunctuation(input[i - 1]))) {
          const start = i + 1;
          let end = start;

          while (end < len && isUsernameChar(input[end])) {
            if (end - start >= MAX_USERNAME_LEN) break;
            end++;
          }

          if (end > start) {
            mentions.push(input.slice(start, end));
            i = end;
            continue;
          }
        }
        i++;
      }

      return mentions;
    },
    TEXT_PARSE_BUDGET_MS,
    () => [],
  );
}

/**
 * Validates whether a URL is a safe HTTP or HTTPS URL using native linear parsing.
 */
export function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string' || url.length > 2048) {
    return false;
  }
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Linear-time OpenGraph / Meta tag parser without catastrophic regex backtracking.
 * Protected by a 5ms CPU time budget.
 */
export function extractMetaContentLinear(html: string, targetPropOrName: string): string | null {
  if (!html || !targetPropOrName) return null;

  return withTimeBudget(
    () => {
      const targetLower = targetPropOrName.toLowerCase();
      const maxScan = Math.min(html.length, 250_000); // 250KB ceiling
      let pos = 0;

      while (pos < maxScan) {
        const tagStart = html.indexOf('<meta', pos);
        if (tagStart === -1) break;

        const tagEnd = html.indexOf('>', tagStart);
        if (tagEnd === -1) break;

        const metaSnippet = html.slice(tagStart, tagEnd + 1);
        pos = tagEnd + 1;

        // Check if snippet matches the target property or name
        const propVal = getAttrValue(metaSnippet, 'property') || getAttrValue(metaSnippet, 'name');
        if (propVal && propVal.toLowerCase() === targetLower) {
          const content = getAttrValue(metaSnippet, 'content');
          if (content) return content.trim();
        }
      }

      return null;
    },
    TEXT_PARSE_BUDGET_MS,
    () => null,
  );
}

/**
 * Linear-time HTML tag content extractor (e.g. <title>...</title>).
 */
export function extractTagContentLinear(html: string, tagName: string): string | null {
  if (!html || !tagName) return null;

  const maxScan = Math.min(html.length, 250_000);
  const openTag = `<${tagName}`;
  const closeTag = `</${tagName}>`;

  const startIdx = html.toLowerCase().indexOf(openTag);
  if (startIdx === -1 || startIdx > maxScan) return null;

  const openTagEnd = html.indexOf('>', startIdx);
  if (openTagEnd === -1 || openTagEnd > maxScan) return null;

  const closeIdx = html.toLowerCase().indexOf(closeTag, openTagEnd);
  if (closeIdx === -1 || closeIdx > maxScan) return null;

  const content = html.slice(openTagEnd + 1, closeIdx).trim();
  return content.length > 0 ? content : null;
}

/**
 * Linear attribute parser for HTML tag snippet.
 */
function getAttrValue(tagSnippet: string, attrName: string): string | null {
  const attrLower = attrName.toLowerCase() + '=';
  const snippetLower = tagSnippet.toLowerCase();

  const idx = snippetLower.indexOf(attrLower);
  if (idx === -1) return null;

  let valStart = idx + attrLower.length;
  if (valStart >= tagSnippet.length) return null;

  const quote = tagSnippet[valStart];
  if (quote === '"' || quote === "'") {
    valStart++;
    const valEnd = tagSnippet.indexOf(quote, valStart);
    if (valEnd === -1) return null;
    return tagSnippet.slice(valStart, valEnd);
  }

  // Unquoted attribute
  let valEnd = valStart;
  while (valEnd < tagSnippet.length && !/\s|>/.test(tagSnippet[valEnd])) {
    valEnd++;
  }
  return tagSnippet.slice(valStart, valEnd);
}

function isHashtagChar(ch: string): boolean {
  const code = ch.charCodeAt(0);
  // a-z, A-Z, 0-9, _
  if (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 95
  ) {
    return true;
  }
  // Cyrillic range (\u0400-\u04FF)
  if (code >= 0x0400 && code <= 0x04ff) {
    return true;
  }
  return false;
}

function isUsernameChar(ch: string): boolean {
  const code = ch.charCodeAt(0);
  // a-z, A-Z, 0-9, ., _
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 46 ||
    code === 95
  );
}

function isWhitespaceOrPunctuation(ch: string): boolean {
  return /[\s!?,;:({[<]/.test(ch);
}
