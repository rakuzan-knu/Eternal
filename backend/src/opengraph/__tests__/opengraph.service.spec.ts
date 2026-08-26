/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import * as dns from 'dns';
import {
  OpenGraphService,
  isPrivateIPv4,
  isPrivateIPv6,
  isPrivateOrForbiddenIp,
  parseYouTubeStartSeconds,
} from '../opengraph.service';

jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

describe('OpenGraphService - SSRF, Security & Rich Providers', () => {
  let service: OpenGraphService;
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };
    service = new OpenGraphService(mockRedis);

    // Default mock DNS to a safe public IP
    (dns.promises.lookup as jest.Mock).mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('IP & SSRF Validation Functions', () => {
    it('detects and blocks all private/reserved IPv4 addresses', () => {
      expect(isPrivateIPv4('127.0.0.1')).toBe(true);
      expect(isPrivateIPv4('127.255.255.255')).toBe(true);
      expect(isPrivateIPv4('169.254.169.254')).toBe(true);
      expect(isPrivateIPv4('169.254.1.1')).toBe(true);
      expect(isPrivateIPv4('10.0.0.1')).toBe(true);
      expect(isPrivateIPv4('10.255.255.255')).toBe(true);
      expect(isPrivateIPv4('172.16.0.1')).toBe(true);
      expect(isPrivateIPv4('172.31.255.255')).toBe(true);
      expect(isPrivateIPv4('192.168.1.1')).toBe(true);
      expect(isPrivateIPv4('100.64.0.1')).toBe(true);
      expect(isPrivateIPv4('100.127.255.255')).toBe(true);
      expect(isPrivateIPv4('0.0.0.0')).toBe(true);
      expect(isPrivateIPv4('224.0.0.1')).toBe(true);
      expect(isPrivateIPv4('240.0.0.1')).toBe(true);
      expect(isPrivateIPv4('255.255.255.255')).toBe(true);

      // Valid Public IPs
      expect(isPrivateIPv4('8.8.8.8')).toBe(false);
      expect(isPrivateIPv4('1.1.1.1')).toBe(false);
      expect(isPrivateIPv4('93.184.216.34')).toBe(false);
    });

    it('detects and blocks all private/reserved IPv6 addresses', () => {
      expect(isPrivateIPv6('::1')).toBe(true);
      expect(isPrivateIPv6('::')).toBe(true);
      expect(isPrivateIPv6('fc00::1')).toBe(true);
      expect(isPrivateIPv6('fd12:3456:789a::1')).toBe(true);
      expect(isPrivateIPv6('fe80::1')).toBe(true);
      expect(isPrivateIPv6('ff02::1')).toBe(true);
      expect(isPrivateIPv6('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIPv6('::ffff:10.0.0.1')).toBe(true);

      // Valid Public IPv6
      expect(isPrivateIPv6('2606:4700:4700::1111')).toBe(false);
      expect(isPrivateIPv6('2001:4860:4860::8888')).toBe(false);
    });

    it('blocks invalid or malformed IP formats', () => {
      expect(isPrivateOrForbiddenIp('not-an-ip')).toBe(true);
      expect(isPrivateOrForbiddenIp('999.999.999.999')).toBe(true);
    });

    it('sanitizes and validates valid public URLs', () => {
      expect(service.sanitizeUrl('https://example.com/article?id=123')).toBe(
        'https://example.com/article?id=123',
      );
      expect(service.sanitizeUrl('http://github.com/profile')).toBe('http://github.com/profile');
    });

    it('rejects forbidden or unsafe URLs in sanitizeUrl', () => {
      expect(service.sanitizeUrl('http://localhost:3000')).toBeNull();
      expect(service.sanitizeUrl('http://127.0.0.1:6379')).toBeNull();
      expect(service.sanitizeUrl('http://169.254.169.254/latest/meta-data/')).toBeNull();
      expect(service.sanitizeUrl('http://user:pass@example.com/')).toBeNull();
      expect(service.sanitizeUrl('ftp://example.com/')).toBeNull();
      expect(service.sanitizeUrl('javascript:alert(1)')).toBeNull();
    });
  });

  describe('YouTube Timestamp Parsing (Start Seconds)', () => {
    it('correctly parses various timestamp formats', () => {
      expect(parseYouTubeStartSeconds('https://youtu.be/dQw4w9WgXcQ?t=90')).toBe(90);
      expect(parseYouTubeStartSeconds('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s')).toBe(
        90,
      );
      expect(parseYouTubeStartSeconds('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s')).toBe(
        90,
      );
      expect(parseYouTubeStartSeconds('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m3s')).toBe(
        3723,
      );
      expect(parseYouTubeStartSeconds('https://www.youtube.com/watch?v=dQw4w9WgXcQ&start=45')).toBe(
        45,
      );
      expect(
        parseYouTubeStartSeconds('https://www.youtube.com/watch?v=dQw4w9WgXcQ&time_continue=60'),
      ).toBe(60);
      expect(parseYouTubeStartSeconds('https://youtu.be/dQw4w9WgXcQ#t=2m')).toBe(120);
      expect(parseYouTubeStartSeconds('https://youtu.be/dQw4w9WgXcQ')).toBeUndefined();
    });
  });

  describe('Specialized Provider Handlers', () => {
    it('extracts YouTube rich metadata and start timestamp', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          title: 'Never Gonna Give You Up',
          author_name: 'Rick Astley',
        }),
      });
      (global as any).fetch = fetchMock;

      const result = await service.extractMetadata(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s',
      );

      expect(result).toBeDefined();
      expect(result?.type).toBe('youtube');
      expect(result?.title).toBe('Never Gonna Give You Up');
      expect(result?.youtube?.videoId).toBe('dQw4w9WgXcQ');
      expect(result?.youtube?.author).toBe('Rick Astley');
      expect(result?.youtube?.startSeconds).toBe(90);
      expect(result?.image).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('og:preview:v2:'),
        expect.any(String),
        172800, // 48 hours TTL
      );
    });

    it('extracts GitHub repository metadata without token via open API', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          name: 'react',
          full_name: 'facebook/react',
          description: 'The library for web and native user interfaces.',
          stargazers_count: 220000,
          forks_count: 45000,
          language: 'TypeScript',
          owner: { avatar_url: 'https://avatars.githubusercontent.com/u/69631?v=4' },
        }),
      });
      (global as any).fetch = fetchMock;

      const result = await service.extractMetadata('https://github.com/facebook/react');

      expect(result).toBeDefined();
      expect(result?.type).toBe('github');
      expect(result?.title).toBe('facebook/react');
      expect(result?.github?.stars).toBe(220000);
      expect(result?.github?.forks).toBe(45000);
      expect(result?.github?.language).toBe('TypeScript');
      expect(result?.github?.languageColor).toBe('#3178c6');
      expect(result?.github?.avatarUrl).toBe('https://avatars.githubusercontent.com/u/69631?v=4');
    });

    it('extracts Spotify track oEmbed metadata', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          title: 'Starboy',
          thumbnail_url: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452',
        }),
      });
      (global as any).fetch = fetchMock;

      const result = await service.extractMetadata(
        'https://open.spotify.com/track/7MXVkk9YM5IZxh0wAE26V5',
      );

      expect(result).toBeDefined();
      expect(result?.type).toBe('spotify');
      expect(result?.title).toBe('Starboy');
      expect(result?.audio?.provider).toBe('spotify');
      expect(result?.audio?.audioType).toBe('track');
      expect(result?.audio?.embedUrl).toContain(
        'https://open.spotify.com/embed/track/7MXVkk9YM5IZxh0wAE26V5',
      );
    });

    it('extracts SoundCloud track oEmbed metadata', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          title: 'Cool Track',
          author_name: 'Artist',
          thumbnail_url: 'https://i1.sndcdn.com/artworks.jpg',
          html: '<iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/123"></iframe>',
        }),
      });
      (global as any).fetch = fetchMock;

      const result = await service.extractMetadata('https://soundcloud.com/artist/cool-track');

      expect(result).toBeDefined();
      expect(result?.type).toBe('soundcloud');
      expect(result?.audio?.provider).toBe('soundcloud');
      expect(result?.audio?.artist).toBe('Artist');
      expect(result?.audio?.embedUrl).toBe(
        'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/123',
      );
    });

    it('extracts generic OpenGraph fallback for other websites', async () => {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>My Awesome Article</title>
            <meta property="og:title" content="My Awesome Article" />
            <meta property="og:description" content="This is a great article description" />
            <meta property="og:image" content="https://example.com/cover.jpg" />
            <meta property="og:site_name" content="Example News" />
          </head>
          <body>Hello</body>
        </html>
      `;

      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (header: string) => {
            if (header.toLowerCase() === 'content-type') return 'text/html; charset=utf-8';
            return null;
          },
        },
        text: async () => htmlContent,
      });
      (global as any).fetch = fetchMock;

      const result = await service.extractMetadata('https://example.com/article/1');

      expect(result).toBeDefined();
      expect(result?.type).toBe('generic');
      expect(result?.title).toBe('My Awesome Article');
      expect(result?.description).toBe('This is a great article description');
      expect(result?.image).toBe('https://example.com/cover.jpg');
      expect(result?.siteName).toBe('Example News');
    });
  });

  describe('SSRF Protection in validateUrlForSsrf', () => {
    it('blocks loopback and cloud metadata URLs immediately without fetch', async () => {
      const fetchMock = jest.fn();
      (global as any).fetch = fetchMock;

      const r1 = await service.extractMetadata('http://169.254.169.254/latest/meta-data/');
      const r2 = await service.extractMetadata('http://127.0.0.1:6379/');
      const r3 = await service.extractMetadata('http://localhost:3000/api/admin');
      const r4 = await service.extractMetadata('http://internal.service.local/secret');

      expect(r1).toBeNull();
      expect(r2).toBeNull();
      expect(r3).toBeNull();
      expect(r4).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('blocks DNS rebinding / domain resolving to private IP', async () => {
      const fetchMock = jest.fn();
      (global as any).fetch = fetchMock;

      (dns.promises.lookup as jest.Mock).mockResolvedValueOnce([
        { address: '127.0.0.1', family: 4 },
      ]);

      const result = await service.extractMetadata('http://attacker-rebind.com/keys');
      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('blocks non-standard internal ports and credentials in URL', async () => {
      const fetchMock = jest.fn();
      (global as any).fetch = fetchMock;

      const r1 = await service.extractMetadata('http://example.com:6379/keys');
      const r2 = await service.extractMetadata('http://admin:secret@example.com/');

      expect(r1).toBeNull();
      expect(r2).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
