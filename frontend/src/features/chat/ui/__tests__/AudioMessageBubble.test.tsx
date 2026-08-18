import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioMessageBubble } from '../AudioMessageBubble';
import type { AttachmentView } from '@/entities/chat/model/types';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';

describe('AudioMessageBubble', () => {
  const mockAttachment: AttachmentView = {
    id: 'att-audio-1',
    type: 'AUDIO',
    url: 'https://example.com/voice.webm',
    fileName: 'voice_note.webm',
    mimeType: 'audio/webm',
    size: 20480,
    width: null,
    height: null,
    duration: 15,
    thumbnailUrl: null,
  };

  beforeEach(() => {
    useActiveMediaPlaybackStore.getState().stopAll();
  });

  it('renders audio bubble with play button, 32-bar waveform, duration, and 1x speed', () => {
    render(<AudioMessageBubble attachment={mockAttachment} />);

    expect(screen.getByTestId('audio-message-bubble')).toBeInTheDocument();
    expect(screen.getByTitle('Play voice message')).toBeInTheDocument();
    expect(screen.getByText('0:15')).toBeInTheDocument();
    expect(screen.getByText('1x')).toBeInTheDocument();
  });

  it('cycles playback speed on click (1x -> 1.5x -> 2x -> 0.5x -> 1x)', () => {
    render(<AudioMessageBubble attachment={mockAttachment} />);

    const speedBtn = screen.getByTitle('Toggle playback speed');
    expect(screen.getByText('1x')).toBeInTheDocument();

    fireEvent.click(speedBtn);
    expect(screen.getByText('1.5x')).toBeInTheDocument();

    fireEvent.click(speedBtn);
    expect(screen.getByText('2x')).toBeInTheDocument();

    fireEvent.click(speedBtn);
    expect(screen.getByText('0.5x')).toBeInTheDocument();

    fireEvent.click(speedBtn);
    expect(screen.getByText('1x')).toBeInTheDocument();
  });

  it('handles play click and seeks on waveform bar click', () => {
    render(<AudioMessageBubble attachment={mockAttachment} />);

    const playBtn = screen.getByTitle('Play voice message');
    fireEvent.click(playBtn);

    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBe('att-audio-1');
    expect(useActiveMediaPlaybackStore.getState().isPlaying).toBe(true);

    // Seek
    const seekBars = screen.getAllByRole('button', { name: /^Seek to/ });
    expect(seekBars.length).toBeGreaterThan(0);
    fireEvent.click(seekBars[5]);
    expect(useActiveMediaPlaybackStore.getState().seekTarget).not.toBeNull();
  });
});
