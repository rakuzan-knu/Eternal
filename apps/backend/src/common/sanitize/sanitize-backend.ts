import sanitizeHtmlLib from 'sanitize-html';
import { sanitizeText as pipelineSanitizeText } from '@social-network/text-pipeline';

export type SanitizeBackend = 'legacy' | 'pipeline';

/**
 * Strip-all-tags backend selector. Default is the audited sanitize-html;
 * SANITIZE_BACKEND=pipeline dark-launches the portable core behind the same
 * signature. Flip only after the differential fuzz spec passes on production
 * traffic samples (see __tests__/sanitize-backend.spec.ts).
 */
export function resolveSanitizeBackend(): SanitizeBackend {
  const envBackend =
    typeof process !== 'undefined' && process?.env?.SANITIZE_BACKEND
      ? process.env.SANITIZE_BACKEND
      : '';
  return envBackend.trim().toLowerCase() === 'pipeline' ? 'pipeline' : 'legacy';
}

/**
 * Strip-all-tags sanitizer for contracts and embeds. Non-strings pass
 * through untouched (zod transforms rely on this).
 */
export function sanitizeField(value: unknown, maxLength = 10_000): unknown {
  if (typeof value !== 'string') return value;
  const isBrowser = typeof (globalThis as { window?: unknown }).window !== 'undefined';
  if (isBrowser || resolveSanitizeBackend() === 'pipeline') {
    return pipelineSanitizeText(value, maxLength);
  }
  return sanitizeHtmlLib(value, { allowedTags: [], allowedAttributes: {} }).trim();
}
