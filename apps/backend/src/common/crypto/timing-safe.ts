import * as crypto from 'node:crypto';

/**
 * Constant-time comparison for strings or buffers to prevent timing attacks.
 *
 * Traditional comparisons (e.g. `a === b` or checking `a.length === b.length` first)
 * leak secret information through byte-by-byte early return or length-dependent execution times.
 *
 * This implementation hashes both inputs with SHA-256 to guarantee identical 32-byte
 * buffer lengths, eliminating length leakage and avoiding RangeError on length mismatch,
 * then evaluates `crypto.timingSafeEqual`.
 */
export function timingSafeEqual(
  a: string | Buffer | null | undefined,
  b: string | Buffer | null | undefined,
): boolean {
  if (a == null || b == null) {
    return false;
  }

  const bufA = typeof a === 'string' ? Buffer.from(a, 'utf8') : a;
  const bufB = typeof b === 'string' ? Buffer.from(b, 'utf8') : b;

  const hashA = crypto.createHash('sha256').update(bufA).digest();
  const hashB = crypto.createHash('sha256').update(bufB).digest();

  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Constant-time comparison for Buffers of known identical lengths.
 * If buffer lengths differ, safely executes a dummy timingSafeEqual to avoid timing discrepancy.
 */
export function timingSafeBufferEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    // Perform dummy timingSafeEqual of matching length to avoid timing branch leakage
    const dummy = Buffer.alloc(a.length);
    crypto.timingSafeEqual(a, dummy);
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}
