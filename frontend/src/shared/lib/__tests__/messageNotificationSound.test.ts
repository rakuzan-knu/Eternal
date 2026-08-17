import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initializeMessageNotificationSound,
  playMessageNotificationSound,
  playPreviewNotificationSound,
} from '../messageNotificationSound';
import { useNotificationSettingsStore } from '@/shared/model/useNotificationSettingsStore';

describe('messageNotificationSound', () => {
  let playMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    playMock = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.play = playMock;
    window.HTMLMediaElement.prototype.pause = vi.fn();

    useNotificationSettingsStore.setState({
      allowSound: true,
      volume: 80,
    });
  });

  it('initializes event listeners on window', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    initializeMessageNotificationSound();
    expect(addEventListenerSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), {
      passive: true,
    });
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
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
});
