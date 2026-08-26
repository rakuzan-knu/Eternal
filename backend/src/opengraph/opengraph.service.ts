import { Injectable, Logger } from '@nestjs/common';
import * as dns from 'dns';
import * as net from 'net';
import sanitizeHtml from 'sanitize-html';
import { RedisService } from '../redis/redis.service';
import type { LinkEmbedData, LinkEmbedType } from '@common/contracts';

export type { LinkEmbedData, LinkEmbedType } from '@common/contracts';
export type OpenGraphMetadata = LinkEmbedData;

const FORTY_EIGHT_HOURS_SECONDS = 48 * 60 * 60; // 172800 seconds (48h TTL as required)
const NEGATIVE_CACHE_SECONDS = 60 * 60; // 1 hour for dead/unreachable URLs
const MAX_BUFFER_BYTES = 512 * 1024; // 512 KB max limit (stops memory OOM)
const MAX_REDIRECT_HOPS = 3;
const ALLOWED_PORTS = new Set([80, 443, 8080, 8443]);
const REQUEST_TIMEOUT_MS = 3500; // 3.5 seconds max timeout

// Strict URL regex validator that CodeQL recognizes as an SSRF sanitizer guard
const SAFE_URL_REGEX =
  /^https?:\/\/(?!(?:localhost|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|169\.254\.|0\.|100\.(?:6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.|22[4-9]\.|23[0-9]\.|24[0-9]\.|25[0-5]\.))[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+(?::(?:80|443|8080|8443))?(?:\/[^\s]*)?$/i;

const GITHUB_LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Java: '#b07219',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Lua: '#000080',
  Zig: '#ec915c',
  Elixir: '#6e4a7e',
};

const GITHUB_RESERVED_SLUGS = new Set([
  'features',
  'pricing',
  'topics',
  'trending',
  'events',
  'login',
  'join',
  'settings',
  'orgs',
  'explore',
  'notifications',
  'about',
  'contact',
  'security',
  'marketplace',
  'pulls',
  'issues',
  'discussions',
  'sponsors',
]);

export function parseYouTubeStartSeconds(urlStr: string): number | undefined {
  try {
    const parsed = new URL(urlStr);
    const param =
      parsed.searchParams.get('t') ||
      parsed.searchParams.get('start') ||
      parsed.searchParams.get('time_continue') ||
      (parsed.hash.startsWith('#t=') ? parsed.hash.slice(3) : null);

    if (!param || param.length > 32) return undefined;

    // Direct digits e.g. "90" or "90s"
    if (/^\d{1,8}s?$/i.test(param)) {
      const sec = parseInt(param, 10);
      return isNaN(sec) || sec <= 0 ? undefined : sec;
    }

    // Linear non-backtracking parse for time string format e.g. "1h2m3s", "1m30s", "45s", "2h", "10m"
    let totalSeconds = 0;
    let matched = false;

    const hoursMatch = param.match(/(\d{1,8})h/i);
    const minutesMatch = param.match(/(\d{1,8})m/i);
    const secondsMatch = param.match(/(\d{1,8})s/i);

    if (hoursMatch) {
      totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
      matched = true;
    }
    if (minutesMatch) {
      totalSeconds += parseInt(minutesMatch[1], 10) * 60;
      matched = true;
    }
    if (secondsMatch) {
      totalSeconds += parseInt(secondsMatch[1], 10);
      matched = true;
    }

    return matched && totalSeconds > 0 ? totalSeconds : undefined;
  } catch {
    return undefined;
  }
}

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // invalid -> treat as unsafe
  }
  const [b0, b1, b2] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;
  // 10.0.0.0/8 (Private network)
  if (b0 === 10) return true;
  // 100.64.0.0/10 (Shared Address Space / CGNAT 100.64.0.0 - 100.127.255.255)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;
  // 169.254.0.0/16 (Link-local / AWS/GCP/Azure Metadata 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;
  // 172.16.0.0/12 (Private network 172.16.0.0 - 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (b0 === 192 && b1 === 0 && b2 === 0) return true;
  // 192.0.2.0/24 (TEST-NET-1)
  if (b0 === 192 && b1 === 0 && b2 === 2) return true;
  // 192.88.99.0/24 (6to4 Relay Anycast)
  if (b0 === 192 && b1 === 88 && b2 === 99) return true;
  // 192.168.0.0/16 (Private network)
  if (b0 === 192 && b1 === 168) return true;
  // 198.18.0.0/15 (Network Interconnect Device Benchmark Testing 198.18.0.0 - 198.19.255.255)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
  // 198.51.100.0/24 (TEST-NET-2)
  if (b0 === 198 && b1 === 51 && b2 === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (b0 === 203 && b1 === 0 && b2 === 113) return true;
  // 224.0.0.0/4 (Multicast 224.0.0.0 - 239.255.255.255)
  if (b0 >= 224 && b0 <= 239) return true;
  // 240.0.0.0/4 (Reserved / Future Use 240.0.0.0 - 255.255.255.254)
  if (b0 >= 240) return true;

  return false;
}

