/**
 * Security utilities for integration platforms.
 * Provides strict allowlisting, safe property assignment/deletion to prevent
 * remote property injection and prototype pollution, as well as HTML escaping for XSS prevention.
 */

export const SUPPORTED_PLATFORMS: ReadonlySet<string> = new Set([
  'steam',
  'github',
  'spotify',
  'soundcloud',
  'youtube',
  'twitch',
  'roblox',
  'riot',
  'battlenet',
  'x',
  'twitter',
  'facebook',
  'epicgames',
  'epic',
  'discord',
  'telegram',
  'vk',
  'instagram',
  'tiktok',
  'reddit',
  'kick',
]);

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isSupportedPlatform(platform: unknown): platform is string {
  if (typeof platform !== 'string') return false;
  const p = platform.trim().toLowerCase();
  return SUPPORTED_PLATFORMS.has(p) && !DANGEROUS_KEYS.has(p);
}

/**
 * Safely writes platform data to connectedAccounts dictionary without
 * remote property injection or prototype pollution vulnerabilities.
 * Keys written are guaranteed to originate from the hardcoded SUPPORTED_PLATFORMS set.
 */
export function assignPlatformData(
  target: Record<string, any> | null | undefined,
  platform: string,
  data: any,
): Record<string, any> {
  const result: Record<string, any> = {};
  const safePlatform = platform.trim().toLowerCase();

  // Copy existing valid platform entries
  if (target && typeof target === 'object') {
    for (const [key, value] of Object.entries(target)) {
      if (SUPPORTED_PLATFORMS.has(key) && !DANGEROUS_KEYS.has(key)) {
        result[key] = value;
      }
    }
  }

  // Assign using literal element from SUPPORTED_PLATFORMS allowlist
  for (const allowed of SUPPORTED_PLATFORMS) {
    if (allowed === safePlatform) {
      result[allowed] = data;
      break;
    }
  }

  return result;
}

/**
 * Safely removes a platform from connectedAccounts dictionary without
 * dynamic property deletion or index tampering.
 */
export function removePlatformData(
  target: Record<string, any> | null | undefined,
  platform: string,
): Record<string, any> {
  const result: Record<string, any> = {};
  const safePlatform = platform.trim().toLowerCase();

  if (target && typeof target === 'object') {
    for (const [key, value] of Object.entries(target)) {
      if (key !== safePlatform && SUPPORTED_PLATFORMS.has(key) && !DANGEROUS_KEYS.has(key)) {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * HTML entity escaper for preventing Reflected XSS and exception text reinterpretation.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str =
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint'
        ? value.toString()
        : typeof value === 'object'
          ? JSON.stringify(value)
          : '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
