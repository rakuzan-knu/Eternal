import { render, screen, fireEvent } from '@testing-library/react';
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

  it('updates progress on timeUpdate and handles seeking', () => {
    const { container } = render(<VideoPlayer src="https://video.mp4" />);
    const video = container.querySelector('video') as HTMLVideoElement;

    Object.defineProperty(video, 'currentTime', { value: 10, writable: true });
    Object.defineProperty(video, 'duration', { value: 100, writable: true });
    fireEvent.timeUpdate(video);

    const rangeInput = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(rangeInput).toBeInTheDocument();

    fireEvent.change(rangeInput, { target: { value: '50' } });
    expect(video.currentTime).toBe(50);
  });

  it('toggles volume/mute on volume button click', () => {
    const { container } = render(<VideoPlayer src="https://video.mp4" />);
    const video = container.querySelector('video') as HTMLVideoElement;

    const muteButtons = screen.getAllByRole('button');
    const volumeBtn = muteButtons[muteButtons.length - 1];

    fireEvent.click(volumeBtn);
    expect(video.muted).toBe(false);

    fireEvent.click(volumeBtn);
    expect(video.muted).toBe(true);
  });

  it('pauses when active prop is false', () => {
    const { container } = render(<VideoPlayer src="https://video.mp4" active={false} />);
    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video.pause).toHaveBeenCalled();
  });
});
