import { isSpotifyUrl, parseSpotifyUrl } from './urlSecurity';
export * from './urlSecurity';

const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

/**
 * HTML entity decoder to guarantee clean string presentation and comparison.
 * Uses atomic single-pass substitution to prevent double unescaping.
 */
export function unescapeHtml(str?: string): string {
  if (!str) return '';
  return str.replace(
    /&(?:amp|lt|gt|quot|#39|apos|nbsp);/gi,
    (match) => HTML_ENTITY_MAP[match.toLowerCase()] || match,
  );
}

/**
 * Extracts a genuine 22-character Spotify track ID from any track representation,
 * URL, or URI, while ignoring synthetic or placeholder IDs.
 */
export function extractSpotifyTrackId(
  track?: {
    id?: string | null;
    trackId?: string | null;
    spotifyUrl?: string | null;
  } | null,
): string | null {
  if (!track) return null;

  // 1. Direct ID or trackId if it is a valid 22-char base62 string
  for (const rawId of [track.trackId, track.id]) {
    if (!rawId) continue;
    const clean = rawId.replace(/^spotify:track:/, '').trim();
    if (/^[a-zA-Z0-9]{22}$/.test(clean)) {
      return clean;
    }
  }

  // 2. Extract from spotifyUrl or URI using anchored WHATWG parser
  const candidateUrls = [track.spotifyUrl, track.id, track.trackId].filter(Boolean) as string[];
  for (const url of candidateUrls) {
    const parsed = parseSpotifyUrl(url);
    if (parsed && parsed.type === 'track' && /^[a-zA-Z0-9]{22}$/.test(parsed.id)) {
      return parsed.id;
    }
  }

  return null;
}

/**
 * Ensures that a track URL is strictly a genuine Spotify link.
 * Strips out any Apple Music / iTunes or invalid URLs and guarantees a
 * direct track link or Spotify search query link.
 */
export function getSafeSpotifyTrackUrl(
  track?: {
    spotifyUrl?: string | null;
    id?: string | null;
    trackId?: string | null;
    title?: string;
    artist?: string;
  } | null,
): string {
  if (!track) return 'https://open.spotify.com';

  const rawUrl = track.spotifyUrl?.trim();
  if (rawUrl && isSpotifyUrl(rawUrl)) {
    try {
      return new URL(rawUrl).href;
    } catch {
      return 'https://open.spotify.com';
    }
  }

  // If there's an authentic Spotify track ID
  const safeId = extractSpotifyTrackId(track);
  if (safeId) {
    return `https://open.spotify.com/track/${safeId}`;
  }

  // Fallback to Spotify web search query
  const query = [unescapeHtml(track.title), unescapeHtml(track.artist)]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (query) {
    return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
  }

  return 'https://open.spotify.com';
}
