import { describe, it, expect, beforeEach } from 'vitest';
import { E2eeCryptoManager } from '../e2ee';

// NOTE: isolated file on purpose — e2ee.ts keeps a module-level in-memory
// identity fallback, so the legacy seed below must be the FIRST init() in
// this module registry; otherwise a memory hit would shadow the migration.
const hasSubtle = typeof window !== 'undefined' && Boolean(window.crypto?.subtle);

describe.runIf(hasSubtle)('E2EE legacy localStorage migration (M1)', () => {
  // Legacy contract (pre-M1): extractable JWK under these keys.
  const LEGACY_PRIV = 'e2ee_private_key_jwk';
  const LEGACY_PUB = 'e2ee_public_key_spki';

  function toB64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return window.btoa(binary);
  }

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('preserves identity, wipes the extractable copy', async () => {
    const subtle = window.crypto.subtle;
    const legacy = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveKey',
      'deriveBits',
    ]);
    const legacySpki = toB64(await subtle.exportKey('spki', legacy.publicKey));
    window.localStorage.setItem(
      LEGACY_PRIV,
      JSON.stringify(await subtle.exportKey('jwk', legacy.privateKey)),
    );
    window.localStorage.setItem(LEGACY_PUB, legacySpki);

    const { publicKeySpki } = await new E2eeCryptoManager().init();

    // Same identity — peers see no rotation.
    expect(publicKeySpki).toBe(legacySpki);
    // Extractable private copy destroyed.
    expect(window.localStorage.getItem(LEGACY_PRIV)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_PUB)).toBeNull();
  });
});
