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
    const audio = container.querySelector('audio')!;
    expect(audio).toBeInTheDocument();
    fireEvent.loadedMetadata(audio);
    expect(audio).toHaveClass('opacity-100');
  });

  it('renders video attachment, triggers load, and reveals spoiler', () => {
    const videoAttachment = {
      id: 'att-video',
      url: 'https://example.com/spoiler.mp4',
      type: 'VIDEO' as const,
      fileName: 'spoiler.mp4',
      size: 5000,
      isSpoiler: true,
      width: 16,
      height: 9,
    } as unknown as AttachmentView & { isSpoiler?: boolean };

    const { container } = render(<MediaAttachment attachment={videoAttachment} />);

    expect(screen.getByText('Spoiler')).toBeInTheDocument();
    const video = container.querySelector('video')!;
    fireEvent.loadedData(video);
    expect(video).toHaveClass('opacity-100');

    const spoilerBtn = screen.getByTitle('Click to reveal spoiler');
    fireEvent.click(spoilerBtn);
    expect(screen.queryByTitle('Click to reveal spoiler')).not.toBeInTheDocument();
  });

  it('triggers onLoad for non-spoiler image attachment', () => {
    const imgAttachment = {
      id: 'att-plain',
      url: 'https://example.com/plain.png',
      type: 'IMAGE' as const,
      fileName: null,
      size: 200,
      isSpoiler: false,
    } as unknown as AttachmentView;

    const { container } = render(<MediaAttachment attachment={imgAttachment} />);
    const img = container.querySelector('img')!;
    fireEvent.load(img);
    expect(img).toHaveClass('opacity-100');
  });
});
