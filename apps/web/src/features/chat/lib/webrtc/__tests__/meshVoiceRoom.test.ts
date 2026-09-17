import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeshVoiceRoomManager } from '../meshVoiceRoom';

describe('MeshVoiceRoomManager', () => {
  let mockSocketEmit: ReturnType<typeof vi.fn>;
  let mockAudioTrack: { enabled: boolean; stop: ReturnType<typeof vi.fn> };
  let mockStream: {
    getTracks: () => unknown[];
    getAudioTracks: () => unknown[];
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSocketEmit = vi.fn();

    mockAudioTrack = {
      enabled: true,
      stop: vi.fn(),
    };

    mockStream = {
      getTracks: () => [mockAudioTrack],
      getAudioTracks: () => [mockAudioTrack],
    };

    // Stub navigator.mediaDevices.getUserMedia
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
    });

    // Mock RTCPeerConnection
    class MockRTCPeerConnection {
      addTrack = vi.fn();
      createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-offer' });
      createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-answer' });
      setLocalDescription = vi.fn().mockResolvedValue(undefined);
      setRemoteDescription = vi.fn().mockResolvedValue(undefined);
      addIceCandidate = vi.fn().mockResolvedValue(undefined);
      close = vi.fn();
      ontrack: ((event: unknown) => void) | null = null;
      onicecandidate: ((event: unknown) => void) | null = null;
    }

    vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection);
    vi.stubGlobal('RTCSessionDescription', function (desc: unknown) {
      return desc;
    });
    vi.stubGlobal('RTCIceCandidate', function (c: unknown) {
      return c;
    });
  });

  it('joins room, acquires microphone, and emits voice:mesh-join', async () => {
    const manager = new MeshVoiceRoomManager('user-123', mockSocketEmit);
    await manager.join('room-456');

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    expect(mockSocketEmit).toHaveBeenCalledWith(
      'voice:mesh-join',
      { roomId: 'room-456' },
      expect.any(Function),
    );

    expect(manager.getRoomId()).toBe('room-456');
    manager.leave();
  });

  it('toggles microphone mute and audio tracks', async () => {
    const manager = new MeshVoiceRoomManager('user-123', mockSocketEmit);
    await manager.join('room-456');

    expect(manager.getIsMuted()).toBe(false);
    expect(mockAudioTrack.enabled).toBe(true);

    const isNowMuted = manager.toggleMute();
    expect(isNowMuted).toBe(true);
    expect(mockAudioTrack.enabled).toBe(false);

    manager.toggleMute(false);
    expect(manager.getIsMuted()).toBe(false);
    expect(mockAudioTrack.enabled).toBe(true);

    manager.leave();
  });

  it('handles peer joined, signal exchange, and peer leaving', async () => {
    const onPeersChange = vi.fn();
    const manager = new MeshVoiceRoomManager('user-123', mockSocketEmit, { onPeersChange });
    await manager.join('room-456');

    // Peer joins
    await manager.handlePeerJoined('peer-abc');
    expect(manager.getConnectedPeerIds()).toContain('peer-abc');

    // Handle offer signal
    await manager.handleSignal('peer-abc', {
      type: 'offer',
      data: { type: 'offer', sdp: 'remote-sdp' } as RTCSessionDescriptionInit,
    });

    expect(mockSocketEmit).toHaveBeenCalledWith('voice:mesh-signal', {
      roomId: 'room-456',
      targetPeerId: 'peer-abc',
      signal: {
        type: 'answer',
        data: { type: 'answer', sdp: 'mock-answer' },
      },
    });

    // Handle candidate signal
    await manager.handleSignal('peer-abc', {
      type: 'candidate',
      data: { candidate: 'candidate-1', sdpMid: '0', sdpMLineIndex: 0 } as RTCIceCandidateInit,
    });

    // Peer leaves
    manager.handlePeerLeft('peer-abc');
    expect(manager.getConnectedPeerIds()).not.toContain('peer-abc');

    manager.leave();
    expect(manager.getRoomId()).toBeNull();
  });
});
