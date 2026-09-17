/**
 * Isomorphic, zero-dependency HTML tag stripper for shared contracts and DTO schemas.
 * Safely strips HTML markup, script/style blocks, and entities without pulling in
 * Node.js-specific modules (fs, path, url, source-map-js) into client bundles.
 */
const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

/**
 * Character-by-character scanner that strips comments, scripts, styles, and HTML tags
 * without relying on multi-character regex replacements, eliminating CodeQL CWE-116 alerts.
 */
function stripHtmlMarkup(input: string): string {
  let output = '';
  const len = input.length;
  let i = 0;

  while (i < len) {
    // 1. HTML Comment: <!-- ... -->
    if (input.startsWith('<!--', i)) {
      const endComment = input.indexOf('-->', i + 4);
      if (endComment === -1) {
        break; // unclosed comment consumes rest of string
      }
      i = endComment + 3;
      continue;
    }

    // 2. Script blocks: <script ...> ... </script ...>
    if (input.length >= i + 7 && input.substring(i, i + 7).toLowerCase() === '<script') {
      const nextChar = input[i + 7];
      if (
        nextChar === '>' ||
        nextChar === ' ' ||
        nextChar === '\t' ||
        nextChar === '\n' ||
        nextChar === '\r' ||
        nextChar === '/'
      ) {
        const lower = input.toLowerCase();
        const endScript = lower.indexOf('</script', i + 7);
        if (endScript === -1) {
          break;
        }
        const closeTag = input.indexOf('>', endScript + 8);
        if (closeTag === -1) {
          break;
        }
        i = closeTag + 1;
        continue;
      }
    }

    // 3. Style blocks: <style ...> ... </style ...>
    if (input.length >= i + 6 && input.substring(i, i + 6).toLowerCase() === '<style') {
      const nextChar = input[i + 6];
      if (
        nextChar === '>' ||
        nextChar === ' ' ||
        nextChar === '\t' ||
        nextChar === '\n' ||
        nextChar === '\r' ||
        nextChar === '/'
      ) {
        const lower = input.toLowerCase();
        const endStyle = lower.indexOf('</style', i + 6);
        if (endStyle === -1) {
          break;
        }
        const closeTag = input.indexOf('>', endStyle + 7);
        if (closeTag === -1) {
          break;
        }
        i = closeTag + 1;
        continue;
      }
    }

    // 4. Any other HTML tag: <...>
    if (input[i] === '<') {
      const nextOpen = input.indexOf('<', i + 1);
      const nextClose = input.indexOf('>', i + 1);
      if (nextClose === -1) {
        // Unclosed '<' without a matching '>'
        output += input[i];
        i++;
        continue;
      }
      if (nextOpen !== -1 && nextOpen < nextClose) {
        // Nested unclosed '<' before '>', discard incomplete outer bracket
        i = nextOpen;
        continue;
      }
      i = nextClose + 1;
      continue;
    }

    output += input[i];
    i++;
  }

  return output;
}

export function sanitizePlainText(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  let sanitized = value;
  let prev = '';
  // Repeat removal until no more nested tags or comments remain (e.g. <<script>script>)
  while (sanitized !== prev) {
    prev = sanitized;
    sanitized = stripHtmlMarkup(sanitized);
  }

  // Single-pass atomic entity decoding to prevent double unescaping
  return sanitized
    .replace(
      /&(?:amp|lt|gt|quot|#39|apos|nbsp);/gi,
      (match) => ENTITY_MAP[match.toLowerCase()] || match,
    )
    .trim();
}

export const sanitizeHtml = sanitizePlainText;
