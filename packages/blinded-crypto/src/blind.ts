/**
 * Blind-signature primitives over RSA modpow.
 *
 *  - signBlinded: s' = (m')^d mod n. The server never sees m.
 *  - verifyTicket: accepts iff s^e mod n === m.
 *
 * Hex in/out (canonical lowercase, even length). Range-checked: messages must
 * satisfy 0 <= m < n, modulus must be > 1.
 */

import { BlindedCryptoError } from './errors';
import { bigIntToHex, hexToBigInt, modPow } from './modexp';
import type { SignInput, VerifyInput } from './types';

function parseModulus(nHex: string): bigint {
  const n = hexToBigInt(nHex, 'n');
  if (n <= 1n) throw new BlindedCryptoError('INVALID_MODULUS', 'modulus must be > 1');
  return n;
}

function parseMessage(mHex: string, n: bigint, field: string): bigint {
  const m = hexToBigInt(mHex, field);
  if (m < 0n || m >= n) {
    throw new BlindedCryptoError('INVALID_MESSAGE', `${field} out of range [0, n)`);
  }
  return m;
}

export function signBlinded(input: SignInput): string {
  const n = parseModulus(input.nHex);
  const d = hexToBigInt(input.dHex, 'd');
  if (d <= 0n) throw new BlindedCryptoError('INVALID_EXPONENT', 'd must be > 0');
  const mPrime = parseMessage(input.blindedHex, n, 'blinded');
  return bigIntToHex(modPow(mPrime, d, n));
}

export function verifyTicket(input: VerifyInput): boolean {
  try {
    const n = parseModulus(input.nHex);
    const e = hexToBigInt(input.eHex, 'e');
    if (e <= 0n) return false;
    const m = hexToBigInt(input.ticketHex, 'ticket');
    const s = hexToBigInt(input.signatureHex, 'signature');
    if (m < 0n || m >= n || s < 0n || s >= n) return false;
    return modPow(s, e, n) === m;
  } catch {
    return false;
  }
}
