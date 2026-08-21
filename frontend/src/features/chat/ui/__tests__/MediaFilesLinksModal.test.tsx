import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MediaFilesLinksModal from '../MediaFilesLinksModal';
import { MessageView } from '@/entities/chat/model/types';
import React from 'react';

describe('MediaFilesLinksModal', () => {
  const mockMessages: MessageView[] = [
    {
      id: 'm1',
      conversationId: 'c1',
      senderId: 'u1',
      sender: { id: 'u1', username: 'u1', displayName: 'User 1', avatar: null },
      body: 'Check out https://example.com',
      createdAt: '2026-01-01',
      reactions: [],
      attachments: [
        {
          id: 'a1',
          type: 'IMAGE',
          url: 'https://img.com/1.png',
          fileName: '1.png',
          size: 1024,
          mimeType: 'image/png',
        },
        {
          id: 'a2',
          type: 'FILE',
          url: 'https://file.com/doc.pdf',
          fileName: 'doc.pdf',
          size: 2048,
          mimeType: 'application/pdf',
        },
      ],
    } as unknown as MessageView,
  ];

  it('renders media, files, and links tabs', () => {
    const onClose = vi.fn();
    const onJumpToMessage = vi.fn();

    render(
      <MediaFilesLinksModal
        messages={mockMessages}
        initialTab="media"
        onClose={onClose}
        onJumpToMessage={onJumpToMessage}
      />,
    );

    expect(screen.getByText('Media, files & links')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /files/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /links/i })).toBeInTheDocument();

    const filesTab = screen.getByRole('button', { name: /files/i });
    fireEvent.click(filesTab);
    expect(screen.getByText('doc.pdf')).toBeInTheDocument();

    const linksTab = screen.getByRole('button', { name: /links/i });
    fireEvent.click(linksTab);
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });
});
