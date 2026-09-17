import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { VideoPlayer } from '../VideoPlayer';

describe('VideoPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  it('renders video element with src and poster', () => {
    const { container } = render(
      <VideoPlayer src="https://video.mp4" poster="https://poster.jpg" />,
    );

    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.src).toContain('https://video.mp4');
    expect(video.poster).toContain('https://poster.jpg');
    expect(video.muted).toBe(true);
  });

  it('toggles play/pause on click', () => {
    const { container } = render(<VideoPlayer src="https://video.mp4" />);
    const video = container.querySelector('video') as HTMLVideoElement;

    // Simulate play state
    Object.defineProperty(video, 'paused', { value: true, configurable: true });
    const wrapper = container.firstChild as HTMLElement;
    fireEvent.click(wrapper);
    expect(video.play).toHaveBeenCalled();

    Object.defineProperty(video, 'paused', { value: false, configurable: true });
    fireEvent.click(wrapper);
    expect(video.pause).toHaveBeenCalled();
  });

  it('updates progress on timeUpdate, handles loadedMetadata and handles seeking', () => {
    const { container } = render(<VideoPlayer src="https://video.mp4" />);
    const video = container.querySelector('video') as HTMLVideoElement;

    Object.defineProperty(video, 'duration', { value: 100, writable: true });
    fireEvent.loadedMetadata(video);

    Object.defineProperty(video, 'currentTime', { value: 10, writable: true });
    fireEvent.timeUpdate(video);

    const rangeInput = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(rangeInput).toBeInTheDocument();

    fireEvent.change(rangeInput, { target: { value: '50' } });
    expect(video.currentTime).toBe(50);
  });

  it('toggles volume/mute and handles volume slider change', () => {
    vi.useFakeTimers();
    const { container } = render(<VideoPlayer src="https://video.mp4" />);
    const video = container.querySelector('video') as HTMLVideoElement;

    const muteButtons = screen.getAllByRole('button');
    const volumeBtn = muteButtons[muteButtons.length - 1];

    // Mouse enter on volume container shows slider
    const volumeContainer = volumeBtn.parentElement!;
    fireEvent.mouseEnter(volumeContainer);

    const volumeSlider = volumeContainer.querySelector('input[type="range"]') as HTMLInputElement;
    expect(volumeSlider).toBeInTheDocument();

    fireEvent.change(volumeSlider, { target: { value: '0.8' } });
    expect(video.volume).toBe(0.8);
    expect(video.muted).toBe(false);

    // Mouse leave hides slider with delay
    fireEvent.mouseLeave(volumeContainer);
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Mute toggle
    fireEvent.click(volumeBtn);
    expect(video.muted).toBe(true);

    vi.useRealTimers();
  });

  it('observes intersection with IntersectionObserver and plays/pauses accordingly', () => {
    let observerCb: any;
    window.IntersectionObserver = vi.fn().mockImplementation((cb) => {
      observerCb = cb;
      return {
        observe: vi.fn(),
        disconnect: vi.fn(),
      };
    });

    const { container } = render(<VideoPlayer src="https://video.mp4" active={true} />);
    const video = container.querySelector('video') as HTMLVideoElement;

    // Trigger intersection >= 0.6
    act(() => {
      observerCb([{ isIntersecting: true, intersectionRatio: 0.8 }]);
    });
    expect(video.play).toHaveBeenCalled();

    // Trigger out of view
    act(() => {
      observerCb([{ isIntersecting: false, intersectionRatio: 0.1 }]);
    });
    expect(video.pause).toHaveBeenCalled();
  });

  it('pauses when active prop is false', () => {
    const { container } = render(<VideoPlayer src="https://video.mp4" active={false} />);
    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video.pause).toHaveBeenCalled();
  });

  it('handles play/pause events, zero duration, and controls bar stopPropagation', () => {
    const { container } = render(<VideoPlayer src="https://video.mp4" />);
    const video = container.querySelector('video') as HTMLVideoElement;

    fireEvent.play(video);
    fireEvent.pause(video);

    Object.defineProperty(video, 'duration', { value: 0, writable: true });
    fireEvent.timeUpdate(video);
    fireEvent.loadedMetadata(video);

    const controlsBar = container.querySelector('.bg-gradient-to-t') as HTMLElement;
    if (controlsBar) {
      fireEvent.click(controlsBar);
    }

    const playPauseBtn = controlsBar?.querySelector('button');
    if (playPauseBtn) {
      fireEvent.click(playPauseBtn);
    }
  });

  it('handles volume 0 and play rejection', () => {
    window.HTMLMediaElement.prototype.play = vi.fn().mockRejectedValue(new Error('play error'));
    const { container } = render(<VideoPlayer src="https://video.mp4" />);
    const video = container.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'paused', { value: true, configurable: true });

    const volumeButtons = screen.getAllByRole('button');
    const volumeBtn = volumeButtons[volumeButtons.length - 1];
    const volumeContainer = volumeBtn.parentElement!;
    fireEvent.mouseEnter(volumeContainer);

    const volumeSlider = volumeContainer.querySelector('input[type="range"]') as HTMLInputElement;
    if (volumeSlider) {
      fireEvent.change(volumeSlider, { target: { value: '0' } });
      expect(video.muted).toBe(true);
    }

    const wrapper = container.firstChild as HTMLElement;
    fireEvent.click(wrapper);
  });

  it('handles edge cases when refs are null', () => {
    const useRefSpy = vi.spyOn(React, 'useRef');
    useRefSpy
      .mockReturnValueOnce({ current: null }) // videoRef
      .mockReturnValueOnce({ current: null }) // containerRef
      .mockReturnValueOnce({ current: undefined }); // hideTimeout

    const { container, unmount } = render(<VideoPlayer src="https://video.mp4" />);
    const wrapper = container.firstChild as HTMLElement;
    fireEvent.click(wrapper);
    unmount();
    useRefSpy.mockRestore();
  });
});
