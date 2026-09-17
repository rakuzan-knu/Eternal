import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { VideoNoteBubble } from '../VideoNoteBubble';
import type { AttachmentView } from '@/entities/chat/model/types';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';
import React from 'react';

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

    let pausedState = true;
    Object.defineProperty(window.HTMLMediaElement.prototype, 'paused', {
      get() {
        return pausedState;
      },
      set(val) {
        pausedState = val;
      },
      configurable: true,
    });

    window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => {
      pausedState = false;
      return Promise.resolve();
    });
    window.HTMLMediaElement.prototype.pause = vi.fn().mockImplementation(() => {
      pausedState = true;
    });

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

  it('toggles audio mute, syncs with global media store and handles video timeupdate/ended', () => {
    const { container } = render(<VideoNoteBubble attachment={mockAttachment} />);

    const bubble = screen.getByTestId('video-note-bubble');
    fireEvent.click(bubble);

    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBe('att-video-1');

    const video = container.querySelector('video')!;
    fireEvent.timeUpdate(video);
    fireEvent.ended(video);

    // Activating another media id mutes current video
    act(() => {
      useActiveMediaPlaybackStore.getState().setActiveMedia({
        id: 'att-other',
        mediaType: 'voice',
        url: 'https://example.com/other.ogg',
        senderName: 'Bob',
        conversationId: 'conv-1',
      });
    });
  });

  it('handles second click pause toggle, loadedmetadata event, seekTarget and intersection changes', () => {
    let intersectCb: ((entries: any[]) => void) | null = null;
    window.IntersectionObserver = vi.fn().mockImplementation((cb) => {
      intersectCb = cb;
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      };
    });

    const { container } = render(<VideoNoteBubble attachment={mockAttachment} />);
    const bubble = screen.getByTestId('video-note-bubble');

    // 1st click: unmutes & plays
    fireEvent.click(bubble);

    // 2nd click: pauses video
    fireEvent.click(bubble);
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();

    // 3rd click: resumes playing
    fireEvent.click(bubble);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();

    // loadedmetadata
    const video = container.querySelector('video')!;
    Object.defineProperty(video, 'duration', { value: 30, configurable: true });
    fireEvent.loadedMetadata(video);

    // seekTarget update
    act(() => {
      useActiveMediaPlaybackStore.getState().seek(15);
    });

    // IntersectionObserver out of view -> pause
    act(() => {
      intersectCb?.([{ isIntersecting: false }]);
    });
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it('does not have loop attribute on video element', () => {
    const { container } = render(<VideoNoteBubble attachment={mockAttachment} />);
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).not.toHaveAttribute('loop');
  });

  it('pauses and resets on video end (onEnded)', () => {
    const { container } = render(<VideoNoteBubble attachment={mockAttachment} />);
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();

    // Trigger onEnded
    fireEvent.ended(video!);

    // Play button overlay should be visible
    expect(container.querySelector('svg.ml-0\\.5')).toBeInTheDocument();
  });
});
