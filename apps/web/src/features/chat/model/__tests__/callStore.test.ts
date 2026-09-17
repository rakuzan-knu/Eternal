import { describe, it, expect, beforeEach } from 'vitest';
import { useCallStore } from '../callStore';

describe('useCallStore', () => {
  beforeEach(() => {
    useCallStore.getState().resetCall();
  });

  it('starts with initial idle state', () => {
    const state = useCallStore.getState();
    expect(state.callStatus).toBe('idle');
    expect(state.callId).toBeNull();
    expect(state.activeCall).toBeNull();
    expect(state.incomingCall).toBeNull();
    expect(state.isMuted).toBe(false);
    expect(state.isVideoOff).toBe(false);
    expect(state.isScreenSharing).toBe(false);
    expect(state.isPiP).toBe(false);
    expect(state.durationSec).toBe(0);
  });

  it('handles state transitions: calling -> connected -> ended', () => {
    const { setCallStatus, incrementDuration, setDurationSec } = useCallStore.getState();

    setCallStatus('calling');
    expect(useCallStore.getState().callStatus).toBe('calling');

    setCallStatus('connected');
    expect(useCallStore.getState().callStatus).toBe('connected');

    setDurationSec(10);
    incrementDuration();
    expect(useCallStore.getState().durationSec).toBe(11);

    setCallStatus('ended');
    expect(useCallStore.getState().callStatus).toBe('ended');
  });

  it('handles incoming call data and clearing', () => {
    const { setIncomingCall, clearIncomingCall } = useCallStore.getState();

    const mockIncoming = {
      callId: 'call-123',
      callerId: 'user-alice',
      caller: {
        id: 'user-alice',
        username: 'alice',
        displayName: 'Alice',
        avatar: null,
      },
      conversationId: 'conv-456',
      callType: 'video' as const,
    };

    setIncomingCall(mockIncoming);
    expect(useCallStore.getState().incomingCall).toEqual(mockIncoming);

    clearIncomingCall();
    expect(useCallStore.getState().incomingCall).toBeNull();
  });

  it('toggles audio, video, screen share and PiP flags', () => {
    const { setIsMuted, setIsVideoOff, setIsScreenSharing, setIsPiP } = useCallStore.getState();

    setIsMuted(true);
    expect(useCallStore.getState().isMuted).toBe(true);

    setIsVideoOff(true);
    expect(useCallStore.getState().isVideoOff).toBe(true);

    setIsScreenSharing(true);
    expect(useCallStore.getState().isScreenSharing).toBe(true);

    setIsPiP(true);
    expect(useCallStore.getState().isPiP).toBe(true);
  });

  it('resets cleanly when resetCall is invoked', () => {
    const { setCallStatus, setIsMuted, setDurationSec, resetCall } = useCallStore.getState();

    setCallStatus('connected');
    setIsMuted(true);
    setDurationSec(120);

    resetCall();

    const state = useCallStore.getState();
    expect(state.callStatus).toBe('idle');
    expect(state.isMuted).toBe(false);
    expect(state.durationSec).toBe(0);
  });
});
