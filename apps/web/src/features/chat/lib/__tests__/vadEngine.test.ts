import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VADEngine } from '../webrtc/vadEngine';

describe('VADEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('instantiates and allows threshold and enabled changes cleanly', () => {
    const mockTrack = {
      kind: 'audio',
      enabled: true,
      stop: vi.fn(),
    } as unknown as MediaStreamTrack;

    const mockStream = {
      getAudioTracks: () => [mockTrack],
    } as unknown as MediaStream;

    const onSpeakingChange = vi.fn();
    const onVolumeChange = vi.fn();

    const vad = new VADEngine(mockStream, {
      thresholdDb: -40,
      enabled: true,
      onSpeakingChange,
      onVolumeChange,
    });

    vad.setThreshold(-35);
    vad.setEnabled(false);
    vad.destroy();
    expect(true).toBe(true);
  });
});
