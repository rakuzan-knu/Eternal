import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initializeMessageNotificationSound,
  playMessageNotificationSound,
  playPreviewNotificationSound,
} from '../messageNotificationSound';
import { useNotificationSettingsStore } from '../../model/useNotificationSettingsStore';

describe('messageNotificationSound', () => {
  let playMock: ReturnType<typeof vi.fn>;
  let pauseMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    playMock = vi.fn().mockResolvedValue(undefined);
    pauseMock = vi.fn();
    window.HTMLMediaElement.prototype.play = playMock;
    window.HTMLMediaElement.prototype.pause = pauseMock;

    useNotificationSettingsStore.setState({
      allowSound: true,
      volume: 80,
    });
  });

  it('initializes event listeners on window and unlocks audio on interaction', async () => {
    const listeners: Record<string, EventListener> = {};
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      listeners[event] = handler as EventListener;
    });

    initializeMessageNotificationSound();
    expect(listeners['pointerdown']).toBeDefined();
    expect(listeners['keydown']).toBeDefined();
    expect(listeners['touchstart']).toBeDefined();

    // Trigger pointerdown
    listeners['pointerdown'](new Event('pointerdown'));
    expect(playMock).toHaveBeenCalled();
  });

  it('plays notification sound when allowSound is true', () => {
    playMessageNotificationSound();
    expect(playMock).toHaveBeenCalled();
  });

  it('does not play sound when allowSound is false and no custom volume passed', () => {
    useNotificationSettingsStore.setState({ allowSound: false });
    playMessageNotificationSound();
    expect(playMock).not.toHaveBeenCalled();
  });

  it('plays preview sound with custom volume percentage', () => {
    playPreviewNotificationSound(50);
    expect(playMock).toHaveBeenCalled();
  });

  it('does not play sound when target volume is 0', () => {
    playMessageNotificationSound(0);
    expect(playMock).not.toHaveBeenCalled();
  });

  it('handles play rejection and attempts unlock', async () => {
    playMock.mockRejectedValueOnce(new Error('Autoplay blocked'));
    playMessageNotificationSound(80);
    // Give promise microtask time to handle catch
    await Promise.resolve();
    expect(playMock).toHaveBeenCalled();
  });

  it('covers unlockAudio lines 32-33 (pause + currentTime reset) via fresh module import', async () => {
    vi.resetModules();

    const freshPlayMock = vi.fn().mockResolvedValue(undefined);
    const freshPauseMock = vi.fn();
    window.HTMLMediaElement.prototype.play = freshPlayMock;
    window.HTMLMediaElement.prototype.pause = freshPauseMock;
    window.HTMLAudioElement.prototype.play = freshPlayMock;
    window.HTMLAudioElement.prototype.pause = freshPauseMock;
    window.Audio.prototype.play = freshPlayMock;
    window.Audio.prototype.pause = freshPauseMock;

    const { initializeMessageNotificationSound: freshInit } =
      await import('../messageNotificationSound');

    const listeners: Record<string, EventListener> = {};
    const addListenerSpy = vi
      .spyOn(window, 'addEventListener')
      .mockImplementation((event: string, handler: any) => {
        listeners[event] = handler;
      });

    freshInit();

    // Simulate user interaction to trigger unlockAudio
    if (listeners['pointerdown']) {
      listeners['pointerdown'](new Event('pointerdown'));
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(freshPlayMock).toHaveBeenCalled();
    expect(freshPauseMock).toHaveBeenCalled();

    addListenerSpy.mockRestore();
  });
});
