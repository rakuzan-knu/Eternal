import { create } from 'zustand';
import { registerSessionResetHandler } from '@/shared/model/resetSession';
import {
  derivePasswordVerifier,
  verifyPasswordVerifier,
  type DerivedPassword,
} from '@/shared/lib/derivePasswordHash';

const STORAGE_KEY = 'eternal-archive-auth-v2';
const LEGACY_V1_KEY = 'eternal-archive-auth-v1';
const LEGACY_V0_KEY = 'eternal-archive-password';
const ENCRYPTED_PREFIX = 'enc:';

function isDerivedPassword(value: unknown): value is DerivedPassword {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DerivedPassword>;
  return (
    typeof candidate.salt === 'string' &&
    typeof candidate.hash === 'string' &&
    typeof candidate.algo === 'string'
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(view.byteLength);
  new Uint8Array(buffer).set(view);
  return buffer;
}

async function getArchiveCryptoKey(): Promise<CryptoKey | null> {
  const subtle =
    (typeof window !== 'undefined' ? window.crypto?.subtle : undefined) ||
    globalThis.crypto?.subtle;
  if (!subtle) return null;
  try {
    const rawData = new TextEncoder().encode('eternal-archive-auth-storage-key');
    const keyMaterial = await subtle.digest('SHA-256', toArrayBuffer(rawData));
    return subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  } catch {
    return null;
  }
}

async function encryptStoredValue(value: DerivedPassword): Promise<string> {
  try {
    const subtle =
      (typeof window !== 'undefined' ? window.crypto?.subtle : undefined) ||
      globalThis.crypto?.subtle;
    const getRandomValues =
      (typeof window !== 'undefined'
        ? window.crypto?.getRandomValues.bind(window.crypto)
        : undefined) || globalThis.crypto?.getRandomValues.bind(globalThis.crypto);
    const key = await getArchiveCryptoKey();
    if (!key || !subtle || !getRandomValues) {
      return `${ENCRYPTED_PREFIX}${bytesToBase64(new TextEncoder().encode(JSON.stringify(value)))}`;
    }
    const iv = getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(value));
    const ciphertext = new Uint8Array(
      await subtle.encrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(iv) },
        key,
        toArrayBuffer(plaintext),
      ),
    );
    return `${ENCRYPTED_PREFIX}${bytesToBase64(iv)}.${bytesToBase64(ciphertext)}`;
  } catch {
    return `${ENCRYPTED_PREFIX}${bytesToBase64(new TextEncoder().encode(JSON.stringify(value)))}`;
  }
}

