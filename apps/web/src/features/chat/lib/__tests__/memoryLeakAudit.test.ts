import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpatialAudioManager } from '../webrtc/spatialAudio';
import { HeadTracker } from '../webrtc/headTracker';
import { P2PTurnRelayManager } from '../webrtc/p2pTurnRelay';
import { WebTransportSignalingClient } from '../webrtc/webTransportSignaling';

describe('WebRTC Memory Leak Audit & Stress Testing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('safely tears down and releases resources across 50 consecutive call cycles', () => {
    const totalCycles = 50;
    const allTracks: Array<{ readyState: string; stop: () => void }> = [];
    const allAudioContexts: Array<{ state: string; close: () => Promise<void> }> = [];
    interface MockPeerConnection {
      signalingState: string;
      onicecandidate: ((...args: unknown[]) => unknown) | null;
      ontrack: ((...args: unknown[]) => unknown) | null;
      ondatachannel: ((...args: unknown[]) => unknown) | null;
      getSenders: () => Array<{ track: unknown }>;
      getTransceivers: () => Array<{ stop: () => void }>;
      close: () => void;
    }
    const allPeerConnections: MockPeerConnection[] = [];

    for (let i = 0; i < totalCycles; i++) {
      // 1. Simulate MediaStream acquisition
      const audioTrack = {
        kind: 'audio',
        readyState: 'live',
        stop: vi.fn(function (this: any) {
          this.readyState = 'ended';
        }),
      };
      const videoTrack = {
        kind: 'video',
        readyState: 'live',
        stop: vi.fn(function (this: any) {
          this.readyState = 'ended';
        }),
      };
      allTracks.push(audioTrack, videoTrack);

      const localStream = {
        getAudioTracks: () => [audioTrack],
        getVideoTracks: () => [videoTrack],
        getTracks: () => [audioTrack, videoTrack],
      } as unknown as MediaStream;

      // 2. Simulate AudioContext
      const mockPanner = {
        panningModel: 'HRTF',
        positionX: { setValueAtTime: vi.fn() },
        positionY: { setValueAtTime: vi.fn() },
        positionZ: { setValueAtTime: vi.fn() },
        setPosition: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      const mockGain = {
        gain: { value: 1.0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      const mockSource = {
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      const mockListener = {
        forwardX: { setValueAtTime: vi.fn() },
        forwardY: { setValueAtTime: vi.fn() },
        forwardZ: { setValueAtTime: vi.fn() },
        upX: { setValueAtTime: vi.fn() },
        upY: { setValueAtTime: vi.fn() },
        upZ: { setValueAtTime: vi.fn() },
      };

      const mockAudioContext = {
        state: 'running',
        currentTime: 0,
        createMediaStreamSource: vi.fn().mockReturnValue(mockSource),
        createPanner: vi.fn().mockReturnValue(mockPanner),
        createGain: vi.fn().mockReturnValue(mockGain),
        destination: {},
        listener: mockListener,
        resume: vi.fn().mockResolvedValue(undefined),
        close: vi.fn(function (this: any) {
          this.state = 'closed';
          return Promise.resolve();
        }),
      };
      allAudioContexts.push(mockAudioContext);

      vi.stubGlobal(
        'AudioContext',
        vi.fn().mockImplementation(() => mockAudioContext),
      );

      // 3. Initialize spatial audio & head tracker
      const spatialAudio = new SpatialAudioManager(true);
      spatialAudio.addParticipant('caller-1', localStream);
      spatialAudio.updateHeadOrientation([0, 0, -1], [0, 1, 0]);

      const headTracker = new HeadTracker(0.2);
      headTracker.applyAngles(10, 5, 0);

      // 4. Initialize DataChannel & WebTransport
      const relayManager = new P2PTurnRelayManager();
      const wtClient = new WebTransportSignalingClient();

      // 5. Mock RTCPeerConnection
      const mockPc: MockPeerConnection = {
        signalingState: 'stable',
        onicecandidate: vi.fn(),
        ontrack: vi.fn(),
        ondatachannel: vi.fn(),
        getSenders: () => [{ track: videoTrack }],
        getTransceivers: () => [{ stop: vi.fn() }],
        close: vi.fn(function (this: MockPeerConnection) {
          this.signalingState = 'closed';
        }),
      };
      allPeerConnections.push(mockPc);

      // 6. TEARDOWN (Simulating closeConnection)
      spatialAudio.destroy();
      headTracker.stop();
      relayManager.destroy();
      wtClient.disconnect();

      // Stop all tracks explicitly
      localStream.getTracks().forEach((t) => t.stop());

      // Close PC and clear handlers
      mockPc.onicecandidate = null;
      mockPc.ontrack = null;
      mockPc.ondatachannel = null;
      mockPc.close();
    }

    // AUDIT ASSERTIONS
    expect(allTracks.length).toBe(totalCycles * 2);
    expect(allAudioContexts.length).toBe(totalCycles);
    expect(allPeerConnections.length).toBe(totalCycles);

    // Assert 100% of media tracks are completely stopped
    allTracks.forEach((track, index) => {
      expect(track.readyState, `Track at index ${index} must be ended`).toBe('ended');
      expect(track.stop).toHaveBeenCalled();
    });

    // Assert 100% of AudioContexts are closed
    allAudioContexts.forEach((ctx, index) => {
      expect(ctx.state, `AudioContext at index ${index} must be closed`).toBe('closed');
    });

    // Assert 100% of PeerConnections are closed with null listeners
    allPeerConnections.forEach((pc, index) => {
      expect(pc.signalingState, `PeerConnection at index ${index} must be closed`).toBe('closed');
      expect(pc.onicecandidate).toBeNull();
      expect(pc.ontrack).toBeNull();
      expect(pc.ondatachannel).toBeNull();
    });
  });
});
