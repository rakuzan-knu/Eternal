import { describe, expect, it, vi } from 'vitest';
import { extractFirstUrl } from '../urlUtils';

describe('extractFirstUrl', () => {
  it('returns null for empty or url-free text', () => {
    expect(extractFirstUrl('')).toBeNull();
    expect(extractFirstUrl('Hello world, no links here')).toBeNull();
    expect(extractFirstUrl(null)).toBeNull();
    expect(extractFirstUrl(undefined)).toBeNull();
    // @ts-expect-error test purpose
    expect(extractFirstUrl(123)).toBeNull();
  });

  it('extracts single URL correctly', () => {
    const text = 'Check out https://gemini.google.com/app now!';
    expect(extractFirstUrl(text)).toBe('https://gemini.google.com/app');
  });

  it('extracts ONLY the first URL when message contains 100 links (Discord / Telegram behavior)', () => {
    const hundredLinks = Array.from(
      { length: 100 },
      (_, i) => `https://gemini.google.com/app?index=${i}`,
    ).join(' ');

    const result = extractFirstUrl(hundredLinks);
    expect(result).toBe('https://gemini.google.com/app?index=0');
  });

  it('handles invalid URL parsing error and unsupported protocols', () => {
    const originalURL = global.URL;
    // Mock URL to throw error
    global.URL = vi.fn().mockImplementation(() => {
      throw new Error('Malformed URL');
    }) as any;

    expect(extractFirstUrl('Check https://example.com')).toBeNull();

    // Mock URL to return non-http/https protocol
    global.URL = vi.fn().mockImplementation(() => ({
      protocol: 'ftp:',
      href: 'ftp://example.com',
    })) as any;

    expect(extractFirstUrl('Check http://example.com')).toBeNull();

    global.URL = originalURL;
  });
});
