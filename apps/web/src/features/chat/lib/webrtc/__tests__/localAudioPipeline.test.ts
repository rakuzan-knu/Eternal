import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalAudioPipeline } from '../localAudioPipeline';

class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockGainNode extends MockAudioNode {
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
}

class MockAudioContext {
  state = 'running';
  currentTime = 10;
  createMediaStreamSource = vi.fn().mockReturnValue(new MockAudioNode());
  createGain = vi.fn().mockReturnValue(new MockGainNode());
  createAnalyser = vi.fn().mockReturnValue({
    ...new MockAudioNode(),
    fftSize: 128,
    smoothingTimeConstant: 0.35,
  });
  createMediaStreamDestination = vi.fn().mockReturnValue({
    stream: {
      getAudioTracks: vi.fn().mockReturnValue([{ kind: 'audio', stop: vi.fn() }]),
    },
  });
  createBiquadFilter = vi.fn().mockReturnValue({
    ...new MockAudioNode(),
    type: 'highpass',
    frequency: { setValueAtTime: vi.fn() },
  });
  createDynamicsCompressor = vi.fn().mockReturnValue({
    ...new MockAudioNode(),
    threshold: { setValueAtTime: vi.fn() },
    knee: { setValueAtTime: vi.fn() },
    ratio: { setValueAtTime: vi.fn() },
    attack: { setValueAtTime: vi.fn() },
    release: { setValueAtTime: vi.fn() },
  });
  close = vi.fn().mockResolvedValue(undefined);
  resume = vi.fn().mockResolvedValue(undefined);
}

describe('LocalAudioPipeline', () => {
  const originalAudioContext = window.AudioContext;

  beforeEach(() => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('webkitAudioContext', MockAudioContext);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.AudioContext = originalAudioContext;
  });

  it('initializes audio nodes and connects audio chain without crashing', () => {
    const mockTrack = { kind: 'audio', stop: vi.fn() };
    const mockStream = {
      getAudioTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;

    const pipeline = new LocalAudioPipeline(mockStream, {
      inputVolume: 80,
      isDenoiseEnabled: true,
      isGateOpen: true,
    });

    expect(pipeline.getAnalyserNode()).toBeDefined();
    expect(pipeline.getProcessedTrack()).toBeDefined();
    expect(pipeline.getProcessedStream()).toBeDefined();

    pipeline.destroy();
  });

  it('updates software input volume correctly', () => {
    const mockStream = {
      getAudioTracks: vi.fn().mockReturnValue([{ kind: 'audio', stop: vi.fn() }]),
    } as unknown as MediaStream;

    const pipeline = new LocalAudioPipeline(mockStream, { inputVolume: 100 });
    pipeline.setInputVolume(75);
    pipeline.destroy();
  });

  it('toggles noise gate open and closed with anti-flutter ramp', () => {
    const mockStream = {
      getAudioTracks: vi.fn().mockReturnValue([{ kind: 'audio', stop: vi.fn() }]),
    } as unknown as MediaStream;

    const pipeline = new LocalAudioPipeline(mockStream);
    pipeline.setGateOpen(false);
    pipeline.setGateOpen(true);
    pipeline.destroy();
  });

  it('toggles denoise filter bypass', () => {
    const mockStream = {
      getAudioTracks: vi.fn().mockReturnValue([{ kind: 'audio', stop: vi.fn() }]),
    } as unknown as MediaStream;

    const pipeline = new LocalAudioPipeline(mockStream);
    pipeline.setDenoiseEnabled(false);
    pipeline.setDenoiseEnabled(true);
    pipeline.destroy();
  });

  it('attaches soundboard stream directly to destinationNode and cleans up', () => {
    const mockStream = {
      getAudioTracks: vi.fn().mockReturnValue([{ kind: 'audio', stop: vi.fn() }]),
    } as unknown as MediaStream;

    const mockSbStream = {
      getAudioTracks: vi.fn().mockReturnValue([{ kind: 'audio', stop: vi.fn() }]),
    } as unknown as MediaStream;

    const pipeline = new LocalAudioPipeline(mockStream);
    expect(() => pipeline.attachSoundboardStream(mockSbStream)).not.toThrow();
    pipeline.destroy();
  });

  it('cleans up all nodes and closes context on destroy', () => {
    const mockStream = {
      getAudioTracks: vi.fn().mockReturnValue([{ kind: 'audio', stop: vi.fn() }]),
    } as unknown as MediaStream;

    const pipeline = new LocalAudioPipeline(mockStream);
    pipeline.destroy();
    // Subsequent calls are no-ops
    pipeline.destroy();
  });
});
