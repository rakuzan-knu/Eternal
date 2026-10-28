import { E2eeProtocol, bytesToBase64, createWebCryptoBackend } from '@social-network/shared-crypto';

const DB_NAME = 'eternal-mobile-e2ee';
const STORE = 'keys';
const RECORD = 'message-identity-v1';
const DEVICE_KEY = 'e2ee_device_id_v1';

let pair: CryptoKeyPair | null = null;
let publicKeySpki: string | null = null;
let loading: Promise<{ publicKeySpki: string }> | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(request.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('IndexedDB transaction failed'));
        };
      }),
  );
}

/**
 * Browser build: the private key is a NON-extractable CryptoKey persisted in
 * IndexedDB (structured clone keeps it opaque) — script cannot export it.
 */
export function initDeviceIdentity(): Promise<{ publicKeySpki: string }> {
  if (pair && publicKeySpki) return Promise.resolve({ publicKeySpki });
  loading ??= (async () => {
    let stored: CryptoKeyPair | undefined;
    try {
      stored = await run<CryptoKeyPair | undefined>('readonly', (store) => store.get(RECORD));
    } catch {
      stored = undefined;
    }
    if (!stored?.privateKey || !stored.publicKey) {
      stored = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, [
        'deriveKey',
        'deriveBits',
      ]);
      await run('readwrite', (store) => store.put(stored, RECORD));
    }
    pair = stored;
    publicKeySpki = bytesToBase64(
      new Uint8Array(await crypto.subtle.exportKey('spki', stored.publicKey)),
    );
    return { publicKeySpki };
  })().finally(() => {
    loading = null;
  });
  return loading;
}

export async function getDeviceId(): Promise<string> {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `mobile-web-${crypto.randomUUID()}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'mobile-web-ephemeral';
  }
}

export const deviceProtocol: E2eeProtocol<object> = new E2eeProtocol(
  createWebCryptoBackend(async () => {
    if (!pair) await initDeviceIdentity();
    return (pair as CryptoKeyPair).privateKey;
  }),
);
