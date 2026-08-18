import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoNoteBubble } from '../VideoNoteBubble';
import type { AttachmentView } from '@/entities/chat/model/types';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';

describe('VideoNoteBubble', () => {
  const mockAttachment: AttachmentView = {
    id: 'att-video-1',
    type: 'VIDEO',
    url: 'https://example.com/video_note.mp4',
    fileName: 'video_note.mp4',
    mimeType: 'video/mp4',
    size: 1048576,
    width: 480,
    height: 480,
    duration: 20,
    thumbnailUrl: null,
  };

  beforeEach(() => {
    useActiveMediaPlaybackStore.getState().stopAll();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();

    // Mock IntersectionObserver
    window.IntersectionObserver = vi.fn().mockImplementation((cb) => ({
      observe: vi.fn(() => cb([{ isIntersecting: true }])),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  it('renders circular video note with progress ring and mute capsule', () => {
    render(<VideoNoteBubble attachment={mockAttachment} />);

    expect(screen.getByTestId('video-note-bubble')).toBeInTheDocument();
    expect(screen.getByText('0:20')).toBeInTheDocument();
  });

  it('toggles audio mute and updates global active media on click', () => {
    render(<VideoNoteBubble attachment={mockAttachment} />);

    const bubble = screen.getByTestId('video-note-bubble');
    fireEvent.click(bubble);

    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBe('att-video-1');
  });
});
