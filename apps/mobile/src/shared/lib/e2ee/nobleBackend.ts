import { gcm } from '@noble/ciphers/aes';
import { p256 } from '@noble/curves/p256';
import {
  E2eeOperationError,
  p256SpkiFromUncompressed,
  p256UncompressedFromSpki,
  type E2eeBackend,
} from '@social-network/shared-crypto';

/** Symmetric key handle for the pure-JS backend (an object, so it can be cached by reference). */
export interface RawAesKey {
  readonly raw: Uint8Array<ArrayBuffer>;
}

const toBuffer = (bytes: Uint8Array): Uint8Array<ArrayBuffer> => new Uint8Array(bytes);

export function generatePrivateKey(randomBytes: (length: number) => Uint8Array): Uint8Array {
  for (;;) {
    const candidate = randomBytes(32);
    if (p256.utils.isValidPrivateKey(candidate)) return candidate;
  }
}

export function publicSpkiFromPrivate(privateKey: Uint8Array): string {
  return p256SpkiFromUncompressed(p256.getPublicKey(privateKey, false));
}

/**
 * Pure-JS backend (Hermes has no WebCrypto). Matches WebCrypto bit for bit:
 * the AES key is the raw ECDH x coordinate, GCM output is ciphertext || tag.
 */
export function createNobleBackend(
  getPrivateKey: () => Promise<Uint8Array>,
  randomBytes: (length: number) => Uint8Array,
): E2eeBackend<RawAesKey> {
  return {
    async deriveSharedKey(peerPublicKeySpki) {
      const peer = p256UncompressedFromSpki(peerPublicKeySpki);
      p256.ProjectivePoint.fromHex(peer).assertValidity();
      const shared = p256.getSharedSecret(await getPrivateKey(), peer, true);
      return { raw: toBuffer(shared.slice(1, 33)) };
    },
    async importContentKey(raw) {
      if (raw.length !== 32) throw new E2eeOperationError('Invalid AES-256 key length');
      return { raw: toBuffer(raw) };
    },
    async encrypt(key, iv, plaintext, aad) {
      return toBuffer(gcm(key.raw, iv, aad).encrypt(plaintext));
    },
    async decrypt(key, iv, ciphertext, aad) {
      try {
        return toBuffer(gcm(key.raw, iv, aad).decrypt(ciphertext));
      } catch {
        throw new E2eeOperationError();
      }
    },
    randomBytes(length) {
      return toBuffer(randomBytes(length));
    },
  };
}
