/**
 * Public surface of @social-network/blinded-crypto.
 *
 * Portable entry point: Node.js, browsers, React Native / Hermes (BigInt is
 * ES2020). No Node.js APIs, no env access. The optional Rust accelerator
 * (num-bigint Montgomery modpow) is loaded by @social-network/native.
 */

export { BlindedCryptoError } from './errors';
export type { BlindedCryptoErrorCode } from './errors';
export type { SignInput, VerifyInput } from './types';
export { bigIntToHex, hexToBigInt, modPow, modPowBinary } from './modexp';
export { signBlinded, verifyTicket } from './blind';
