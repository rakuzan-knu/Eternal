import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PerSpeakerMixerManager,
  SpeakerAudioChannel,
  DEFAULT_MIXER_PROFILE,
} from '../perSpeakerMixer';

describe('PerSpeakerMixerManager (Per-Participant EQ, Volume & Pan)', () => {
  let manager: PerSpeakerMixerManager;
  let mockStream: MediaStream;

  let mockGainNode: {
    gain: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  let mockFilterNode: {
    type: string;
    frequency: { value: number };
    Q: { value: number };
    gain: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  let mockPannerNode: {
    pan: { value: number; setTargetAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockGainNode = {
      gain: { value: 1.0, setTargetAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockFilterNode = {
      type: 'lowshelf',
      frequency: { value: 250 },
      Q: { value: 1.0 },
      gain: { value: 0, setTargetAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockPannerNode = {
      pan: { value: 0, setTargetAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    const mockAudioContext = {
      currentTime: 10,
      state: 'running',
      createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn(), disconnect: vi.fn() }),
      createBiquadFilter: vi.fn().mockReturnValue(mockFilterNode),
      createStereoPanner: vi.fn().mockReturnValue(mockPannerNode),
      createGain: vi.fn().mockReturnValue(mockGainNode),
      createMediaStreamDestination: vi.fn().mockReturnValue({
        connect: vi.fn(),
        stream: { getAudioTracks: () => [{ id: 'processed-track' }] },
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.stubGlobal(
      'AudioContext',
      vi.fn().mockImplementation(() => mockAudioContext),
    );

    const mockAudioTrack = { kind: 'audio', id: 'track-1' } as MediaStreamTrack;
    mockStream = {
      getAudioTracks: vi.fn().mockReturnValue([mockAudioTrack]),
    } as unknown as MediaStream;

    manager = new PerSpeakerMixerManager();
  });

  it('attaches speaker with default profile', () => {
    const channel = manager.attachSpeaker('user-alice', mockStream);
    expect(channel).toBeInstanceOf(SpeakerAudioChannel);

    const profile = manager.getProfile('user-alice');
    expect(profile).toEqual(DEFAULT_MIXER_PROFILE);
  });

  it('updates volume between 0% and 200% and sets gain target', () => {
    manager.attachSpeaker('user-bob', mockStream);

    const updated = manager.updateProfile('user-bob', { volume: 1.5 });
    expect(updated.volume).toBe(1.5);
    expect(mockGainNode.gain.setTargetAtTime).toHaveBeenCalledWith(1.5, 10, 0.02);
  });

  it('adjusts 3-band EQ filters (low, mid, high) within -12dB to +12dB', () => {
    manager.attachSpeaker('user-charlie', mockStream);

    manager.updateProfile('user-charlie', { eqLow: -6, eqMid: 3, eqHigh: 5 });
    const profile = manager.getProfile('user-charlie');

    expect(profile.eqLow).toBe(-6);
    expect(profile.eqMid).toBe(3);
    expect(profile.eqHigh).toBe(5);

    expect(mockFilterNode.gain.setTargetAtTime).toHaveBeenCalled();
  });

  it('sets stereo panner position between Left (-1.0) and Right (+1.0)', () => {
    manager.attachSpeaker('user-david', mockStream);

    manager.updateProfile('user-david', { pan: -0.75 });
    const profile = manager.getProfile('user-david');

    expect(profile.pan).toBe(-0.75);
    expect(mockPannerNode.pan.setTargetAtTime).toHaveBeenCalledWith(-0.75, 10, 0.02);
  });

  it('resets speaker profile back to default', () => {
    manager.attachSpeaker('user-eve', mockStream);
    manager.updateProfile('user-eve', { volume: 1.8, pan: 0.5 });

    const resetProfile = manager.resetSpeaker('user-eve');
    expect(resetProfile).toEqual(DEFAULT_MIXER_PROFILE);
  });
});