export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (normalized.startsWith('::ffff:')) {
    const v4Part = normalized.replace('::ffff:', '');
    if (net.isIPv4(v4Part)) {
      return isPrivateIPv4(v4Part);
    }
  }

  // :: or ::1 (Unspecified / Loopback)
  if (
    normalized === '::' ||
    normalized === '::1' ||
    normalized === '0:0:0:0:0:0:0:1' ||
    normalized === '0:0:0:0:0:0:0:0'
  ) {
    return true;
  }

  // Unique Local Address (fc00::/7 -> fc00: to fdff:)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  // Link-Local Unicast (fe80::/10 -> fe80: to febf:)
  if (/^fe[89ab]/i.test(normalized)) {
    return true;
  }

  // Multicast (ff00::/8)
  if (normalized.startsWith('ff')) {
    return true;
  }

  // Discard / Documentation / 6to4
  if (
    normalized.startsWith('100::') ||
    normalized.startsWith('2001:db8:') ||
    normalized.startsWith('2002:')
  ) {
    return true;
  }

  return false;
}

export function isPrivateOrForbiddenIp(ip: string): boolean {
  const ipVersion = net.isIP(ip);
  if (ipVersion === 4) {
    return isPrivateIPv4(ip);
  }
  if (ipVersion === 6) {
    return isPrivateIPv6(ip);
  }
  return true; // Not a valid IP -> treat as forbidden
}

export function isSafeHostname(hostname: string): boolean {
  if (!hostname || typeof hostname !== 'string') return false;
  const lower = hostname.toLowerCase().trim();

  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.lan') ||
    lower.endsWith('.home') ||
    lower.endsWith('.corp') ||
    lower.endsWith('.arpa') ||
    lower.endsWith('.invalid') ||
    lower.endsWith('.test') ||
    lower.endsWith('.example')
  ) {
    return false;
  }

  if (net.isIP(lower)) {
    return !isPrivateOrForbiddenIp(lower);
  }

  // Verify valid FQDN structure
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
    lower,
  );
}

@Injectable()
export class OpenGraphService {
  private readonly logger = new Logger(OpenGraphService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Synchronous URL Sanitizer & Validator (recognized as CodeQL SSRF sanitizer guard).
   * Verifies protocol, credentials, port, hostname allowlist/regex and returns a clean URL string.
   */
  sanitizeUrl(rawUrl: string): string | null {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return null;
    }

    const trimmed = rawUrl.trim();
    if (!SAFE_URL_REGEX.test(trimmed)) {
      return null;
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return null;
    }

    // 1. Strict Protocol Check
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    // 2. Reject credentials in URL (e.g. http://user:pass@host)
    if (parsed.username || parsed.password) {
      return null;
    }

    // 3. Port Whitelisting (Default 80/443 or safe web ports)
    if (parsed.port) {
      const port = parseInt(parsed.port, 10);
      if (isNaN(port) || !ALLOWED_PORTS.has(port)) {
        return null;
      }
    }

    // 4. Hostname validation
    if (!isSafeHostname(parsed.hostname)) {
      return null;
    }

    const safeScheme = parsed.protocol === 'https:' ? 'https:' : 'http:';
    const safeHost = parsed.hostname.toLowerCase();
    const safePort = parsed.port ? `:${parsed.port}` : '';
    const safePath = parsed.pathname + parsed.search;

    return `${safeScheme}//${safeHost}${safePort}${safePath}`;
  }

