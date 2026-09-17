import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MediaLightbox from '../MediaLightbox';
import { MediaItem } from '../../model/chatMediaTypes';
import { MessageView, AttachmentView } from '@/entities/chat/model/types';
import React from 'react';

describe('MediaLightbox', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const items: MediaItem[] = [
    {
      message: {
        id: 'm1',
        conversationId: 'c1',
        senderId: 'u1',
        sender: { id: 'u1', username: 'alice', displayName: null, avatar: null },
        body: 'photo',
        createdAt: '2026-01-01',
        reactions: [],
        attachments: [],
      } as unknown as MessageView,
      attachment: {
        id: 'a1',
        type: 'IMAGE',
        url: 'https://example.com/photo.png',
        fileName: 'photo.png',
        size: 1024,
      } as unknown as AttachmentView,
    },
    {
      message: {
        id: 'm2',
        conversationId: 'c1',
        senderId: 'u2',
        sender: { id: 'u2', username: 'bob', displayName: 'Bob', avatar: null },
        body: 'video',
        createdAt: '2026-01-02',
        reactions: [],
        attachments: [],
      } as unknown as MessageView,
      attachment: {
        id: 'a2',
        type: 'VIDEO',
        url: 'https://example.com/video.mp4',
        fileName: null,
        size: 2048,
      } as unknown as AttachmentView,
    },
  ];

  it('renders lightbox view for media, navigates items, downloads and closes', () => {
    const onIndexChange = vi.fn();
    const onClose = vi.fn();
    const onJumpToMessage = vi.fn();

    const { rerender } = render(
      <MediaLightbox
        items={items}
        index={0}
        onIndexChange={onIndexChange}
        onClose={onClose}
        onJumpToMessage={onJumpToMessage}
      />,
    );

    expect(screen.getByText('alice')).toBeInTheDocument();

    // Download button
    const downloadBtn = screen.getByTitle('Download');
    fireEvent.click(downloadBtn);

    // Jump button
    const jumpBtn = screen.getByTitle('Go to message');
    fireEvent.click(jumpBtn);
    expect(onJumpToMessage).toHaveBeenCalledWith('m1');

    // Key navigation
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onIndexChange).toHaveBeenCalledWith(1);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    // Switch to index 1 (video)
    rerender(
      <MediaLightbox
        items={items}
        index={1}
        onIndexChange={onIndexChange}
        onClose={onClose}
        onJumpToMessage={onJumpToMessage}
      />,
    );

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(document.querySelector('video')).toBeInTheDocument();

    // ArrowLeft at index 1
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onIndexChange).toHaveBeenCalledWith(0);

    // Download when fileName is null (covers line 47)
    const downloadBtn2 = screen.getByTitle('Download');
    fireEvent.click(downloadBtn2);

    // Close button with animation timer
    const closeBtn = screen.getByTitle('Close');
    fireEvent.click(closeBtn);
    // Second close while closing (covers line 26)
    fireEvent.click(closeBtn);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onClose).toHaveBeenCalled();

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
  });

  it('returns null when current item is undefined', () => {
    const { container } = render(
      <MediaLightbox
        items={[]}
        index={0}
        onIndexChange={vi.fn()}
        onClose={vi.fn()}
        onJumpToMessage={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
