import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SoundboardEngine, SOUNDBOARD_PRESETS, SoundEffectId } from '../soundboardEngine';

describe('SoundboardEngine', () => {
  let mockAudioContext: any;
  let mockGainNode: any;
  let mockOscillator: any;
  let mockAnalyser: any;
  let mockFilter: any;
  let mockBufferSource: any;

  beforeEach(() => {
    vi.useFakeTimers();

    mockGainNode = {
      gain: {
        value: 1.0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockOscillator = {
      type: 'sine',
      frequency: {
        value: 440,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    };

    mockAnalyser = {
      fftSize: 256,
      smoothingTimeConstant: 0.3,
      connect: vi.fn(),
      disconnect: vi.fn(),
      getFloatTimeDomainData: vi.fn((arr: Float32Array) => {
        arr.fill(0);
      }),
    };

    mockFilter = {
      type: 'bandpass',
      frequency: { setValueAtTime: vi.fn() },
      Q: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockBufferSource = {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockAudioContext = {
      currentTime: 10,
      sampleRate: 48000,
      state: 'running',
      destination: {},
      createGain: vi.fn().mockImplementation(() => ({ ...mockGainNode })),
      createOscillator: vi.fn().mockImplementation(() => ({ ...mockOscillator })),
      createAnalyser: vi.fn().mockImplementation(() => mockAnalyser),
      createBiquadFilter: vi.fn().mockImplementation(() => ({ ...mockFilter })),
      createBufferSource: vi.fn().mockImplementation(() => ({ ...mockBufferSource })),
      createBuffer: vi.fn().mockReturnValue({
        getChannelData: vi.fn().mockReturnValue(new Float32Array(48000)),
      }),
      createMediaStreamSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
      }),
      createMediaStreamDestination: vi.fn().mockReturnValue({
        stream: new (vi.fn() as any)(),
      }),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    (globalThis as any).AudioContext = vi.fn().mockImplementation(() => mockAudioContext);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('has valid soundboard presets', () => {
    expect(SOUNDBOARD_PRESETS.length).toBeGreaterThanOrEqual(6);
    const ids = SOUNDBOARD_PRESETS.map((p) => p.id);
    expect(ids).toContain('airhorn');
    expect(ids).toContain('rimshot');
    expect(ids).toContain('applause');
    expect(ids).toContain('tada');
    expect(ids).toContain('badumtss');
    expect(ids).toContain('boing');
  });

  it('initializes audio graph and nodes correctly', () => {
    const engine = new SoundboardEngine(mockAudioContext);
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(mockAudioContext.createMediaStreamDestination).toHaveBeenCalled();
    engine.destroy();
  });

  it('plays procedural sounds without crashing', () => {
    const engine = new SoundboardEngine(mockAudioContext);
    const soundIds: SoundEffectId[] = [
      'airhorn',
      'rimshot',
      'applause',
      'tada',
      'badumtss',
      'boing',
    ];

    soundIds.forEach((id) => {
      expect(() => engine.play(id)).not.toThrow();
    });

    engine.destroy();
  });

  it('handles sidechain ducking when speech is detected', () => {
    const engine = new SoundboardEngine(mockAudioContext);
    const mockAudioTrack = { kind: 'audio', enabled: true, readyState: 'live' };
    const mockStream = {
      getAudioTracks: vi.fn().mockReturnValue([mockAudioTrack]),
    } as unknown as MediaStream;

    let duckingState = false;
    engine.subscribeDucking((isDucking) => {
      duckingState = isDucking;
    });

    engine.attachLocalMicStream(mockStream);

    // Provide high volume samples to trigger speech detection (RMS > 0.035)
    mockAnalyser.getFloatTimeDomainData.mockImplementation((arr: Float32Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = 0.2; // Loud speech sample
      }
    });

    // Advance timer by 60ms to trigger ducking check
    vi.advanceTimersByTime(60);

    expect(engine.getIsDucking()).toBe(true);
    expect(duckingState).toBe(true);

    // Provide silence
    mockAnalyser.getFloatTimeDomainData.mockImplementation((arr: Float32Array) => {
      arr.fill(0);
    });

    // Advance by hold duration (~300ms)
    vi.advanceTimersByTime(350);

    expect(engine.getIsDucking()).toBe(false);
    expect(duckingState).toBe(false);

    engine.destroy();
  });

  it('broadcasts sound events via RTCDataChannel and handles incoming triggers', () => {
    const engine = new SoundboardEngine(mockAudioContext);
    const mockDataChannel = {
      readyState: 'open',
      send: vi.fn(),
    } as unknown as RTCDataChannel;

    engine.broadcastPlay('airhorn', mockDataChannel);
    expect(mockDataChannel.send).toHaveBeenCalledTimes(1);
    const sentData = JSON.parse((mockDataChannel.send as any).mock.calls[0][0]);
    expect(sentData.type).toBe('SOUNDBOARD_PLAY');
    expect(sentData.soundId).toBe('airhorn');

    // Handle remote incoming message
    const handled = engine.handleDataChannelMessage(
      JSON.stringify({ type: 'SOUNDBOARD_PLAY', soundId: 'tada' }),
    );
    expect(handled).toBe(true);

    const ignored = engine.handleDataChannelMessage(
      JSON.stringify({ type: 'CHAT_MESSAGE', text: 'hello' }),
    );
    expect(ignored).toBe(false);

    engine.destroy();
  });

  it('respects mute setting and cleans up properly', () => {
    const engine = new SoundboardEngine(mockAudioContext);
    engine.setMuted(true);

    const initialOscCount = mockAudioContext.createOscillator.mock.calls.length;
    engine.play('boing');
    expect(mockAudioContext.createOscillator.mock.calls.length).toBe(initialOscCount);

    engine.destroy();
    expect(mockAudioContext.close).toHaveBeenCalled();
  });
});
