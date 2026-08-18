import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GlobalMediaPlaybackBar from '../GlobalMediaPlaybackBar';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';

describe('GlobalMediaPlaybackBar', () => {
  beforeEach(() => {
    useActiveMediaPlaybackStore.getState().stopAll();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  it('renders nothing when no media is active', () => {
    const { container } = render(<GlobalMediaPlaybackBar />);
    expect(container.firstChild).toBeNull();
  });

  it('renders playback controls, sender name, sent time, speed, volume, and close button when media is active', () => {
    useActiveMediaPlaybackStore.getState().setActiveMedia({
      id: 'media-123',
      mediaType: 'voice',
      url: 'https://example.com/audio.webm',
      senderName: 'Артем Донський',
      sentAt: 'July 16 at 18:12',
      duration: 35,
    });

    render(<GlobalMediaPlaybackBar />);

    expect(screen.getByTestId('global-media-playback-bar')).toBeInTheDocument();
    expect(screen.getByText('Артем Донський')).toBeInTheDocument();
    expect(screen.getByText('July 16 at 18:12')).toBeInTheDocument();
    expect(screen.getByTitle('Previous track')).toBeInTheDocument();
    expect(screen.getByTitle('Next track')).toBeInTheDocument();
    expect(screen.getByTitle('Pause')).toBeInTheDocument();
    expect(screen.getByTitle('Mute')).toBeInTheDocument();
    expect(screen.getByTitle('Playback Speed')).toBeInTheDocument();
    expect(screen.getByTitle('Close player')).toBeInTheDocument();
  });

  it('handles speed selection dropdown and closes on speed select', () => {
    useActiveMediaPlaybackStore.getState().setActiveMedia({
      id: 'media-123',
      mediaType: 'video',
      url: 'https://example.com/video.mp4',
      senderName: 'Ayate',
      sentAt: '20:34',
      duration: 20,
    });

    render(<GlobalMediaPlaybackBar />);

    const speedBtn = screen.getByTitle('Playback Speed');
    fireEvent.click(speedBtn);

    expect(screen.getByText('1.5x')).toBeInTheDocument();
    fireEvent.click(screen.getByText('1.5x'));

    expect(useActiveMediaPlaybackStore.getState().playbackRate).toBe(1.5);
  });

  it('handles next and previous track buttons in continuous playlist', () => {
    const item1 = {
      id: 'media-1',
      mediaType: 'voice' as const,
      url: 'https://example.com/voice1.webm',
      senderName: 'Alice',
      sentAt: '12:00',
    };
    const item2 = {
      id: 'media-2',
      mediaType: 'voice' as const,
      url: 'https://example.com/voice2.webm',
      senderName: 'Bob',
      sentAt: '12:05',
    };

    useActiveMediaPlaybackStore.getState().setPlaylist([item1, item2]);
    useActiveMediaPlaybackStore.getState().setActiveMedia(item1);

    render(<GlobalMediaPlaybackBar />);

    const nextBtn = screen.getByTitle('Next track');
    fireEvent.click(nextBtn);

    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBe('media-2');
    expect(screen.getByText('Next: Bob')).toBeInTheDocument();

    const prevBtn = screen.getByTitle('Previous track');
    fireEvent.click(prevBtn);

    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBe('media-1');
  });

  it('handles close button click by resetting active media store', () => {
    useActiveMediaPlaybackStore.getState().setActiveMedia({
      id: 'media-123',
      mediaType: 'voice',
      url: 'https://example.com/voice.webm',
      senderName: 'Ayate',
      sentAt: '20:34',
      duration: 20,
    });

    render(<GlobalMediaPlaybackBar />);

    const closeBtn = screen.getByTitle('Close player');
    fireEvent.click(closeBtn);

    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBeNull();
  });
});
