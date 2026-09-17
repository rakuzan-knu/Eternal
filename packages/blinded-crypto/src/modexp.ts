/**
 * Modular exponentiation over BigInt.
 *
 *  - modPowBinary: textbook square-and-multiply. Bit-identical to the legacy
 *    backend loop; kept as the executable reference for cross-checking.
 *  - modPow: 4-bit sliding-window exponentiation (~25-35% fewer multiplications
 *    than binary on 2048-bit exponents). Default for sign/verify.
 *
 * Both are variable-time BigInt arithmetic (language limitation, documented):
 * for side-channel hardening use the Rust backend (num-bigint Montgomery
 * modpow) loaded by @social-network/native.
 */

import { BlindedCryptoError } from './errors';

const WINDOW_BITS = 4;
const WINDOW_SIZE = 1 << (WINDOW_BITS - 1); // 8 odd powers

export function modPowBinary(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  let result = 1n;
  let b = ((base % mod) + mod) % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    e >>= 1n;
    b = (b * b) % mod;
  }
  return result;
}

export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  if (exp < 0n) throw new BlindedCryptoError('INVALID_EXPONENT', 'negative exponent');
  // Small exponents (ticket verification with e=65537 and below): the window
  // table costs more than it saves — binary loop is optimal there.
  if (exp < 18446744073709551616n) return modPowBinary(base, exp, mod);
  const m = mod < 0n ? -mod : mod;
  if (m === 0n) throw new BlindedCryptoError('INVALID_MODULUS', 'zero modulus');
  const b = ((base % m) + m) % m;
  if (exp === 0n) return 1n % m;

  // Precompute odd powers b^1, b^3, ..., b^15.
  const table = new Array<bigint>(WINDOW_SIZE);
  const b2 = (b * b) % m;
  let acc = b;
  for (let k = 0; k < WINDOW_SIZE; k++) {
    table[k] = acc;
    acc = (acc * b2) % m;
  }

  const bits = exp.toString(2);
  let result = 1n;
  let i = 0;
  while (i < bits.length) {
    if (bits[i] === '0') {
      result = (result * result) % m;
      i++;
      continue;
    }
    // Take the longest odd window (up to 4 bits) starting here.
    let win = Math.min(WINDOW_BITS, bits.length - i);
    while (win > 1 && bits[i + win - 1] === '0') win--;
    let value = 0;
    for (let k = 0; k < win; k++) value = (value << 1) | (bits[i + k] === '1' ? 1 : 0);
    for (let k = 0; k < win; k++) result = (result * result) % m;
    result = (result * table[(value - 1) >> 1]) % m;
    i += win;
  }
  return result;
}

const HEX_RE = /^[0-9a-fA-F]*$/;

/** Strict hex parse. Throws BlindedCryptoError on garbage. */
export function hexToBigInt(hex: string, field: string): bigint {
  if (typeof hex !== 'string' || hex.length === 0) {
    throw new BlindedCryptoError('EMPTY_INPUT', field);
  }
  const clean = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;
  if (clean.length === 0 || !HEX_RE.test(clean)) {
    throw new BlindedCryptoError('INVALID_MESSAGE', `${field} is not hex`);
  }
  return BigInt(`0x${clean}`);
}

/** Canonical hex: lowercase, even length, no 0x prefix. */
export function bigIntToHex(value: bigint): string {
  const negative = value < 0n;
  const raw = (negative ? -value : value).toString(16);
  const even = raw.length % 2 === 0 ? raw : `0${raw}`;
  return negative ? `-${even}` : even;
}
