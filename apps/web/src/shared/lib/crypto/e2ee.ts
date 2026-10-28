/**
 * Client-Side End-to-End Encryption (E2EE) Module
 *
 * Implemented with the standard Web Cryptography API (window.crypto.subtle):
 * - Key Exchange: ECDH (P-256 / prime256v1)
 * - Message Encryption: AES-GCM (256-bit) with unique cryptographically random IV per message
 *
 * The backend never has access to the private keys and only sees the ciphertext payload,
 * ensuring 100% confidentiality and zero server-side decryption overhead.
 */

import {
  E2eeProtocol,
  bytesToBase64,
  createWebCryptoBackend,
  isEncryptedEnvelope,
  type DeviceKeyRef,
  type MessageAad,
} from '@social-network/shared-crypto';

export {
  E2EE_MAX_ENVELOPE_CHARS,
  encodeMessageAad,
  parseEnvelope,
  type DeviceKeyRef,
  type E2eeV1Payload,
  type E2eeV2Payload,
  type E2eeV3Payload,
  type MessageAad,
  type ParsedEnvelope,
  type WrappedContentKey,
} from '@social-network/shared-crypto';

const STORAGE_KEY_PRIV = 'e2ee_private_key_jwk';
const STORAGE_KEY_PUB = 'e2ee_public_key_spki';

const IDB_NAME = 'e2ee-msg-identity';
const IDB_STORE = 'keys';
const IDB_RECORD = 'identity-v1';

/** In-memory fallback for runtimes without IndexedDB (SSR, jsdom tests, rare private modes). */
const memoryKeyStore = new Map<string, CryptoKeyPair>();

function openIdentityDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this runtime'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function idbLoad(db: IDBDatabase): Promise<CryptoKeyPair | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_RECORD);
    req.onsuccess = () => resolve(req.result as CryptoKeyPair | undefined);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
  });
}

function idbSave(db: IDBDatabase, pair: CryptoKeyPair): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(pair, IDB_RECORD);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
  });
}

