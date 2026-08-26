import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AudioMessageBubble, VoiceMessagePlayer } from '../AudioMessageBubble';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';
import { AttachmentView } from '@/entities/chat/model/types';
import React from 'react';

describe('AudioMessageBubble / VoiceMessagePlayer', () => {
  beforeEach(() => {
    useActiveMediaPlaybackStore.getState().stopAll();
  });

  it('exports VoiceMessagePlayer alias pointing to AudioMessageBubble', () => {
    expect(VoiceMessagePlayer).toBe(AudioMessageBubble);
  });

  it('renders exactly 45 waveform bars and Telegram-style layout', () => {
    const attachment: AttachmentView & { waveform?: number[] } = {
      id: 'att-voice-1',
      url: 'https://example.com/voice.ogg',
      type: 'AUDIO' as const,
      fileName: 'voice.ogg',
      mimeType: 'audio/ogg',
      size: 1000,
      duration: 30,
      width: null,
      height: null,
      thumbnailUrl: null,
      waveform: [0.1, 0.5, 0.9],
    };

    render(
      <AudioMessageBubble
        attachment={attachment}
        senderName="Alice"
        sentAt="18:11"
        conversationId="c1"
      />,
    );

    expect(screen.getByTestId('audio-message-bubble')).toBeInTheDocument();
    expect(screen.getByTestId('waveform-renderer')).toBeInTheDocument();

    // Check that exactly 45 bars are rendered
    for (let i = 0; i < 45; i++) {
      expect(screen.getByTestId(`waveform-bar-${i}`)).toBeInTheDocument();
    }

    // Timecode displays 00:30 when idle
    expect(screen.getByText('00:30')).toBeInTheDocument();
    // Sent time is displayed
    expect(screen.getByText('18:11')).toBeInTheDocument();
  });

  it('handles play toggle and displays timecode during playback', () => {
    const attachment: AttachmentView = {
      id: 'att-voice-2',
      url: 'https://example.com/voice.ogg',
      type: 'AUDIO' as const,
      fileName: 'voice.ogg',
      mimeType: 'audio/ogg',
      size: 1000,
      duration: 26,
      width: null,
      height: null,
      thumbnailUrl: null,
    };

    render(
      <AudioMessageBubble
        attachment={attachment}
        senderName="Bob"
        sentAt="21:35"
        conversationId="c1"
      />,
    );

    const playBtn = screen.getByTitle('Play voice message');
    fireEvent.click(playBtn);

    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBe('att-voice-2');
    expect(useActiveMediaPlaybackStore.getState().isPlaying).toBe(true);

    // Update store currentTime to simulate playback
    act(() => {
      useActiveMediaPlaybackStore.getState().setCurrentTime(2);
      useActiveMediaPlaybackStore.getState().setIsLoading(false);
    });

    // Timecode should show 00:02 / 00:26
    expect(screen.getByText('00:02 / 00:26')).toBeInTheDocument();
  });

  it('shows loading spinner when buffering audio', () => {
    const attachment: AttachmentView = {
      id: 'att-voice-3',
      url: 'https://example.com/voice.ogg',
      type: 'AUDIO' as const,
      fileName: 'voice.ogg',
      mimeType: 'audio/ogg',
      size: 1000,
      duration: 15,
      width: null,
      height: null,
      thumbnailUrl: null,
    };

    render(<AudioMessageBubble attachment={attachment} senderName="Bob" conversationId="c1" />);

    const playBtn = screen.getByTitle('Play voice message');
    fireEvent.click(playBtn);

    // By default when activated, isLoading is set to true
    expect(screen.getByTitle('Buffering audio...')).toBeInTheDocument();
  });

  it('handles seeking via pointer interactions and tooltip display', () => {
    const attachment: AttachmentView = {
      id: 'att-voice-4',
      url: 'https://example.com/voice.ogg',
      type: 'AUDIO' as const,
      fileName: 'voice.ogg',
      mimeType: 'audio/ogg',
      size: 1000,
      duration: 60,
      width: null,
      height: null,
      thumbnailUrl: null,
    };

    render(<AudioMessageBubble attachment={attachment} senderName="Bob" conversationId="c1" />);

    const waveform = screen.getByTestId('waveform-renderer');

    const getBoundingClientRectSpy = vi.spyOn(waveform, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 24,
      right: 200,
      bottom: 24,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // Pointer down at 50% (x=100)
    const downEvent = new Event('pointerdown', { bubbles: true }) as any;
    downEvent.clientX = 100;
    downEvent.pointerId = 1;
    fireEvent(waveform, downEvent);

    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBe('att-voice-4');

    // Pointer move to 75% (x=150)
    const moveEvent = new Event('pointermove', { bubbles: true }) as any;
    moveEvent.clientX = 150;
    moveEvent.pointerId = 1;
    fireEvent(waveform, moveEvent);

    // Tooltip should be visible showing 00:45 (75% of 60s)
    const tooltip = screen.getByTestId('waveform-tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('00:45');

    // Pointer up
    const upEvent = new Event('pointerup', { bubbles: true }) as any;
    upEvent.clientX = 150;
    upEvent.pointerId = 1;
    fireEvent(waveform, upEvent);

    getBoundingClientRectSpy.mockRestore();
  });

  it('cycles playback speed on speed badge click', () => {
    const attachment: AttachmentView = {
      id: 'att-voice-5',
      url: 'https://example.com/voice.ogg',
      type: 'AUDIO' as const,
      fileName: 'voice.ogg',
      mimeType: 'audio/ogg',
      size: 1000,
      duration: 30,
      width: null,
      height: null,
      thumbnailUrl: null,
    };

    render(<AudioMessageBubble attachment={attachment} senderName="Alice" conversationId="c1" />);

    const speedBtn = screen.getByTitle('Toggle playback speed');
    expect(speedBtn).toHaveTextContent('1x');

    fireEvent.click(speedBtn);
    expect(useActiveMediaPlaybackStore.getState().playbackRate).toBe(1.5);
    expect(speedBtn).toHaveTextContent('1.5x');

    fireEvent.click(speedBtn);
    expect(useActiveMediaPlaybackStore.getState().playbackRate).toBe(2);

    fireEvent.click(speedBtn);
    expect(useActiveMediaPlaybackStore.getState().playbackRate).toBe(0.5);

    fireEvent.click(speedBtn);
    expect(useActiveMediaPlaybackStore.getState().playbackRate).toBe(1);
  });
});
