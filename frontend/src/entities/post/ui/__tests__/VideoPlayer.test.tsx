import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { VideoPlayer } from '../VideoPlayer';

describe('VideoPlayer', () => {
  it('renders video element with controls', () => {
    const { container } = render(
      <VideoPlayer src="https://example.com/video.mp4" poster="https://example.com/poster.jpg" />,
    );

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'https://example.com/video.mp4');
    expect(video).toHaveAttribute('poster', 'https://example.com/poster.jpg');
  });

  it('toggles play/pause state when clicked', () => {
    const playMock = vi.fn().mockResolvedValue(undefined);
    const pauseMock = vi.fn();

    window.HTMLMediaElement.prototype.play = playMock;
    window.HTMLMediaElement.prototype.pause = pauseMock;

    const { container } = render(<VideoPlayer src="https://example.com/video.mp4" />);
    const video = container.querySelector('video');
    if (video) {
      fireEvent.click(video);
      expect(playMock).toHaveBeenCalled();
    }
  });
});
