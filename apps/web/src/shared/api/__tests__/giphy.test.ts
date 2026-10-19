import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isGifSearchConfigured, searchGifs } from '../giphy';
const gif = {
  id: 'cat',
  title: 'Happy cat',
  images: {
    original: { url: 'https://media0.giphy.com/cat-large.gif?cid=original' },
    downsized: { url: 'https://media1.giphy.com/cat.gif?cid=selection' },
    fixed_width_small: { url: 'https://media2.giphy.com/cat-small.gif?cid=preview' },
  },
};
const fetchMock = vi.fn<typeof fetch>();
describe('GIPHY client', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GIPHY_API_KEY', 'own-test-key');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(Response.json({ data: [gif], pagination: { total_count: 50 } }));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });
  it('loads trending GIFs and preserves provider tracking without app credentials', async () => {
    const result = await searchGifs('');
    const [request, options] = fetchMock.mock.calls[0];
    const url = new URL(String(request));
    expect(url.origin + url.pathname).toBe('https://api.giphy.com/v1/gifs/trending');
    expect(url.searchParams.get('api_key')).toBe('own-test-key');
    expect(options?.credentials).toBe('omit');
    expect(result).toEqual({
      gifs: [
        {
          id: 'cat',
          title: 'Happy cat',
          url: gif.images.downsized.url,
          previewUrl: gif.images.fixed_width_small.url,
        },
      ],
      nextOffset: 1,
      hasMore: true,
    });
  });
  it('sends encoded search, offset and cancellation', async () => {
    const signal = new AbortController().signal;
    await searchGifs('  cats & dogs  ', 24, signal);
    const [request, options] = fetchMock.mock.calls[0];
    const url = new URL(String(request));
    expect(url.pathname).toBe('/v1/gifs/search');
    expect(url.searchParams.get('q')).toBe('cats & dogs');
    expect(url.searchParams.get('offset')).toBe('24');
    expect(options?.signal).toBe(signal);
  });
  it.each([
    'https://media1.giphy.com.evil.test/x.gif',
    'http://media1.giphy.com/x.gif',
    'https://user:pass@media1.giphy.com/x.gif',
    'https://media1.giphy.com:8443/x.gif',
  ])('rejects untrusted media %s', async (url) => {
    fetchMock.mockResolvedValue(
      Response.json({
        data: [{ ...gif, images: { ...gif.images, downsized: { url } } }],
        pagination: { total_count: 1 },
      }),
    );
    expect((await searchGifs('')).gifs).toEqual([]);
  });
  it('handles empty and malformed results', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ data: [], pagination: { total_count: 0 } }));
    expect(await searchGifs('unknown')).toEqual({ gifs: [], nextOffset: 0, hasMore: false });
    fetchMock.mockResolvedValueOnce(Response.json({ unexpected: true }));
    await expect(searchGifs('')).rejects.toThrow('GIFs could not load');
  });
  it('handles provider errors without exposing the API key', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 429 }));
    await expect(searchGifs('')).rejects.toThrow('GIFs could not load. Please try again.');
  });
  it('requires configuration before requesting the provider', async () => {
    vi.stubEnv('VITE_GIPHY_API_KEY', '');
    expect(isGifSearchConfigured()).toBe(false);
    await expect(searchGifs('')).rejects.toThrow('not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
