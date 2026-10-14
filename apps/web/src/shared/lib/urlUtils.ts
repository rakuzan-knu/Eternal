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

/**
 * Validates and sanitizes media URLs (images, videos, thumbnails) for safe DOM embedding.
 * Permits only safe schemes (https:, http:, blob:, data:image/) or clean relative paths.
 * Blocks dangerous schemes such as javascript:, vbscript:, data:text/html, etc.
 */
export function sanitizeMediaUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('blob:')) {
    return trimmed;
  }

  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    return null;
  }

  return null;
}
