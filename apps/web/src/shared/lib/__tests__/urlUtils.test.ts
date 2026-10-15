import { describe, expect, it, vi } from 'vitest';
import { extractFirstUrl, sanitizeMediaUrl } from '../urlUtils';

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

  it('extracts ONLY the first URL when message contains 100 links', () => {
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

describe('sanitizeMediaUrl', () => {
  it('returns null for empty or non-string inputs', () => {
    expect(sanitizeMediaUrl('')).toBeNull();
    expect(sanitizeMediaUrl(null)).toBeNull();
    expect(sanitizeMediaUrl(undefined)).toBeNull();
    // @ts-expect-error test invalid types
    expect(sanitizeMediaUrl(12345)).toBeNull();
  });

  it('rejects URLs containing HTML meta-characters or injection payloads', () => {
    expect(sanitizeMediaUrl('https://example.com/pic.png<script>alert(1)</script>')).toBeNull();
    expect(sanitizeMediaUrl('https://example.com/pic.png" onerror="alert(1)')).toBeNull();
    expect(sanitizeMediaUrl("https://example.com/pic.png' onmouseover='alert(1)")).toBeNull();
    expect(sanitizeMediaUrl('blob:http://localhost/uuid<img src=x>')).toBeNull();
  });

  it('permits valid HTTPS, HTTP, blob, raster data, and clean relative paths', () => {
    expect(sanitizeMediaUrl('https://example.com/avatar.jpg')).toBe(
      'https://example.com/avatar.jpg',
    );
    expect(sanitizeMediaUrl('http://example.com/media.mp4')).toBe('http://example.com/media.mp4');
    expect(sanitizeMediaUrl('blob:https://eternal.app/3f28328f-7c09-4c8d-b3ef-8898b965c40d')).toBe(
      'blob:https://eternal.app/3f28328f-7c09-4c8d-b3ef-8898b965c40d',
    );
    expect(
      sanitizeMediaUrl(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      ),
    ).toContain('data:image/png;base64,');
    expect(sanitizeMediaUrl('/uploads/photos/my-photo.jpg')).toBe('/uploads/photos/my-photo.jpg');
  });

  it('blocks dangerous schemes like javascript:, vbscript:, and SVG data URLs', () => {
    expect(sanitizeMediaUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeMediaUrl('vbscript:msgbox(1)')).toBeNull();
    expect(sanitizeMediaUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(sanitizeMediaUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBeNull();
  });
});
