/**
 * CDN Media Resolution Utility for Eternal
 * Ensures all media files, user avatars, banners, and social graph images
 * resolve to fully-qualified absolute HTTPS URLs (Discord / Telegram standard).
 */

export const CDN_BASE_URL =
  (typeof process !== 'undefined' && process.env?.VITE_CDN_URL) ||
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_CDN_URL) ||
  'https://eternalnet.vercel.app';

export const APP_BASE_URL =
  (typeof process !== 'undefined' && process.env?.VITE_SITE_URL) ||
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_SITE_URL) ||
  'https://eternalnet.vercel.app';

export const DEFAULT_AVATAR_URL = `${CDN_BASE_URL}/avatars/default-avatar.svg`;
export const DEFAULT_BANNER_URL = `${CDN_BASE_URL}/banners/default-banner.jpg`;
export const DEFAULT_OG_IMAGE_URL = `${APP_BASE_URL}/images/shared/EternalBanner.png`;

/**
 * Converts any relative or root-relative media path into an absolute CDN URL.
 * Preserves already fully-qualified URLs (http:// or https://).
 *
 * @param path - e.g. "/avatars/u123.png", "uploads/p456.jpg", "https://eternalnet.vercel.app/images/shared/EternalBanner.png"
 * @param fallback - fallback image URL if path is null or empty
 */
export function getCdnUrl(path?: string | null, fallback: string = DEFAULT_OG_IMAGE_URL): string {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return fallback;
  }

  const clean = path.trim();

  // Already absolute URL
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  // Protocol-relative URL
  if (clean.startsWith('//')) {
    return `https:${clean}`;
  }

  // Local/Data URI or blob
  if (clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }

  // Root-relative path (/uploads/... or /avatars/...)
  const normalizedPath = clean.startsWith('/') ? clean : `/${clean}`;

  // If pointing to public static image assets, host on APP_BASE_URL or CDN
  if (
    normalizedPath.startsWith('/images/') ||
    normalizedPath.startsWith('/icons/') ||
    normalizedPath === '/favicon.svg' ||
    normalizedPath === '/favicon.ico'
  ) {
    return `${APP_BASE_URL}${normalizedPath}`;
  }

  return `${CDN_BASE_URL}${normalizedPath}`;
}

/**
 * Resolves user avatar to absolute HTTPS CDN URL
 */
export function getAvatarCdnUrl(avatarPath?: string | null): string {
  return getCdnUrl(avatarPath, DEFAULT_AVATAR_URL);
}

/**
 * Resolves user banner to absolute HTTPS CDN URL
 */
export function getBannerCdnUrl(bannerPath?: string | null): string {
  return getCdnUrl(bannerPath, DEFAULT_BANNER_URL);
}

/**
 * Guarantees an absolute HTTPS URL on the main domain (e.g. for canonicals, sitemaps, OpenGraph URLs)
 */
export function toAbsoluteAppUrl(path?: string | null): string {
  if (!path || typeof path !== 'string') return APP_BASE_URL;
  const clean = path.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  if (clean.startsWith('//')) return `https:${clean}`;
  return `${APP_BASE_URL}${clean.startsWith('/') ? clean : `/${clean}`}`;
}