function decryptStoredValueSync(raw: string): DerivedPassword | null {
  try {
    if (!raw.startsWith(ENCRYPTED_PREFIX)) {
      const parsed = JSON.parse(raw) as unknown;
      return isDerivedPassword(parsed) ? parsed : null;
    }
    const payload = raw.slice(ENCRYPTED_PREFIX.length);
    if (!payload.includes('.')) {
      const json = new TextDecoder().decode(base64ToBytes(payload));
      const parsed = JSON.parse(json) as unknown;
      return isDerivedPassword(parsed) ? parsed : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function decryptStoredValue(raw: string): Promise<DerivedPassword | null> {
  try {
    if (!raw.startsWith(ENCRYPTED_PREFIX)) {
      const parsed = JSON.parse(raw) as unknown;
      return isDerivedPassword(parsed) ? parsed : null;
    }
    const payload = raw.slice(ENCRYPTED_PREFIX.length);
    const [ivB64, cipherB64] = payload.split('.');
    if (!ivB64 || !cipherB64) {
      const json = new TextDecoder().decode(base64ToBytes(payload));
      const parsed = JSON.parse(json) as unknown;
      return isDerivedPassword(parsed) ? parsed : null;
    }
    const subtle =
      (typeof window !== 'undefined' ? window.crypto?.subtle : undefined) ||
      globalThis.crypto?.subtle;
    const key = await getArchiveCryptoKey();
    if (!key || !subtle) return null;
    const iv = toArrayBuffer(base64ToBytes(ivB64));
    const ciphertext = toArrayBuffer(base64ToBytes(cipherB64));
    const plaintext = new Uint8Array(
      await subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext),
    );
    const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
    return isDerivedPassword(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseLegacyV1Token(raw: string): DerivedPassword | null {
  try {
    const hex = atob(raw);
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16) ^ (0x5c ^ (i % 11));
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as unknown;
    if (isDerivedPassword(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function loadStored(): DerivedPassword | null {
  if (typeof window === 'undefined') return null;
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      const syncParsed = decryptStoredValueSync(current);
      if (syncParsed) return syncParsed;

      void decryptStoredValue(current)
        .then((parsed) => {
          if (parsed) {
            useArchivePasswordStore.setState({ passwordHash: parsed });
          }
        })
        .catch(() => {});
    }

    // Migration from v1 obfuscated token format
    const legacyV1 = localStorage.getItem(LEGACY_V1_KEY);
    if (legacyV1) {
      const decoded = parseLegacyV1Token(legacyV1);
      if (decoded) {
        saveStored(decoded);
        localStorage.removeItem(LEGACY_V1_KEY);
        return decoded;
      }
    }

    // Migration from legacy unencrypted key format
    const legacyV0 = localStorage.getItem(LEGACY_V0_KEY);
    if (legacyV0) {
      const parsed = JSON.parse(legacyV0) as unknown;
      if (isDerivedPassword(parsed)) {
        saveStored(parsed);
        localStorage.removeItem(LEGACY_V0_KEY);
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function saveStoredAsync(value: DerivedPassword | null): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_V1_KEY);
      localStorage.removeItem(LEGACY_V0_KEY);
    } else {
      localStorage.removeItem(LEGACY_V1_KEY);
      localStorage.removeItem(LEGACY_V0_KEY);
      const encoded = `${ENCRYPTED_PREFIX}${bytesToBase64(new TextEncoder().encode(JSON.stringify(value)))}`;
      localStorage.setItem(STORAGE_KEY, encoded);
      try {
        const encrypted = await encryptStoredValue(value);
        localStorage.setItem(STORAGE_KEY, encrypted);
      } catch {
        // fallback to base64
      }
    }
  } catch {
    // ignore write failures (private mode, quota, etc.)
  }
}

function saveStored(value: DerivedPassword | null) {
  void saveStoredAsync(value);
}

interface ArchivePasswordState {
  passwordHash: DerivedPassword | null;
  setPassword: (plain: string) => Promise<void>;
  verify: (plain: string) => Promise<boolean>;
  resetPassword: () => void;
  rehydrate: () => void;
}

export const useArchivePasswordStore = create<ArchivePasswordState>((set, get) => ({
  passwordHash: loadStored(),
  setPassword: async (plain) => {
    const passwordHash = await derivePasswordVerifier(plain);
    await saveStoredAsync(passwordHash);
    set({ passwordHash });
  },
  verify: async (plain) => {
    let { passwordHash } = get();
    if (!passwordHash) {
      const current = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (current) {
        passwordHash = (await decryptStoredValue(current)) ?? decryptStoredValueSync(current);
        if (passwordHash) {
          set({ passwordHash });
        }
      }
    }
    if (!passwordHash) return false;
    return verifyPasswordVerifier(plain, passwordHash);
  },
  resetPassword: () => {
    saveStored(null);
    set({ passwordHash: null });
  },
  rehydrate: () => {
    try {
      const sync = loadStored();
      if (sync) {
        set({ passwordHash: sync });
        return;
      }
      const current = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (current) {
        void decryptStoredValue(current).then((parsed) => {
          if (parsed) {
            set({ passwordHash: parsed });
          }
        });
      } else {
        set({ passwordHash: null });
      }
    } catch {
      set({ passwordHash: null });
    }
  },
}));

/**
 * RESET_STORES: the archive gate is stored WITHOUT a user namespace, so the
 * verifier MUST be dropped on logout/switch — otherwise account B could
 * unlock account A's local archive with A's password still in RAM. The user
 * re-enters the password next session (fail closed, never leak open).
 */
registerSessionResetHandler(() => {
  try {
    useArchivePasswordStore.getState().resetPassword();
  } catch {
    useArchivePasswordStore.setState({ passwordHash: null });
  }
});
