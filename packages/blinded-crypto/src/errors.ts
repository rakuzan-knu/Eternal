/**
 * Stable, machine-readable crypto failure reasons. Never rename — they are
 * logged and metered at call sites.
 */
export type BlindedCryptoErrorCode =
  'INVALID_MODULUS' | 'INVALID_EXPONENT' | 'INVALID_MESSAGE' | 'EMPTY_INPUT';

export class BlindedCryptoError extends Error {
  public readonly code: BlindedCryptoErrorCode;

  public constructor(code: BlindedCryptoErrorCode, detail?: string) {
    super(detail !== undefined ? `blinded-crypto: ${code}: ${detail}` : `blinded-crypto: ${code}`);
    this.name = 'BlindedCryptoError';
    this.code = code;
  }

  public static isBlindedCryptoError(value: unknown): value is BlindedCryptoError {
    return value instanceof BlindedCryptoError;
  }
}
