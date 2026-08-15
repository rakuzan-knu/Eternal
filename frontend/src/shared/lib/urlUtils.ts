/**
 * Matches standard HTTP/HTTPS URLs.
 */
const URL_REGEX =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;

/**
 * Extracts ONLY the first valid external HTTP/HTTPS URL from a string of text.
 * If a message contains multiple links (even 100 links), this returns ONLY the first one.
 */
export function extractFirstUrl(text?: string | null): string | null {
  if (!text || typeof text !== 'string') return null;

  // Reset regex state
  URL_REGEX.lastIndex = 0;
  const match = URL_REGEX.exec(text);
  if (!match) return null;

  const candidate = match[0];
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    return null;
  }

  return null;
}
