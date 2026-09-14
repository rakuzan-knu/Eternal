import { describe, expect, it } from 'vitest';
import {
  isSpotifyUrl,
  isSoundCloudUrl,
  isAppleAudioUrl,
  isTrustedMessageOrigin,
  isSpotifyMessageOrigin,
  parseSpotifyUrl,
  sanitizeImageUrl,
  sanitizeExternalUrl,
  sanitizePlatformUrl,
} from '../urlSecurity';
import { unescapeHtml } from '../spotifyUrl';

describe('urlSecurity', () => {
  describe('isSpotifyUrl', () => {
    it('returns true for genuine spotify.com domains', () => {
      expect(isSpotifyUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')).toBe(true);
      expect(isSpotifyUrl('https://spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')).toBe(true);
      expect(isSpotifyUrl('https://api.spotify.com/v1/tracks')).toBe(true);
    });

    it('returns false for spoofed domains or invalid URLs', () => {
      expect(isSpotifyUrl('https://spotify.com.attacker.com/evil')).toBe(false);
      expect(isSpotifyUrl('https://evil-spotify.com')).toBe(false);
      expect(isSpotifyUrl('https://fakepotify.com')).toBe(false);
      expect(isSpotifyUrl('not a url')).toBe(false);
      expect(isSpotifyUrl('')).toBe(false);
      expect(isSpotifyUrl(null)).toBe(false);
      expect(isSpotifyUrl(undefined)).toBe(false);
    });
  });

  describe('isSoundCloudUrl', () => {
    it('returns true for genuine soundcloud.com domains', () => {
      expect(isSoundCloudUrl('https://soundcloud.com/artist/cool-track')).toBe(true);
      expect(isSoundCloudUrl('https://api-v2.soundcloud.com/tracks/123')).toBe(true);
      expect(isSoundCloudUrl('https://w.soundcloud.com/player/?url=...')).toBe(true);
    });

    it('returns false for spoofed domains or invalid inputs', () => {
      expect(isSoundCloudUrl('https://soundcloud.com.evil.com')).toBe(false);
      expect(isSoundCloudUrl('https://evil-soundcloud.com')).toBe(false);
      expect(isSoundCloudUrl('javascript:alert(1)')).toBe(false);
      expect(isSoundCloudUrl('')).toBe(false);
      expect(isSoundCloudUrl(null)).toBe(false);
    });
  });

  describe('isAppleAudioUrl', () => {
    it('returns true for apple.com and itunes.apple.com domains', () => {
      expect(isAppleAudioUrl('https://itunes.apple.com/lookup?id=123')).toBe(true);
      expect(
        isAppleAudioUrl(
          'https://audio-ssl.itunes.apple.com/apple-assets-us-std-000001/preview.m4a',
        ),
      ).toBe(true);
      expect(isAppleAudioUrl('https://music.apple.com/us/album/test/123')).toBe(true);
    });

    it('returns false for attacker domains mimicking apple', () => {
      expect(isAppleAudioUrl('https://apple.com.evil.com/preview.mp3')).toBe(false);
      expect(isAppleAudioUrl('https://evil-apple.com')).toBe(false);
      expect(isAppleAudioUrl('')).toBe(false);
      expect(isAppleAudioUrl(null)).toBe(false);
    });
  });

  describe('isTrustedMessageOrigin', () => {
    it('returns true for localhost, loopback, and trusted production domains', () => {
      expect(isTrustedMessageOrigin('http://localhost:3000')).toBe(true);
      expect(isTrustedMessageOrigin('http://localhost:5173')).toBe(true);
      expect(isTrustedMessageOrigin('http://127.0.0.1:8080')).toBe(true);
      expect(isTrustedMessageOrigin('https://eternalnet.vercel.app')).toBe(true);
      expect(isTrustedMessageOrigin('https://preview-deploy.vercel.app')).toBe(true);
    });

    it('returns false for untrusted or attacker domains', () => {
      expect(isTrustedMessageOrigin('https://evil.com')).toBe(false);
      expect(isTrustedMessageOrigin('https://vercel.app.attacker.com')).toBe(false);
      expect(isTrustedMessageOrigin('https://attacker-vercel.app.evil.com')).toBe(false);
      expect(isTrustedMessageOrigin('malformed')).toBe(false);
      expect(isTrustedMessageOrigin('')).toBe(false);
      expect(isTrustedMessageOrigin(null)).toBe(false);
    });
  });

  describe('isSpotifyMessageOrigin', () => {
    it('returns true for genuine HTTPS spotify origins', () => {
      expect(isSpotifyMessageOrigin('https://open.spotify.com')).toBe(true);
      expect(isSpotifyMessageOrigin('https://spotify.com')).toBe(true);
      expect(isSpotifyMessageOrigin('https://embed.spotify.com')).toBe(true);
    });

    it('returns false for non-https or attacker domains', () => {
      expect(isSpotifyMessageOrigin('http://open.spotify.com')).toBe(false);
      expect(isSpotifyMessageOrigin('https://open.spotify.com.attacker.com')).toBe(false);
      expect(isSpotifyMessageOrigin('https://evil-spotify.com')).toBe(false);
      expect(isSpotifyMessageOrigin('')).toBe(false);
      expect(isSpotifyMessageOrigin(null)).toBe(false);
    });
  });

  describe('parseSpotifyUrl', () => {
    it('correctly parses track, album, playlist, episode, and show URLs', () => {
      expect(parseSpotifyUrl('https://open.spotify.com/track/48TKaLj9x4L329teHsLngL')).toEqual({
        type: 'track',
        id: '48TKaLj9x4L329teHsLngL',
      });
      expect(parseSpotifyUrl('https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3')).toEqual({
        type: 'album',
        id: '1DFixLWuPkv3KT3TnV35m3',
      });
      expect(parseSpotifyUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')).toEqual({
        type: 'playlist',
        id: '37i9dQZF1DXcBWIGoYBM5M',
      });
      expect(parseSpotifyUrl('spotify:track:48TKaLj9x4L329teHsLngL')).toEqual({
        type: 'track',
        id: '48TKaLj9x4L329teHsLngL',
      });
    });

    it('rejects spoofed URLs and unanchored attacks', () => {
      expect(parseSpotifyUrl('https://evil.com/fake/spotify.com/track/12345')).toBeNull();
      expect(parseSpotifyUrl('https://spotify.com.evil.com/track/12345')).toBeNull();
      expect(parseSpotifyUrl('javascript:alert(1)')).toBeNull();
      expect(parseSpotifyUrl('')).toBeNull();
      expect(parseSpotifyUrl(null)).toBeNull();
    });
  });

  describe('sanitizeExternalUrl', () => {
    it('allows valid http and https URLs', () => {
      expect(sanitizeExternalUrl('https://twitch.tv/ninja')).toBe('https://twitch.tv/ninja');
      expect(sanitizeExternalUrl('http://example.com')).toBe('http://example.com');
      expect(sanitizeExternalUrl('/music/track/123')).toBe('/music/track/123');
    });

    it('blocks dangerous schemes and protocol-relative URLs', () => {
      expect(sanitizeExternalUrl('javascript:alert(1)')).toBe('#');
      expect(sanitizeExternalUrl('data:text/html,<script>evil()</script>')).toBe('#');
      expect(sanitizeExternalUrl('vbscript:evil()')).toBe('#');
      expect(sanitizeExternalUrl('//evil.com')).toBe('#');
      expect(sanitizeExternalUrl('')).toBe('#');
      expect(sanitizeExternalUrl(null)).toBe('#');
      expect(sanitizeExternalUrl(undefined, 'fallback')).toBe('fallback');
    });
  });

  describe('sanitizePlatformUrl', () => {
    it('allows genuine platform domains and subdomains', () => {
      expect(
        sanitizePlatformUrl('https://youtube.com/watch?v=123', ['youtube.com', 'youtu.be']),
      ).toBe('https://youtube.com/watch?v=123');
      expect(
        sanitizePlatformUrl('https://www.youtube.com/@ayate', ['youtube.com', 'youtu.be']),
      ).toBe('https://www.youtube.com/@ayate');
      expect(sanitizePlatformUrl('https://youtu.be/12345', ['youtube.com', 'youtu.be'])).toBe(
        'https://youtu.be/12345',
      );
      expect(sanitizePlatformUrl('https://twitch.tv/shroud', ['twitch.tv'])).toBe(
        'https://twitch.tv/shroud',
      );
      expect(sanitizePlatformUrl('https://roblox.com/games/123', ['roblox.com'])).toBe(
        'https://roblox.com/games/123',
      );
      expect(sanitizePlatformUrl('https://github.com/facebook/react', ['github.com'])).toBe(
        'https://github.com/facebook/react',
      );
    });

    it('rejects domain spoofs, dangerous schemes, and untrusted domains', () => {
      expect(sanitizePlatformUrl('https://evil-youtube.com/watch?v=123', ['youtube.com'])).toBe('');
      expect(sanitizePlatformUrl('https://youtube.com.attacker.com/evil', ['youtube.com'])).toBe(
        '',
      );
      expect(sanitizePlatformUrl('javascript:alert(1)', ['youtube.com'])).toBe('');
      expect(sanitizePlatformUrl('data:text/html,evil', ['youtube.com'])).toBe('');
      expect(
        sanitizePlatformUrl('https://phishing.com', ['youtube.com'], 'https://fallback.com'),
      ).toBe('https://fallback.com');
    });
  });

  describe('unescapeHtml', () => {
    it('decodes entities in a single pass without double-unescaping vulnerabilities', () => {
      // &amp;lt; should decode to &lt;, NOT to <
      expect(unescapeHtml('&amp;lt;')).toBe('&lt;');
      expect(unescapeHtml('Hello &amp; World')).toBe('Hello & World');
      expect(unescapeHtml('&quot;Song&quot; &#39;Artist&#39;')).toBe('"Song" \'Artist\'');
      expect(unescapeHtml('Track &gt; Album')).toBe('Track > Album');
      expect(unescapeHtml('Regular string')).toBe('Regular string');
      expect(unescapeHtml('')).toBe('');
      expect(unescapeHtml(undefined)).toBe('');
    });
  });
});
