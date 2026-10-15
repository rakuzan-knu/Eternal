import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveCallSession,
  getCallSession,
  updateCallSession,
  clearCallSession,
  type PersistedCallSession,
} from '../callSessionPersistence';

describe('callSessionPersistence', () => {
  const mockSession: PersistedCallSession = {
    callId: 'call-uuid-123',
    conversationId: 'conv-uuid-456',
    callType: 'audio',
    remoteParticipant: {
      id: 'user-789',
      username: 'alice',
      displayName: 'Alice',
      avatar: 'https://example.com/avatar.png',
    },
    isVideoOff: true,
    isMuted: false,
    isDeafened: false,
    startedAt: Date.now(),
  };

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should save and retrieve call session correctly', () => {
    saveCallSession(mockSession);
    const retrieved = getCallSession();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.callId).toBe('call-uuid-123');
    expect(retrieved?.conversationId).toBe('conv-uuid-456');
    expect(retrieved?.remoteParticipant?.username).toBe('alice');
    expect(retrieved?.isMuted).toBe(false);
  });

  it('should update partial call session fields', () => {
    saveCallSession(mockSession);
    updateCallSession({ isMuted: true, isVideoOff: false });

    const retrieved = getCallSession();
    expect(retrieved?.isMuted).toBe(true);
    expect(retrieved?.isVideoOff).toBe(false);
    expect(retrieved?.callId).toBe('call-uuid-123');
  });

  it('should clear call session from both storages', () => {
    saveCallSession(mockSession);
    expect(getCallSession()).not.toBeNull();

    clearCallSession();
    expect(getCallSession()).toBeNull();
  });

  it('should fallback to localStorage if sessionStorage is empty (e.g. freshly restored tab)', () => {
    saveCallSession(mockSession);
    sessionStorage.clear(); // Simulate sessionStorage cleared or new tab
    const retrieved = getCallSession();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.callId).toBe('call-uuid-123');
  });

  it('should discard sessions older than max age (6 hours)', () => {
    const expiredSession: PersistedCallSession = {
      ...mockSession,
      startedAt: Date.now() - 7 * 60 * 60 * 1000, // 7 hours ago
    };
    saveCallSession(expiredSession);
    const retrieved = getCallSession();
    expect(retrieved).toBeNull();
  });

  it('should handle corrupt storage data gracefully without throwing', () => {
    sessionStorage.setItem('social_active_call_session', 'invalid-json{{{');
    const retrieved = getCallSession();
    expect(retrieved).toBeNull();
  });
});
