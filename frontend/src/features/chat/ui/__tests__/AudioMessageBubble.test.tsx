import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioMessageBubble } from '../AudioMessageBubble';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';
import { AttachmentView } from '@/entities/chat/model/types';
import React from 'react';

describe('AudioMessageBubble', () => {
  it('renders audio waveform, handles play toggle and speed cycling', () => {
    const attachment = {
      id: 'att-voice-1',
      url: 'https://example.com/voice.ogg',
      type: 'AUDIO' as const,
      fileName: 'voice.ogg',
      size: 1000,
      duration: 30,
    } as unknown as AttachmentView;

    render(
      <AudioMessageBubble
        attachment={attachment}
        senderName="Alice"
        sentAt="12:00"
        conversationId="c1"
      />,
    );

    expect(screen.getByTestId('audio-message-bubble')).toBeInTheDocument();

    const playBtn = screen.getByTitle('Play voice message');
    fireEvent.click(playBtn);

    expect(useActiveMediaPlaybackStore.getState().activeMediaId).toBe('att-voice-1');

    const speedBtn = screen.getByTitle('Toggle playback speed');
    fireEvent.click(speedBtn);
    expect(useActiveMediaPlaybackStore.getState().playbackRate).toBe(1.5);
  });
});
