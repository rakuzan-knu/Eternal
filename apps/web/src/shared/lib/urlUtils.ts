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
 * Rejects and escapes meta-characters to prevent DOM XSS through attribute injection.
 */
export function sanitizeMediaUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Reject unescaped HTML/DOM meta-characters that could break attribute contexts
  if (/[<>"'`\\]/.test(trimmed)) {
    return null;
  }

  // Strictly validate browser-generated blob URLs: blob:<origin>/<uuid>
  if (trimmed.startsWith('blob:')) {
    if (/^blob:(?:https?:\/\/[a-zA-Z0-9.:_-]+|null)\/[a-zA-Z0-9-]+$/i.test(trimmed)) {
      return encodeURI(trimmed);
    }
    return null;
  }

  // Strictly validate base64 raster image data URLs (never SVG/HTML)
  if (trimmed.startsWith('data:image/')) {
    if (/^data:image\/(?:png|jpeg|jpg|webp|gif|bmp);base64,[a-zA-Z0-9+/=]+$/i.test(trimmed)) {
      return trimmed;
    }
    return null;
  }

  // Clean relative paths
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    if (/^\/[a-zA-Z0-9_.~!$&*+=;:@%/-]*$/.test(trimmed)) {
      return encodeURI(trimmed);
    }
    return null;
  }

  // Validate standard external HTTP/HTTPS URLs
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return encodeURI(parsed.href);
    }
  } catch {
    return null;
  }

  return null;
}