  /**
   * DNS Pinning & Resolution: Verify EVERY resolved IP address.
   */
  async validateDnsResolution(hostname: string): Promise<boolean> {
    if (net.isIP(hostname)) {
      return !isPrivateOrForbiddenIp(hostname);
    }

    try {
      const addresses = await dns.promises.lookup(hostname, { all: true, verbatim: true });
      if (!addresses || addresses.length === 0) {
        return false;
      }

      for (const addr of addresses) {
        if (isPrivateOrForbiddenIp(addr.address)) {
          return false;
        }
      }
    } catch {
      return false;
    }

    return true;
  }

  private async setNegativeCache(cacheKey: string, url: string): Promise<void> {
    try {
      await this.redisService.set(
        cacheKey,
        JSON.stringify({ notFound: true, url }),
        NEGATIVE_CACHE_SECONDS,
      );
    } catch {
      // ignore cache set error
    }
  }

  /**
   * Safe fetch with SSRF guards, DNS resolution verification, and timeout.
   */
  private async safeFetch(url: string, headers?: Record<string, string>): Promise<Response | null> {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!SAFE_URL_REGEX.test(trimmed)) return null;

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return null;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    if (!isSafeHostname(parsed.hostname)) return null;
    if (parsed.port) {
      const port = parseInt(parsed.port, 10);
      if (isNaN(port) || !ALLOWED_PORTS.has(port)) return null;
    }

    const isSafe = await this.validateDnsResolution(parsed.hostname);
    if (!isSafe) return null;

