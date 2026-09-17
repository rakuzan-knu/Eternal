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

  it('renders media, files, and links tabs and handles interaction', () => {
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

    // Click media item to open lightbox
    const mediaImg = document.querySelector('img')!;
    expect(mediaImg).toBeInTheDocument();
    fireEvent.click(mediaImg);

    // Lightbox controls
    const goToMessageBtn = screen.getByTitle('Go to message');
    fireEvent.click(goToMessageBtn);
    expect(onJumpToMessage).toHaveBeenCalledWith('m1');

    // Reopen and close lightbox
    fireEvent.click(mediaImg);
    const closeLightboxBtn = screen.getByTitle('Close');
    fireEvent.click(closeLightboxBtn);

    // Files Tab
    const filesTab = screen.getByRole('button', { name: /files/i });
    fireEvent.click(filesTab);
    expect(screen.getByText('doc.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByText('doc.pdf'));

    // Links Tab
    const linksTab = screen.getByRole('button', { name: /links/i });
    fireEvent.click(linksTab);
    const linkEl = screen.getByText('example.com');
    expect(linkEl).toBeInTheDocument();
  });

  it('renders empty states when there are no items for tabs', () => {
    render(
      <MediaFilesLinksModal
        messages={[]}
        initialTab="media"
        onClose={vi.fn()}
        onJumpToMessage={vi.fn()}
      />,
    );
    expect(screen.getByText('No media')).toBeInTheDocument();

    const filesTab = screen.getByRole('button', { name: /files/i });
    fireEvent.click(filesTab);
    expect(screen.getByText('No files')).toBeInTheDocument();

    const linksTab = screen.getByRole('button', { name: /links/i });
    fireEvent.click(linksTab);
    expect(screen.getByText('No links')).toBeInTheDocument();
  });

  it('renders video attachment and code file types', () => {
    const videoAndCodeMessages: MessageView[] = [
      {
        id: 'm2',
        conversationId: 'c1',
        senderId: 'u1',
        sender: { id: 'u1', username: 'u1', displayName: 'User 1', avatar: null },
        body: 'Video & code',
        createdAt: '2026-01-01',
        reactions: [],
        attachments: [
          {
            id: 'a3',
            type: 'VIDEO',
            url: 'https://vid.com/clip.mp4',
            fileName: 'clip.mp4',
            size: 5000,
            mimeType: 'video/mp4',
          },
          {
            id: 'a4',
            type: 'FILE',
            url: 'https://file.com/script.ts',
            fileName: 'script.ts',
            size: 300,
            mimeType: 'text/typescript',
          },
          {
            id: 'a5',
            type: 'FILE',
            url: 'https://file.com/unnamed',
            fileName: null,
            size: 100,
            mimeType: 'application/octet-stream',
          },
        ],
      } as unknown as MessageView,
    ];

    render(
      <MediaFilesLinksModal
        messages={videoAndCodeMessages}
        initialTab="media"
        onClose={vi.fn()}
        onJumpToMessage={vi.fn()}
      />,
    );

    // Media tab shows video element
    expect(document.querySelector('video')).toBeInTheDocument();

    // Files tab shows script.ts and unnamed file
    const filesTab = screen.getByRole('button', { name: /files/i });
    fireEvent.click(filesTab);
    expect(screen.getByText('script.ts')).toBeInTheDocument();
    expect(screen.getByText('File')).toBeInTheDocument();
  });
});
