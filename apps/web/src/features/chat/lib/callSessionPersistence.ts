import type { UserSnapshot } from '@common/contracts';

export interface PersistedCallSession {
  callId: string;
  conversationId: string;
  callType: 'audio' | 'video';
  remoteParticipant: UserSnapshot | null;
  isVideoOff: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  startedAt: number;
}

const SESSION_STORAGE_KEY = 'social_active_call_session';
const LOCAL_STORAGE_KEY = 'social_active_call_session_backup';
const MAX_SESSION_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

export function saveCallSession(session: PersistedCallSession): void {
  try {
    const serialized = JSON.stringify(session);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
    }
  } catch {
    // Ignore quota/access errors (e.g. private browsing mode)
  }
}

export function updateCallSession(updates: Partial<PersistedCallSession>): void {
  const current = getCallSession();
  if (current) {
    saveCallSession({ ...current, ...updates });
  }
}

export function getCallSession(): PersistedCallSession | null {
  try {
    let raw: string | null = null;
    if (typeof sessionStorage !== 'undefined') {
      raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    }
    // Fallback to localStorage if sessionStorage was empty (e.g. freshly reopened tab)
    if (!raw && typeof localStorage !== 'undefined') {
      raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    }
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedCallSession;
    if (!parsed || !parsed.callId || !parsed.conversationId) {
      clearCallSession();
      return null;
    }

    // Discard sessions older than 6 hours
    if (parsed.startedAt && Date.now() - parsed.startedAt > MAX_SESSION_AGE_MS) {
      clearCallSession();
      return null;
    }

    return parsed;
  } catch {
    clearCallSession();
    return null;
  }
}

export function clearCallSession(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
}
