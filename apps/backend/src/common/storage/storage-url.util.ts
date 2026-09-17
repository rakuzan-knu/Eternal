/**
 * Security and URL validation utilities for S3 / Cloudflare R2 storage endpoints.
 * Enforces WHATWG URL hostname validation against incomplete URL substring sanitization (CWE-20).
 */

export function isR2Endpoint(endpoint?: string | null): boolean {
  if (!endpoint || typeof endpoint !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(endpoint);
    const host = parsed.hostname.toLowerCase();
    return host === 'r2.cloudflarestorage.com' || host.endsWith('.r2.cloudflarestorage.com');
  } catch {
    return false;
  }
}

export function isCloudflareStorageDomain(urlStr?: string | null): boolean {
  if (!urlStr || typeof urlStr !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'r2.cloudflarestorage.com' ||
      host.endsWith('.r2.cloudflarestorage.com') ||
      host === 'cloudflarestorage.com' ||
      host.endsWith('.cloudflarestorage.com') ||
      host === 'r2.dev' ||
      host.endsWith('.r2.dev')
    );
  } catch {
    return false;
  }
}
