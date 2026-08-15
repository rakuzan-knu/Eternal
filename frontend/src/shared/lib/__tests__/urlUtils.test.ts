import { describe, expect, it } from 'vitest';
import { extractFirstUrl } from '../urlUtils';

describe('extractFirstUrl', () => {
  it('returns null for empty or url-free text', () => {
    expect(extractFirstUrl('')).toBeNull();
    expect(extractFirstUrl('Hello world, no links here')).toBeNull();
    expect(extractFirstUrl(null)).toBeNull();
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
});
