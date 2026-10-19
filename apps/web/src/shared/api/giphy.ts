export interface GifResult {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
}

export interface GifPage {
  gifs: GifResult[];
  nextOffset: number;
  hasMore: boolean;
}

export type GifSection = 'posts' | 'chat';

function apiKey(section: GifSection): string | undefined {
  return (
    section === 'chat'
      ? import.meta.env.VITE_GIPHY_CHAT_API_KEY
      : import.meta.env.VITE_GIPHY_API_KEY
  )?.trim();
}

export function isGifSearchConfigured(section: GifSection = 'posts'): boolean {
  return Boolean(apiKey(section));
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function mediaUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      /^(?:media\d*|i)\.giphy\.com$/.test(url.hostname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export async function searchGifs(
  query: string,
  offset = 0,
  signal?: AbortSignal,
  section: GifSection = 'posts',
): Promise<GifPage> {
  const key = apiKey(section);
  if (!key) throw new Error('GIF search is not configured yet.');
  const params = new URLSearchParams({
    api_key: key,
    limit: '24',
    offset: String(offset),
    rating: 'pg-13',
  });
  const term = query.trim();
  if (term) {
    params.set('q', term);
    const language = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
    params.set('lang', language);
  }
  const response = await fetch(
    `https://api.giphy.com/v1/gifs/${term ? 'search' : 'trending'}?${params}`,
    {
      signal,
      credentials: 'omit',
    },
  );
  if (!response.ok) throw new Error('GIFs could not load. Please try again.');
  const payload: unknown = await response.json();
  if (!record(payload) || !Array.isArray(payload.data))
    throw new Error('GIFs could not load. Please try again.');
  const gifs: GifResult[] = [];
  for (const item of payload.data) {
    if (!record(item) || typeof item.id !== 'string' || !record(item.images)) continue;
    // Prefer GIPHY's animated downsized rendition to reduce client bandwidth.
    const original = item.images.downsized ?? item.images.original;
    const preview = item.images.fixed_width_small ?? item.images.fixed_width ?? original;
    const url = record(original) ? mediaUrl(original.url) : null;
    const previewUrl = record(preview) ? mediaUrl(preview.url) : null;
    if (!url || !previewUrl) continue;
    gifs.push({
      id: item.id,
      title: typeof item.title === 'string' && item.title.trim() ? item.title : 'GIF',
      url,
      previewUrl,
    });
  }
  const nextOffset = offset + payload.data.length;
  const total =
    record(payload.pagination) && typeof payload.pagination.total_count === 'number'
      ? payload.pagination.total_count
      : nextOffset;
  return { gifs, nextOffset, hasMore: payload.data.length > 0 && nextOffset < total };
}
