import { create } from 'zustand';
import {
  derivePassword,
  verifyPassword,
  type DerivedPassword,
} from '@/shared/lib/derivePasswordHash';

const STORAGE_KEY = 'eternal-archive-password';

function loadStored(): DerivedPassword | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DerivedPassword;
    if (parsed?.salt && parsed?.hash && parsed?.algo) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveStored(value: DerivedPassword | null) {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore write failures (private mode, quota, etc.)
  }
}

interface ArchivePasswordState {
  passwordHash: DerivedPassword | null;
  setPassword: (plain: string) => Promise<void>;
  verify: (plain: string) => Promise<boolean>;
  resetPassword: () => void;
}

export const useArchivePasswordStore = create<ArchivePasswordState>((set, get) => ({
  passwordHash: loadStored(),
  setPassword: async (plain) => {
    const passwordHash = await derivePassword(plain);
    saveStored(passwordHash);
    set({ passwordHash });
  },
  verify: async (plain) => {
    const { passwordHash } = get();
    if (!passwordHash) return false;
    return verifyPassword(plain, passwordHash);
  },
  resetPassword: () => {
    saveStored(null);
    set({ passwordHash: null });
  },
}));