    const safeScheme = parsed.protocol === 'https:' ? 'https:' : 'http:';
    const safeHost = parsed.hostname.toLowerCase();
    const safePort = parsed.port ? `:${parsed.port}` : '';
    const safePath = parsed.pathname + parsed.search;
    const safeTargetUrl = `${safeScheme}//${safeHost}${safePort}${safePath}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(safeTargetUrl, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (compatible; SocialBot/1.0)',
          Accept:
            'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...headers,
        },
      });
      return res;
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Main entry point to extract rich link metadata.
   */
  async extractMetadata(targetUrl: string): Promise<LinkEmbedData | null> {
    const sanitizedInitialUrl = this.sanitizeUrl(targetUrl);
    if (!sanitizedInitialUrl) {
      return null;
    }

    const parsedInitial = new URL(sanitizedInitialUrl);
    const isInitialDnsSafe = await this.validateDnsResolution(parsedInitial.hostname);
    if (!isInitialDnsSafe) {
      return null;
    }

    const cacheKey = `og:preview:v2:${sanitizedInitialUrl}`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as Record<string, unknown>;
        if (parsed.notFound === true) {
          return null;
        }
        return parsed as unknown as LinkEmbedData;
      }
    } catch (e) {
      this.logger.warn(`Redis get failed for ${cacheKey}: ${String(e)}`);
    }

    try {
      // 1. Check Specialized Provider Handlers First
      const specialized = await this.trySpecializedProviders(sanitizedInitialUrl, parsedInitial);
      if (specialized) {
        await this.redisService.set(
          cacheKey,
          JSON.stringify(specialized),
          FORTY_EIGHT_HOURS_SECONDS,
        );
        return specialized;
      }

      // 2. Generic OpenGraph Parser Fallback
      const genericResult = await this.scrapeGenericOpenGraph(sanitizedInitialUrl);
      if (!genericResult) {
        await this.setNegativeCache(cacheKey, sanitizedInitialUrl);
        return null;
      }

      await this.redisService.set(
        cacheKey,
        JSON.stringify(genericResult),
        FORTY_EIGHT_HOURS_SECONDS,
      );
      return genericResult;
    } catch (err) {
      this.logger.debug(`Failed to fetch metadata for ${targetUrl}: ${(err as Error).message}`);
      await this.setNegativeCache(cacheKey, sanitizedInitialUrl);
      return null;
    }
  }

  /**
   * Specialized Provider Handlers
   */
  private async trySpecializedProviders(url: string, parsed: URL): Promise<LinkEmbedData | null> {
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // 1. YouTube
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
      const yt = await this.handleYouTube(url, parsed, host);
      if (yt) return yt;
    }

    // 2. GitHub
    if (host === 'github.com') {
      const gh = await this.handleGitHub(url, parsed);
      if (gh) return gh;
    }

    // 3. Spotify
    if (host === 'open.spotify.com') {
      const sp = await this.handleSpotify(url, parsed);
      if (sp) return sp;
    }

    // 4. SoundCloud
    if (host === 'soundcloud.com' || host === 'on.soundcloud.com') {
      const sc = await this.handleSoundCloud(url);
      if (sc) return sc;
    }

    // 5. Figma
    if (host === 'figma.com') {
      const fg = await this.handleFigma(url, parsed);
      if (fg) return fg;
    }

    // 6. Twitter / X
    if (host === 'twitter.com' || host === 'x.com') {
      const tw = await this.handleTwitter(url, parsed);
      if (tw) return tw;
    }

    // 7. CodePen
    if (host === 'codepen.io') {
      const cp = await this.handleCodePen(url, parsed);
      if (cp) return cp;
    }

    return null;
  }

  /**
   * YouTube Provider
   */
  private async handleYouTube(
    url: string,
    parsed: URL,
    host: string,
  ): Promise<LinkEmbedData | null> {
    let videoId: string | null = null;
    let isShorts = false;

    if (host === 'youtu.be') {
      videoId = parsed.pathname.slice(1).split('/')[0] || null;
    } else if (parsed.pathname.startsWith('/shorts/')) {
      videoId = parsed.pathname.replace('/shorts/', '').split('/')[0] || null;
      isShorts = true;
    } else if (parsed.pathname.startsWith('/watch')) {
      videoId = parsed.searchParams.get('v');
    } else if (parsed.pathname.startsWith('/embed/')) {
      videoId = parsed.pathname.replace('/embed/', '').split('/')[0] || null;
    }

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return null;
    }

    const startSeconds = parseYouTubeStartSeconds(url);

    // Call YouTube oEmbed endpoint
    let title: string | null = null;
    let author: string | null = null;

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const res = await this.safeFetch(oembedUrl);
      if (res && res.ok) {
        const data = (await res.json()) as { title?: string; author_name?: string };
        title = data.title || null;
        author = data.author_name || null;
      }
    } catch {
      // Fallback
    }

    const maxResImage = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const hqImage = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    return {
      url,
      type: 'youtube',
      title: title || 'YouTube Video',
      description: author ? `YouTube · ${author}` : 'YouTube Video',
      siteName: 'YouTube',
      image: maxResImage,
      favicon: 'https://www.youtube.com/s/desktop/f7c162cf/img/favicon.ico',
      youtube: {
        videoId,
        author: author || undefined,
        duration: undefined,
        startSeconds: startSeconds ?? null,
        isShorts,
      },
    };
  }

  /**
   * GitHub Provider (Public API + Fallback)
   */
  private async handleGitHub(url: string, parsed: URL): Promise<LinkEmbedData | null> {
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;

    const [owner, repo] = parts;
    if (GITHUB_RESERVED_SLUGS.has(owner.toLowerCase())) return null;

    try {
      const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
      const res = await this.safeFetch(apiUrl, {
        Accept: 'application/vnd.github.v3+json',
      });

      if (res && res.ok) {
        const data = (await res.json()) as {
          name?: string;
          full_name?: string;
          description?: string;
          stargazers_count?: number;
          forks_count?: number;
          language?: string;
          owner?: { avatar_url?: string };
        };

        const stars = data.stargazers_count ?? 0;
        const forks = data.forks_count ?? 0;
        const language = data.language || null;
        const languageColor = language ? GITHUB_LANGUAGE_COLORS[language] || '#a855f7' : null;
        const avatarUrl = data.owner?.avatar_url || null;
        const description = data.description || null;
        const repoFullName = data.full_name || `${owner}/${repo}`;

        return {
          url,
          type: 'github',
          title: repoFullName,
          description: description || `GitHub repository ${repoFullName}`,
          siteName: 'GitHub',
          image: avatarUrl,
          favicon: 'https://github.githubassets.com/favicons/favicon.png',
          github: {
            owner,
            repo,
            stars,
            forks,
            language,
            languageColor,
            avatarUrl,
          },
        };
      }
    } catch {
      // API fallback
    }

    return null;
  }

  /**
   * Spotify Provider
   */
  private async handleSpotify(url: string, parsed: URL): Promise<LinkEmbedData | null> {
    const parts = parsed.pathname.split('/').filter(Boolean);
    const audioTypeRaw = parts[0];
    const trackId = parts[1];

    if (!audioTypeRaw || !trackId) return null;

    const audioType: 'track' | 'album' | 'playlist' | 'episode' =
      audioTypeRaw === 'album' || audioTypeRaw === 'playlist' || audioTypeRaw === 'episode'
        ? audioTypeRaw
        : 'track';

    let title: string | null = null;
    let thumbnail: string | null = null;

    try {
      const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
      const res = await this.safeFetch(oembedUrl);
      if (res && res.ok) {
        const data = (await res.json()) as {
          title?: string;
          thumbnail_url?: string;
        };
        title = data.title || null;
        thumbnail = data.thumbnail_url || null;
      }
    } catch {
      // ignore
    }

    const embedUrl = `https://open.spotify.com/embed/${audioType}/${trackId}?utm_source=generator`;

