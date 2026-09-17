import { describe, it, expect, vi } from 'vitest';
import { AudioMixer } from '../webrtc/audioMixer';

describe('AudioMixer', () => {
  it('creates an audio mixer and falls back gracefully when AudioContext is unavailable', () => {
    const mockMicTrack = {
      kind: 'audio',
      enabled: true,
      stop: vi.fn(),
    } as unknown as MediaStreamTrack;

    const mockScreenTrack = {
      kind: 'audio',
      enabled: true,
      stop: vi.fn(),
    } as unknown as MediaStreamTrack;

    const mixer = new AudioMixer(mockMicTrack, mockScreenTrack);
    expect(mixer.getMixedTrack()).toBeDefined();

    mixer.setMicGain(0.8);
    mixer.setScreenGain(0.5);
    mixer.stop();
  });
});
