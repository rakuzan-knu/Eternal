import { describe, it, expect, vi } from 'vitest';
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

  it('renders video attachment, triggers load, displays glass countdown badge, and handles clicks to open media', () => {
    const onOpenMedia = vi.fn();
    const videoAttachment = {
      id: 'att-video',
      url: 'https://example.com/clip.webm',
      type: 'FILE' as const,
      fileName: 'clip.webm',
      size: 5000,
      isSpoiler: false,
      width: 16,
      height: 9,
    } as unknown as AttachmentView;

    const { container } = render(
      <MediaAttachment attachment={videoAttachment} onOpenMedia={onOpenMedia} />,
    );

    const video = container.querySelector('video')!;
    expect(video).toBeInTheDocument();
    expect(video.controls).toBe(false);
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.autoplay).toBe(true);

    // Simulate loadedMetadata with duration 42 seconds
    Object.defineProperty(video, 'duration', { value: 42, configurable: true });
    fireEvent.loadedMetadata(video);

    // Expect glass timer badge with 0:42
    expect(screen.getByText('0:42')).toBeInTheDocument();

    // Clicking the video triggers onOpenMedia
    fireEvent.click(video);
    expect(onOpenMedia).toHaveBeenCalledWith(videoAttachment, expect.any(Object));
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
