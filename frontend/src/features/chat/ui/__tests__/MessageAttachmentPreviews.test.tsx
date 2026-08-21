import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaAttachment, AudioAttachment } from '../MessageAttachmentPreviews';
import { AttachmentView } from '@/entities/chat/model/types';
import React from 'react';

describe('MessageAttachmentPreviews', () => {
  it('renders image attachment and handles spoiler reveal', () => {
    const attachment = {
      id: 'att-1',
      url: 'https://example.com/spoiler_pic.png',
      type: 'IMAGE' as const,
      fileName: 'spoiler_pic.png',
      size: 100,
      isSpoiler: true,
    } as unknown as AttachmentView & { isSpoiler?: boolean };

    render(<MediaAttachment attachment={attachment} />);

    expect(screen.getByText('Spoiler')).toBeInTheDocument();

    const spoilerOverlay = screen.getByTitle('Click to reveal spoiler');
    fireEvent.click(spoilerOverlay);

    expect(screen.queryByTitle('Click to reveal spoiler')).not.toBeInTheDocument();
  });

  it('renders audio attachment', () => {
    const attachment = {
      id: 'att-2',
      url: 'https://example.com/song.mp3',
      type: 'AUDIO' as const,
      fileName: 'song.mp3',
      size: 500,
    } as unknown as AttachmentView;

    const { container } = render(<AudioAttachment attachment={attachment} />);
    expect(container.querySelector('audio')).toBeInTheDocument();
  });
});
