import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeshVoiceRoomManager } from '../meshVoiceRoom';

describe('MeshVoiceRoomManager', () => {
  let mockSocketEmit: ReturnType<typeof vi.fn> &
    ((event: string, payload: unknown, callback?: (res: unknown) => void) => void);
  let mockAudioTrack: { enabled: boolean; stop: ReturnType<typeof vi.fn> };
  let mockStream: {
    getTracks: () => unknown[];
    getAudioTracks: () => unknown[];
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSocketEmit = vi.fn() as unknown as typeof mockSocketEmit;

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
  it('stops a late microphone stream after leaving while permission is pending', async () => {
    let resolveMedia: ((value: MediaStream) => void) | undefined;
    vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(
      new Promise((resolve) => {
        resolveMedia = resolve;
      }),
    );
    const manager = new MeshVoiceRoomManager('user-123', mockSocketEmit);
    const joining = manager.join('archived-room');
    manager.leave();
    resolveMedia?.(mockStream as unknown as MediaStream);
    await joining;
    expect(mockAudioTrack.stop).toHaveBeenCalledOnce();
    expect(manager.getRoomId()).toBeNull();
    expect(mockSocketEmit).not.toHaveBeenCalledWith(
      'voice:mesh-join',
      expect.anything(),
      expect.anything(),
    );
  });
  it('cleans up microphone and connections when an archived room rejects joining', async () => {
    mockSocketEmit.mockImplementation((event, _payload, callback) => {
      if (event === 'voice:mesh-join') callback?.({ success: false });
    });
    const manager = new MeshVoiceRoomManager('user-123', mockSocketEmit);
    await manager.join('archived-room');
    expect(manager.getRoomId()).toBeNull();
    expect(mockAudioTrack.stop).toHaveBeenCalledOnce();
  });
  it('notifies the hook when a delayed join denial disconnects the room', async () => {
    const disconnected = vi.fn();
    let acknowledge: ((response: unknown) => void) | undefined;
    mockSocketEmit.mockImplementation((event, _payload, callback) => {
      if (event === 'voice:mesh-join') acknowledge = callback;
    });
    const manager = new MeshVoiceRoomManager('user-123', mockSocketEmit, {
      onDisconnected: disconnected,
    });
    await manager.join('room');
    disconnected.mockClear();
    acknowledge?.({ success: false });
    expect(disconnected).toHaveBeenCalledOnce();
    expect(manager.getRoomId()).toBeNull();
    expect(mockAudioTrack.stop).toHaveBeenCalledOnce();
  });
  it('rejects a stale microphone result when rejoining the same room', async () => {
    let resolveFirst: ((stream: MediaStream) => void) | undefined;
    const lateTrack = { stop: vi.fn() };
    const lateStream = { getTracks: () => [lateTrack] };
    vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    );
    const manager = new MeshVoiceRoomManager('user-123', mockSocketEmit);
    const first = manager.join('room');
    manager.leave();
    await manager.join('room');
    resolveFirst?.(lateStream as unknown as MediaStream);
    await first;
    expect(lateTrack.stop).toHaveBeenCalledOnce();
    expect(mockAudioTrack.stop).not.toHaveBeenCalled();
    expect(manager.getRoomId()).toBe('room');
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