/** SHA-256 hex of UTF-8 text (replay-store message fingerprints). */
export async function sha256HexText(text: string): Promise<string> {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export class E2eeCryptoManager {
  private keyPair: CryptoKeyPair | null = null;
  private publicSpkiBase64: string | null = null;
  private readonly protocol = new E2eeProtocol(
    createWebCryptoBackend(
      async () => {
        if (!this.keyPair) await this.init();
        return this.keyPair!.privateKey;
      },
      () => window.crypto,
    ),
  );

  /**
   * Initializes or restores the client E2EE ECDH keypair.
   *
   * Storage ladder (first hit wins):
   *  1. In-memory instance (already initialized).
   *  2. IndexedDB, non-extractable (the steady state — XSS cannot export it).
   *  3. Legacy localStorage JWK (extractable): re-imported as NON-extractable
   *     (identity preserved, no rotation), then the localStorage copy is
   *     wiped to close the exfiltration window (M1 migration).
   *  4. Fresh non-extractable generation.
   * Runtimes without IndexedDB (SSR/tests) fall back to process memory and
   * warn once — keys then live only for the session.
   */
  async init(): Promise<{ publicKeySpki: string }> {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      throw new Error('Web Cryptography API is not available in this environment');
    }
    if (this.keyPair && this.publicSpkiBase64) {
      return { publicKeySpki: this.publicSpkiBase64 };
    }

    const memoryHit = memoryKeyStore.get(IDB_RECORD);
    if (memoryHit) {
      this.keyPair = memoryHit;
      this.publicSpkiBase64 = await this.exportSpki(memoryHit.publicKey);
      return { publicKeySpki: this.publicSpkiBase64 };
    }

    try {
      const db = await openIdentityDb();
      try {
        const stored = await idbLoad(db);
        if (stored?.publicKey && stored?.privateKey) {
          this.keyPair = stored;
          this.publicSpkiBase64 = await this.exportSpki(stored.publicKey);
          return { publicKeySpki: this.publicSpkiBase64 };
        }
      } finally {
        db.close();
      }
    } catch {
      // No IndexedDB — continue down the ladder.
    }

    const migrated = await this.migrateLegacyLocalStorage();
    if (migrated) return migrated;

    const fresh = await window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveKey', 'deriveBits'],
    );
    await this.persistPair(fresh);
    this.keyPair = fresh;
    this.publicSpkiBase64 = await this.exportSpki(fresh.publicKey);
    return { publicKeySpki: this.publicSpkiBase64 };
  }

  private async exportSpki(publicKey: CryptoKey): Promise<string> {
    const exportedSpki = await window.crypto.subtle.exportKey('spki', publicKey);
    return bytesToBase64(new Uint8Array(exportedSpki));
  }

  private async persistPair(pair: CryptoKeyPair): Promise<void> {
    try {
      const db = await openIdentityDb();
      try {
        await idbSave(db, pair);
        return;
      } finally {
        db.close();
      }
    } catch {
      if (!memoryKeyStore.has(IDB_RECORD)) {
        console.warn('[e2ee] IndexedDB unavailable — identity key lives in memory only');
      }
      memoryKeyStore.set(IDB_RECORD, pair);
    }
  }

  /**
   * M1 migration: legacy extractable JWK in localStorage is re-imported as
   * non-extractable (same identity, no rotation, peers unaffected), then the
   * localStorage private copy is destroyed. Returns null when no legacy key.
   */
  private async migrateLegacyLocalStorage(): Promise<{ publicKeySpki: string } | null> {
    let storedPriv: string | null = null;
    try {
      storedPriv = localStorage.getItem(STORAGE_KEY_PRIV);
    } catch {
      return null;
    }
    if (!storedPriv) return null;
    try {
      const jwk = JSON.parse(storedPriv) as JsonWebKey;
      const privateKey = await window.crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        false, // non-extractable from here on — closes the exfiltration hole
        ['deriveKey', 'deriveBits'],
      );
      // Rebuild the public half from x/y only (never trusts stored SPKI).
      const { d: _d, dp: _dp, dq: _dq, q: _q, qi: _qi, ...publicJwk } = jwk;
      const publicKey = await window.crypto.subtle.importKey(
        'jwk',
        { ...publicJwk, key_ops: [] },
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        [],
      );
      const pair = { privateKey, publicKey };
      await this.persistPair(pair);
      this.keyPair = pair;
      this.publicSpkiBase64 = await this.exportSpki(publicKey);
      try {
        localStorage.removeItem(STORAGE_KEY_PRIV);
        localStorage.removeItem(STORAGE_KEY_PUB);
      } catch {
        // Removal is best-effort; the key material itself already moved.
      }
      return { publicKeySpki: this.publicSpkiBase64 };
    } catch {
      // Corrupt legacy copy: fall through to fresh generation (rotates identity).
      return null;
    }
  }

  getPublicKeySpki(): string | null {
    return this.publicSpkiBase64;
  }

  /** Derives or retrieves a cached AES-GCM shared symmetric key for a peer's public key. */
  async getSharedKey(peerPublicKeySpki: string): Promise<CryptoKey> {
    if (!this.keyPair) await this.init();
    return this.protocol.getSharedKey(peerPublicKeySpki);
  }

  /** v1: legacy unbound envelope. */
  encrypt(plaintext: string, sharedKey: CryptoKey): Promise<string> {
    return this.protocol.encrypt(plaintext, sharedKey);
  }

  decrypt(encryptedJson: string, sharedKey: CryptoKey): Promise<string> {
    return this.protocol.decrypt(encryptedJson, sharedKey);
  }

  /** v2: one recipient device with dialog binding. */
  encryptV2(
    plaintext: string,
    sharedKey: CryptoKey,
    from: string,
    aad: MessageAad,
  ): Promise<string> {
    return this.protocol.encryptV2(plaintext, sharedKey, from, aad);
  }

  /** Transplanted envelopes (wrong dialog/author) fail loudly instead of misattributing. */
  decryptV2(
    envelopeJson: string,
    sharedKey: CryptoKey,
    expected: { conversationId: string; senderId: string },
  ): Promise<{ text: string; aad: MessageAad }> {
    return this.protocol.decryptV2(envelopeJson, sharedKey, expected);
  }

  /** v3: hybrid multi-device envelope with the sender's own device wrapped first. */
  async encryptV3(
    plaintext: string,
    recipients: DeviceKeyRef[],
    opts: {
      from: string;
      ownPublicSpki: string;
      conversationId: string;
      senderId: string;
      seq: number;
    },
  ): Promise<string> {
    if (!this.keyPair) await this.init();
    return this.protocol.encryptV3(plaintext, recipients, opts);
  }

  /** Sender device keys arrive as arguments (directory data, verified upstream). */
  async decryptV3(
    envelopeJson: string,
    senderDevices: DeviceKeyRef[],
    opts: { ownDeviceId: string; conversationId: string; senderId: string },
  ): Promise<{ text: string; aad: MessageAad }> {
    if (!this.keyPair) await this.init();
    return this.protocol.decryptV3(envelopeJson, senderDevices, opts);
  }

  /** Parses instead of substring-sniffing: plaintext merely containing '"e2ee":true' is not encrypted. */
  isEncrypted(body?: string | null): boolean {
    return isEncryptedEnvelope(body);
  }
}

export const e2eeManager = new E2eeCryptoManager();
