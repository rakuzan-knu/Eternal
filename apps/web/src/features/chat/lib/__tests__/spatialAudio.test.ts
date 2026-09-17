import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpatialAudioManager } from '../webrtc/spatialAudio';

describe('SpatialAudioManager', () => {
  beforeEach(() => {
    // Setup mock AudioContext
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
      setOrientation: vi.fn(),
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
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.stubGlobal(
      'AudioContext',
      vi.fn().mockImplementation(() => mockAudioContext),
    );
  });

  it('initializes disabled by default and enables when requested', () => {
    const manager = new SpatialAudioManager(false);
    expect(manager.getIsEnabled()).toBe(false);

    manager.setEnabled(true);
    expect(manager.getIsEnabled()).toBe(true);
    manager.destroy();
  });

  it('adds participants and calculates spatial positions', () => {
    const manager = new SpatialAudioManager(true);
    const mockTrack = { kind: 'audio', stop: vi.fn() } as unknown as MediaStreamTrack;
    const mockStream1 = { getAudioTracks: () => [mockTrack] } as unknown as MediaStream;
    const mockStream2 = { getAudioTracks: () => [mockTrack] } as unknown as MediaStream;

    manager.addParticipant('user-1', mockStream1);
    manager.addParticipant('user-2', mockStream2);

    manager.updatePositions(['user-1', 'user-2']);

    manager.removeParticipant('user-1');
    manager.destroy();
  });

  it('updates listener head orientation in 3D HRTF space', () => {
    const manager = new SpatialAudioManager(true);
    const mockTrack = { kind: 'audio', stop: vi.fn() } as unknown as MediaStreamTrack;
    const mockStream = { getAudioTracks: () => [mockTrack] } as unknown as MediaStream;
    manager.addParticipant('user-1', mockStream);

    manager.updateHeadOrientation([0.707, 0, -0.707], [0, 1, 0]);
    manager.resetHeadOrientation();
    manager.destroy();
  });
});