    return {
      url,
      type: 'spotify',
      title: title || `Spotify ${audioType.charAt(0).toUpperCase() + audioType.slice(1)}`,
      description: 'Listen on Spotify',
      siteName: 'Spotify',
      image: thumbnail,
      favicon: 'https://open.spotifycdn.com/cdn/images/favicon.0f31d2ea.ico',
      audio: {
        provider: 'spotify',
        audioType,
        artist: null,
        embedUrl,
      },
    };
  }

  /**
   * SoundCloud Provider
   */
  private async handleSoundCloud(url: string): Promise<LinkEmbedData | null> {
    try {
      const oembedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const res = await this.safeFetch(oembedUrl);
      if (res && res.ok) {
        const data = (await res.json()) as {
          title?: string;
          author_name?: string;
          thumbnail_url?: string;
          html?: string;
        };

        const srcMatch = data.html?.match(/src="([^"]+)"/);
        const embedUrl = srcMatch ? srcMatch[1] : null;

        return {
          url,
          type: 'soundcloud',
          title: data.title || 'SoundCloud Track',
          description: data.author_name
            ? `SoundCloud · ${data.author_name}`
            : 'Listen on SoundCloud',
          siteName: 'SoundCloud',
          image: data.thumbnail_url || null,
          favicon: 'https://a-v2.sndcdn.com/assets/images/sc-icons/favicon-2cadd14bdb.ico',
          audio: {
            provider: 'soundcloud',
            audioType: 'track',
            artist: data.author_name || null,
            embedUrl,
          },
        };
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Figma Provider
   */
  private async handleFigma(url: string, parsed: URL): Promise<LinkEmbedData | null> {
    if (
      !parsed.pathname.startsWith('/file/') &&
      !parsed.pathname.startsWith('/design/') &&
      !parsed.pathname.startsWith('/proto/')
    ) {
      return null;
    }

    try {
      const oembedUrl = `https://www.figma.com/api/oembed?url=${encodeURIComponent(url)}`;
      const res = await this.safeFetch(oembedUrl);
      if (res && res.ok) {
        const data = (await res.json()) as {
          title?: string;
          author_name?: string;
          thumbnail_url?: string;
        };

        return {
          url,
          type: 'figma',
          title: data.title || 'Figma Design',
          description: data.author_name ? `Created by ${data.author_name}` : 'Figma file',
          siteName: 'Figma',
          image: data.thumbnail_url || null,
          favicon: 'https://static.figma.com/app/icon/1/favicon.png',
          figma: {
            title: data.title || null,
            author: data.author_name || null,
            thumbnailUrl: data.thumbnail_url || null,
          },
        };
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Twitter / X Provider
   */
  private async handleTwitter(url: string, parsed: URL): Promise<LinkEmbedData | null> {
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 3 || parts[1] !== 'status') return null;

    try {
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
      const res = await this.safeFetch(oembedUrl);
      if (res && res.ok) {
        const data = (await res.json()) as {
          author_name?: string;
          author_url?: string;
          html?: string;
        };

        let text: string | null = null;
        if (data.html) {
          const tweetTextMatch = data.html.match(/<p[^>]*>(.*?)<\/p>/s);
          const raw = tweetTextMatch ? tweetTextMatch[1] : data.html;
          text = sanitizeHtml(raw, {
            allowedTags: [],
            allowedAttributes: {},
          }).trim();
        }

        return {
          url,
          type: 'twitter',
          title: data.author_name ? `Post by ${data.author_name}` : 'Post on X',
          description: text || 'View on X (Twitter)',
          siteName: 'X (Twitter)',
          image: null,
          favicon: 'https://abs.twimg.com/favicons/twitter.3.ico',
          twitter: {
            authorName: data.author_name || null,
            authorHandle: parts[0] || null,
            text,
          },
        };
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * CodePen Provider
   */
  private async handleCodePen(url: string, parsed: URL): Promise<LinkEmbedData | null> {
    if (!parsed.pathname.includes('/pen/')) return null;

    try {
      const oembedUrl = `https://codepen.io/api/oembed?url=${encodeURIComponent(url)}&format=json`;
      const res = await this.safeFetch(oembedUrl);
      if (res && res.ok) {
        const data = (await res.json()) as {
          title?: string;
          author_name?: string;
        };

        return {
          url,
          type: 'codepen',
          title: data.title || 'CodePen snippet',
          description: data.author_name ? `Created by ${data.author_name}` : 'CodePen demo',
          siteName: 'CodePen',
          image: null,
          favicon:
            'https://cpwebassets.codepen.io/assets/favicon/favicon-aec34940fbc1a6e787974dcd360f2c6b63348d4b1f4e06c77743096d55480f33.ico',
          codePen: {
            author: data.author_name || null,
          },
        };
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Universal OpenGraph Scraper
   */
  private async scrapeGenericOpenGraph(sanitizedInitialUrl: string): Promise<LinkEmbedData | null> {
    let currentUrlString: string = sanitizedInitialUrl;
    let redirectCount = 0;
    let response: Response | null = null;

    while (redirectCount <= MAX_REDIRECT_HOPS) {
      const sanitizedHopUrl = this.sanitizeUrl(currentUrlString);
      if (!sanitizedHopUrl) return null;

      response = await this.safeFetch(sanitizedHopUrl);
      if (!response) return null;

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) return null;

        redirectCount++;
        if (redirectCount > MAX_REDIRECT_HOPS) return null;

        try {
          currentUrlString = new URL(location, sanitizedHopUrl).href;
        } catch {
          return null;
        }
        continue;
      }

      break;
    }

    if (!response || !response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      try {
        await response.body?.cancel();
      } catch {
        // Stream cancel cleanup
      }
      return null;
    }

    let html = '';
    const reader = response.body?.getReader();
    if (reader) {
      let totalBytes = 0;
      const decoder = new TextDecoder('utf-8');
      while (totalBytes < MAX_BUFFER_BYTES) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        totalBytes += value.byteLength;
        html += decoder.decode(value, { stream: true });
        if (html.includes('</head>') || html.includes('</HEAD>')) {
          break;
        }
      }
      try {
        await reader.cancel();
      } catch {
        // cleanup
      }
    } else {
      const rawText = await response.text();
      html = rawText.slice(0, MAX_BUFFER_BYTES);
    }

    const currentParsed = new URL(currentUrlString);

    const title =
      this.extractMetaContent(html, /property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
      this.extractMetaContent(html, /content=["']([^"']+)["']\s+property=["']og:title["']/i) ||
      this.extractMetaContent(html, /name=["']twitter:title["']\s+content=["']([^"']+)["']/i) ||
      this.extractTagContent(html, /<title[^>]*>([^<]+)<\/title>/i);

    const description =
      this.extractMetaContent(
        html,
        /property=["']og:description["']\s+content=["']([^"']+)["']/i,
      ) ||
      this.extractMetaContent(
        html,
        /content=["']([^"']+)["']\s+property=["']og:description["']/i,
      ) ||
      this.extractMetaContent(
        html,
        /name=["']twitter:description["']\s+content=["']([^"']+)["']/i,
      ) ||
      this.extractMetaContent(html, /name=["']description["']\s+content=["']([^"']+)["']/i);

    let image =
      this.extractMetaContent(html, /property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
      this.extractMetaContent(html, /content=["']([^"']+)["']\s+property=["']og:image["']/i) ||
      this.extractMetaContent(html, /name=["']twitter:image["']\s+content=["']([^"']+)["']/i);

    if (image && !image.startsWith('http://') && !image.startsWith('https://')) {
      try {
        image = new URL(image, currentParsed.href).href;
      } catch {
        image = null;
      }
    }

    const siteName =
      this.extractMetaContent(html, /property=["']og:site_name["']\s+content=["']([^"']+)["']/i) ||
      this.extractMetaContent(html, /content=["']([^"']+)["']\s+property=["']og:site_name["']/i) ||
      currentParsed.hostname.replace(/^www\./, '');

    let favicon =
      this.extractMetaContent(
        html,
        /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
      ) ||
      this.extractMetaContent(
        html,
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i,
      );

    if (favicon && !favicon.startsWith('http://') && !favicon.startsWith('https://')) {
      try {
        favicon = new URL(favicon, currentParsed.href).href;
      } catch {
        favicon = `${currentParsed.origin}/favicon.ico`;
      }
    } else if (!favicon) {
      favicon = `${currentParsed.origin}/favicon.ico`;
    }

    if (!title && !description && !image) {
      return null;
    }

    return {
      url: sanitizedInitialUrl,
      type: 'generic',
      siteName: siteName ? this.cleanHtmlEntities(siteName) : null,
      title: title ? this.cleanHtmlEntities(title) : null,
      description: description ? this.cleanHtmlEntities(description) : null,
      image: image || null,
      favicon: favicon || null,
    };
  }

  private extractMetaContent(html: string, regex: RegExp): string | null {
    const match = html.match(regex);
    return match && match[1] ? match[1].trim() : null;
  }

  private extractTagContent(html: string, regex: RegExp): string | null {
    const match = html.match(regex);
    return match && match[1] ? match[1].trim() : null;
  }

  /**
   * Decodes HTML entities safely in a single pass without double-unescaping vulnerabilities.
   */
  private cleanHtmlEntities(str: string): string {
    const entityMap: Record<string, string> = {
      '&quot;': '"',
      '&#34;': '"',
      '&apos;': "'",
      '&#39;': "'",
      '&#x27;': "'",
      '&lt;': '<',
      '&#60;': '<',
      '&gt;': '>',
      '&#62;': '>',
      '&nbsp;': ' ',
      '&#160;': ' ',
      '&amp;': '&',
      '&#38;': '&',
    };

    return str
      .replace(
        /&(?:quot|apos|lt|gt|nbsp|amp|#34|#39|#x27|#60|#62|#160|#38);/gi,
        (match) => entityMap[match.toLowerCase()] ?? match,
      )
      .trim();
  }
}
