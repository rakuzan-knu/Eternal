/**
 * Device identity keys + TOFU pins for call E2EE (F1 follow-through).
 *
 * Model (Signal-style, call-scoped):
 *  - Each browser holds ONE non-extractable ECDSA P-256 identity keypair in
 *    IndexedDB (`e2ee-identity` DB — survives reloads, never leaves the device
 *    in exportable form; the PUBLIC half is published to the backend directory).
 *  - Every call ephemeral is signed with the identity key; the signature rides
 *    signaling next to the ephemeral public (`e2eeBindingSignature`).
 *  - Verification is TOFU with manual bootstrap: a peer promoting to
 *    'verified' requires either (a) a signature from a PINNED identity key, or
 *    (b) a one-time manual SAS compare, which pins the key. Unknown/changed
 *    keys stay 'unverified' — the server can serve any directory bytes, so
 *    directory data alone never authenticates.
 *
 * No DOM except IndexedDB/localStorage (guarded for SSR/tests). No dependencies.
 */

import { apiClient } from '@/shared/api/httpClient';

const IDB_NAME = 'e2ee-identity';
const IDB_STORE = 'keys';
const IDB_RECORD = 'identity-v1';
const PINS_KEY = 'e2ee-identity-pins';
const DEVICE_KEY = 'e2ee-device-id';

export interface IdentityKeypair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('WebCrypto subtle is unavailable in this runtime');
  return s;
}

function idb(): Promise<IDBDatabase> {
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

function idbGet(db: IDBDatabase): Promise<IdentityKeypair | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_RECORD);
    req.onsuccess = () => resolve(req.result as IdentityKeypair | undefined);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
  });
}

function idbPut(db: IDBDatabase, pair: IdentityKeypair): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(pair, IDB_RECORD);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
  });
}

let cachedPair: IdentityKeypair | null = null;

/** Load-or-create the device identity keypair (non-extractable). */
export async function ensureIdentityKeypair(): Promise<IdentityKeypair> {
  if (cachedPair) return cachedPair;
  const db = await idb();
  try {
    const stored = await idbGet(db);
    if (stored?.publicKey && stored?.privateKey) {
      cachedPair = stored;
      return stored;
    }
  } finally {
    db.close();
  }
  const pair = (await subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const db2 = await idb();
  try {
    await idbPut(db2, pair);
  } finally {
    db2.close();
  }
  cachedPair = pair;
  return pair;
}

/** Test/seam hook: drop the in-memory cache (IndexedDB copy stays). */
export function __resetIdentityCacheForTests(): void {
  cachedPair = null;
}

function b64encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64decode(b64: string): Uint8Array {
  const binary = atob(b64.trim());
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** SPKI DER base64 of the identity public key (safe to publish). */
export async function exportIdentityPublicKey(): Promise<string> {
  const { publicKey } = await ensureIdentityKeypair();
  const spki = await subtle().exportKey('spki', publicKey);
  return b64encode(new Uint8Array(spki));
}

/** Import a directory identity public for signature verification. */
export async function importIdentityPublicKey(publicKeyB64: string): Promise<CryptoKey> {
  const raw = b64decode(publicKeyB64);
  if (raw.length < 32 || raw.length > 2048) throw new Error('identity key has invalid length');
  return subtle().importKey(
    'spki',
    raw as unknown as BufferSource,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify'],
  );
}

export function getDeviceId(): string {
  try {
    let id = globalThis.localStorage?.getItem(DEVICE_KEY) ?? null;
    if (!id) {
      id = `web-${globalThis.crypto.randomUUID()}`;
      globalThis.localStorage?.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'web-ephemeral';
  }
}

/**
 * Publish our identity public to the backend directory (idempotent —
 * re-registering the same key is a no-op server-side update).
 */
export async function registerIdentityKey(): Promise<void> {
  const publicKey = await exportIdentityPublicKey();
  await apiClient.post('/e2ee/keys', {
    publicKey,
    algorithm: 'prime256v1',
    deviceId: getDeviceId(),
  });
}

let registeredThisSession = false;

/**
 * Best-effort one-time registration per page session. Never throws — callers
 * `void` it: a missing directory entry only downgrades peer verification to
 * the SAS ceremony, it must never block calls.
 */
export async function ensureIdentityRegistered(): Promise<void> {
  if (registeredThisSession) return;
  registeredThisSession = true;
  await registerIdentityKey();
}

/** Test/seam hook. */
export function __resetIdentityRegistrationForTests(): void {
  registeredThisSession = false;
}

export interface DirectoryIdentityKey {
  publicKey: string;
  algorithm: string;
  updatedAt: string;
}

/** Fetch a peer identity public from the directory; null when absent/404. */
export async function fetchPeerIdentityKey(userId: string): Promise<DirectoryIdentityKey | null> {
  try {
    const res = await apiClient.get<DirectoryIdentityKey>(
      `/e2ee/keys/${encodeURIComponent(userId)}`,
    );
    const data =
      (res as { data?: DirectoryIdentityKey }).data ?? (res as unknown as DirectoryIdentityKey);
    if (!data || typeof data.publicKey !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}

const peerKeyCache = new Map<string, { b64: string; at: number }>();
const PEER_CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchPeerIdentityKeyCached(userId: string): Promise<string | null> {
  const now = Date.now();
  const hit = peerKeyCache.get(userId);
  if (hit && now - hit.at < PEER_CACHE_TTL_MS) return hit.b64;
  const record = await fetchPeerIdentityKey(userId);
  if (!record) return null;
  peerKeyCache.set(userId, { b64: record.publicKey, at: now });
  return record.publicKey;
}

/** SHA-256 hex fingerprint of an SPKI b64 identity key (for pins + display). */
export async function fingerprintIdentityKey(publicKeyB64: string): Promise<string> {
  const raw = b64decode(publicKeyB64);
  const digest = await subtle().digest('SHA-256', raw as unknown as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function readPins(): Record<string, string> {
  try {
    const raw = globalThis.localStorage?.getItem(PINS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // Corrupt pins.BASE — treat as empty (fail safe: forces re-verify).
  }
  return {};
}

/** Pin a peer identity fingerprint after a successful SAS ceremony. */
export function pinIdentityKey(userId: string, fingerprintHex: string): void {
  try {
    const pins = readPins();
    pins[userId] = fingerprintHex.toLowerCase();
    globalThis.localStorage?.setItem(PINS_KEY, JSON.stringify(pins));
  } catch {
    // Storage failures must never break calls; ceremony just repeats.
  }
}

export function getPinnedFingerprint(userId: string): string | null {
  return readPins()[userId] ?? null;
}

/** True iff the peer key matches a previously pinned fingerprint. */
export async function isPinnedMatch(userId: string, publicKeyB64: string): Promise<boolean> {
  const pinned = getPinnedFingerprint(userId);
  if (!pinned) return false;
  try {
    return (await fingerprintIdentityKey(publicKeyB64)).toLowerCase() === pinned;
  } catch {
    return false;
  }
}
