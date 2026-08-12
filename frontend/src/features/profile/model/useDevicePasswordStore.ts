import { create } from 'zustand';
import {
  derivePassword,
  verifyPassword,
  type DerivedPassword,
} from '@/shared/lib/derivePasswordHash';

const STORAGE_KEY = 'eternal-device-auth-v1';
const LEGACY_STORAGE_KEY = 'eternal-device-password';

function encryptStorageToken(data: DerivedPassword): string {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  const hex = Array.from(bytes)
    .map((b, i) => (b ^ (0x5c ^ (i % 11))).toString(16).padStart(2, '0'))
    .join('');
  return btoa(hex);
}

function decryptStorageToken(raw: string): DerivedPassword | null {
  try {
    const hex = atob(raw);
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16) ^ (0x5c ^ (i % 11));
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as DerivedPassword;
    if (parsed?.salt && parsed?.hash && parsed?.algo) return parsed;
    return null;
  } catch {
    return null;
  }
}

function loadStored(): DerivedPassword | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const decoded = decryptStorageToken(raw);
      if (decoded) return decoded;
    }
    // Migration check for legacy unencrypted key
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as DerivedPassword;
      if (parsed?.salt && parsed?.hash && parsed?.algo) {
        saveStored(parsed);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function saveStored(value: DerivedPassword | null) {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else {
      const encryptedToken = encryptStorageToken(value);
      localStorage.setItem(STORAGE_KEY, encryptedToken);
    }
  } catch {
    // ignore write failures (private mode, quota, etc.)
  }
}

interface DevicePasswordState {
  stored: DerivedPassword | null;
  unlocked: boolean;
  isEnabled: () => boolean;
  setPassword: (plain: string) => Promise<void>;
  verify: (plain: string) => Promise<boolean>;
  unlock: () => void;
  disable: () => void;
}

export const useDevicePasswordStore = create<DevicePasswordState>((set, get) => ({
  stored: loadStored(),
  unlocked: false,
  isEnabled: () => get().stored !== null,
  setPassword: async (plain) => {
    const stored = await derivePassword(plain);
    saveStored(stored);
    set({ stored, unlocked: true });
  },
  verify: async (plain) => {
    const { stored } = get();
    if (!stored) return false;
    const ok = await verifyPassword(plain, stored);
    if (ok) set({ unlocked: true });
    return ok;
  },
  unlock: () => set({ unlocked: true }),
  disable: () => {
    saveStored(null);
    set({ stored: null, unlocked: false });
  },
}));
