import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audioCoordinator } from '../audioCoordinator';

describe('audioCoordinator', () => {
  beforeEach(() => {
    audioCoordinator.stop();
  });

  it('plays an audio element and stops the previous one', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const audio1 = {
      pause: vi.fn(),
      currentTime: 10,
    } as unknown as HTMLAudioElement;

    const audio2 = {
      pause: vi.fn(),
      currentTime: 5,
    } as unknown as HTMLAudioElement;

    audioCoordinator.play(audio1, 'track-1');
    expect(audioCoordinator.getActiveId()).toBe('track-1');
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'app:audio-play',
        detail: { id: 'track-1' },
      }),
    );

    // Play second audio
    audioCoordinator.play(audio2, 'track-2');
    expect(audio1.pause).toHaveBeenCalled();
    expect(audio1.currentTime).toBe(10);
    expect(audioCoordinator.getActiveId()).toBe('track-2');
  });

  it('handles errors gracefully when pausing active audio', () => {
    const audio1 = {
      pause: vi.fn().mockImplementation(() => {
        throw new Error('Pause failed');
      }),
      currentTime: 10,
    } as unknown as HTMLAudioElement;

    const audio2 = {
      pause: vi.fn(),
      currentTime: 0,
    } as unknown as HTMLAudioElement;

    audioCoordinator.play(audio1, 'track-1');
    expect(() => audioCoordinator.play(audio2, 'track-2')).not.toThrow();
    expect(audioCoordinator.getActiveId()).toBe('track-2');
  });

  it('stops active audio by matching id or without id', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const audio1 = {
      pause: vi.fn(),
      currentTime: 10,
    } as unknown as HTMLAudioElement;

    audioCoordinator.play(audio1, 'track-1');
    // Stop non-matching id -> does nothing
    audioCoordinator.stop('other-id');
    expect(audioCoordinator.getActiveId()).toBe('track-1');

    // Stop matching id
    audioCoordinator.stop('track-1', true);
    expect(audio1.pause).toHaveBeenCalled();
    expect(audio1.currentTime).toBe(0);
    expect(audioCoordinator.getActiveId()).toBeNull();
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'app:audio-stop',
        detail: { id: 'track-1' },
      }),
    );
  });

  it('handles error when stopping audio', () => {
    const audio1 = {
      pause: vi.fn().mockImplementation(() => {
        throw new Error('Pause error');
      }),
      currentTime: 10,
    } as unknown as HTMLAudioElement;

    audioCoordinator.play(audio1, 'track-1');
    expect(() => audioCoordinator.stop()).not.toThrow();
    expect(audioCoordinator.getActiveId()).toBeNull();
  });
});
