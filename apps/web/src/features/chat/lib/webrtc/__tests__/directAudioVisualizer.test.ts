import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DirectAudioVisualizer } from '../directAudioVisualizer';

describe('DirectAudioVisualizer (Zero-Re-render CSS Variables via rAF)', () => {
  let mockElement: HTMLElement;
  let mockStream: MediaStream;
  let mockAnalyser: {
    fftSize: number;
    smoothingTimeConstant: number;
    frequencyBinCount: number;
    getByteFrequencyData: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
  let mockSourceNode: {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
  let mockAudioContext: {
    createAnalyser: ReturnType<typeof vi.fn>;
    createMediaStreamSource: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    state: string;
  };

  beforeEach(() => {
    mockElement = document.createElement('div');

    mockAnalyser = {
      fftSize: 256,
      smoothingTimeConstant: 0.5,
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn((arr: Uint8Array) => {
        arr.fill(128); // Simulating active audio speech (~50% amplitude)
      }),
      disconnect: vi.fn(),
    };

    mockSourceNode = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockAudioContext = {
      createAnalyser: vi.fn().mockReturnValue(mockAnalyser),
      createMediaStreamSource: vi.fn().mockReturnValue(mockSourceNode),
      close: vi.fn().mockResolvedValue(undefined),
      state: 'running',
    };

    const mockTrack = { kind: 'audio', enabled: true } as unknown as MediaStreamTrack;
    mockStream = {
      getAudioTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;

    vi.stubGlobal(
      'AudioContext',
      vi.fn().mockImplementation(() => mockAudioContext),
    );
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => setTimeout(cb, 16)),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((id: number) => clearTimeout(id)),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('connects audio nodes and mutates CSS custom variables directly on DOM element', async () => {
    const onSpeakingChange = vi.fn();
    const visualizer = new DirectAudioVisualizer(mockElement, mockStream, {
      onSpeakingChange,
    });

    expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    expect(mockSourceNode.connect).toHaveBeenCalledWith(mockAnalyser);

    // Wait 50ms for rAF iterations to run
    await new Promise((r) => setTimeout(r, 60));

    const volume = mockElement.style.getPropertyValue('--volume');
    const scale = mockElement.style.getPropertyValue('--speech-scale');
    const glow = mockElement.style.getPropertyValue('--volume-glow');

    expect(Number(volume)).toBeGreaterThan(0);
    expect(scale).toContain('1.');
    expect(glow).toContain('px');
    expect(onSpeakingChange).toHaveBeenCalledWith(true);

    visualizer.destroy();
  });

  it('resets CSS variables when paused (isMuted = true)', async () => {
    const visualizer = new DirectAudioVisualizer(mockElement, mockStream);
    await new Promise((r) => setTimeout(r, 40));

    visualizer.setPaused(true);

    expect(mockElement.style.getPropertyValue('--volume')).toBe('0');
    expect(mockElement.style.getPropertyValue('--speech-scale')).toBe('1');
    expect(mockElement.style.getPropertyValue('--volume-glow')).toBe('0px');

    visualizer.destroy();
  });

  it('cleans up CSS properties and disconnects audio on destroy', () => {
    const visualizer = new DirectAudioVisualizer(mockElement, mockStream);
    visualizer.destroy();

    expect(mockSourceNode.disconnect).toHaveBeenCalled();
    expect(mockAnalyser.disconnect).toHaveBeenCalled();
    expect(mockAudioContext.close).toHaveBeenCalled();

    expect(mockElement.style.getPropertyValue('--volume')).toBe('');
    expect(mockElement.style.getPropertyValue('--speech-scale')).toBe('');
  });
});
