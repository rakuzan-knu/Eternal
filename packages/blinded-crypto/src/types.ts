/**
 * Portable blinded-crypto v1 types. Hex strings (lowercase, no 0x) at the
 * boundary, bigint inside. No Buffer, no Node APIs.
 */

export interface SignInput {
  /** RSA modulus n, hex. */
  readonly nHex: string;
  /** Private exponent d, hex. */
  readonly dHex: string;
  /** Blinded message m', hex. Must satisfy 0 <= m' < n. */
  readonly blindedHex: string;
}

export interface VerifyInput {
  /** RSA modulus n, hex. */
  readonly nHex: string;
  /** Public exponent e, hex. */
  readonly eHex: string;
  /** Unblinded ticket m, hex. */
  readonly ticketHex: string;
  /** Signature s, hex. */
  readonly signatureHex: string;
}
