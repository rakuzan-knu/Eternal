/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import * as dns from 'dns';
import {
  OpenGraphService,
  isPrivateIPv4,
  isPrivateIPv6,
  isPrivateOrForbiddenIp,
} from '../opengraph.service';

jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

describe('OpenGraphService - SSRF & Sanitization Security', () => {
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
      // Loopback
      expect(isPrivateIPv4('127.0.0.1')).toBe(true);
      expect(isPrivateIPv4('127.255.255.255')).toBe(true);
      // Cloud Metadata
      expect(isPrivateIPv4('169.254.169.254')).toBe(true);
      expect(isPrivateIPv4('169.254.1.1')).toBe(true);
      // Private Class A, B, C
      expect(isPrivateIPv4('10.0.0.1')).toBe(true);
      expect(isPrivateIPv4('10.255.255.255')).toBe(true);
      expect(isPrivateIPv4('172.16.0.1')).toBe(true);
      expect(isPrivateIPv4('172.31.255.255')).toBe(true);
      expect(isPrivateIPv4('192.168.1.1')).toBe(true);
      // Carrier-grade NAT
      expect(isPrivateIPv4('100.64.0.1')).toBe(true);
      expect(isPrivateIPv4('100.127.255.255')).toBe(true);
      // Current / Broadcast / Multicast
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

      // Mock DNS returning 127.0.0.1 for attacker domain
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

    it('blocks malicious redirects to private IP addresses (SSRF via 302)', async () => {
      // First hop is safe public IP, returns 302 to 169.254.169.254
      const fetchMock = jest.fn().mockResolvedValueOnce({
        status: 302,
        ok: false,
        headers: new Headers({ location: 'http://169.254.169.254/latest/meta-data/' }),
      });
      (global as any).fetch = fetchMock;

      const result = await service.extractMetadata('http://example.com/redirect-to-aws');
      expect(result).toBeNull();
      // Should have called fetch only once for the first hop and aborted on the second hop before fetching 169.254.169.254
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Single-Pass HTML Entity Sanitization (Alert #476 fix)', () => {
    it('prevents double-unescaping vulnerabilities like &amp;lt;script&gt;', async () => {
      const html = `
        <html>
          <head>
            <title>&amp;lt;script&gt;alert(1)&amp;lt;/script&gt;</title>
            <meta property="og:title" content="&amp;lt;b&amp;gt;Hello &amp; Welcome&amp;lt;/b&amp;gt;" />
            <meta property="og:description" content="Quotes &quot; &apos; &lt; &gt; and safe &amp;lt;b&amp;gt;" />
          </head>
        </html>
      `;

      const fetchMock = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: jest.fn().mockResolvedValue(html),
      });
      (global as any).fetch = fetchMock;

      const result = await service.extractMetadata('https://example.com/article');

      expect(result).not.toBeNull();
      // &amp;lt; should become &lt;, NOT < (which would be double-unescaping XSS!)
      expect(result?.title).toBe('&lt;b&gt;Hello & Welcome&lt;/b&gt;');
      expect(result?.description).toBe('Quotes " \' < > and safe &lt;b&gt;');
    });
  });

  describe('Standard Extraction & Caching Behavior', () => {
    it('returns null and caches negative result when URL fails or is non-HTML', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        status: 404,
        ok: false,
        headers: new Headers({ 'content-type': 'text/html' }),
      });
      (global as any).fetch = fetchMock;

      const result = await service.extractMetadata('http://adaqweqsdasdqdq.com/');

      expect(result).toBeNull();
      expect(mockRedis.set).toHaveBeenCalledWith(
        'og:preview:http://adaqweqsdasdqdq.com/',
        expect.stringContaining('"notFound":true'),
        3600,
      );
    });

    it('returns null on negative cache hit without making outbound HTTP requests', async () => {
      mockRedis.get.mockResolvedValueOnce(
        JSON.stringify({ notFound: true, url: 'http://adaqweqsdasdqdq.com/' }),
      );
      const fetchMock = jest.fn();
      (global as any).fetch = fetchMock;

      const result = await service.extractMetadata('http://adaqweqsdasdqdq.com/');

      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('aborts binary content (like .mp4 or .zip) immediately without downloading whole payload', async () => {
      const cancelMock = jest.fn();
      const fetchMock = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Headers({ 'content-type': 'video/mp4' }),
        body: {
          cancel: cancelMock,
        },
      });
      (global as any).fetch = fetchMock;

      const result = await service.extractMetadata('http://example.com/huge-movie.mp4');

      expect(result).toBeNull();
      expect(cancelMock).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalledWith(
        'og:preview:http://example.com/huge-movie.mp4',
        expect.stringContaining('"notFound":true'),
        3600,
      );
    });
  });
});
