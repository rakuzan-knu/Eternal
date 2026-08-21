import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MediaLightbox from '../MediaLightbox';
import { MediaItem } from '../../model/chatMediaTypes';
import { MessageView, AttachmentView } from '@/entities/chat/model/types';
import React from 'react';

describe('MediaLightbox', () => {
  const items: MediaItem[] = [
    {
      message: {
        id: 'm1',
        conversationId: 'c1',
        senderId: 'u1',
        sender: { id: 'u1', username: 'alice', displayName: 'Alice', avatar: null },
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
  ];

  it('renders lightbox view for media and handles jump to message', () => {
    const onIndexChange = vi.fn();
    const onClose = vi.fn();
    const onJumpToMessage = vi.fn();

    render(
      <MediaLightbox
        items={items}
        index={0}
        onIndexChange={onIndexChange}
        onClose={onClose}
        onJumpToMessage={onJumpToMessage}
      />,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByTitle('Go to message')).toBeInTheDocument();

    const jumpBtn = screen.getByTitle('Go to message');
    fireEvent.click(jumpBtn);

    expect(onJumpToMessage).toHaveBeenCalledWith('m1');
  });
});
