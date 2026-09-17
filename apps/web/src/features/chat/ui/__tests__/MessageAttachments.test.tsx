import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageAttachments from '../MessageAttachments';
import type { AttachmentView } from '@/entities/chat/model/types';
import React from 'react';

describe('MessageAttachments', () => {
  it('renders null when empty attachments array', () => {
    const { container } = render(<MessageAttachments attachments={[]} isOwnMessage={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders file, video note, image, and voice attachments', () => {
    const mockAttachments: AttachmentView[] = [
      {
        id: 'att-1',
        type: 'FILE',
        url: 'https://example.com/doc.pdf',
        fileName: 'report.pdf',
        size: 1024 * 500,
        mimeType: 'application/pdf',
        width: null,
        height: null,
        duration: null,
        thumbnailUrl: null,
      },
      {
        id: 'att-2',
        type: 'FILE',
        url: 'https://example.com/unnamed',
        fileName: null,
        size: 1024,
        mimeType: null,
        width: null,
        height: null,
        duration: null,
        thumbnailUrl: null,
      },
      {
        id: 'att-3',
        type: 'IMAGE',
        url: 'https://example.com/pic.jpg',
        fileName: 'pic.jpg',
        size: 1024 * 200,
        mimeType: 'image/jpeg',
        width: 800,
        height: 600,
        duration: null,
        thumbnailUrl: null,
      },
      {
        id: 'att-4',
        type: 'VIDEO',
        url: 'https://example.com/video_note_1.webm',
        fileName: 'video_note_1.webm',
        size: 1024 * 300,
        mimeType: 'video/webm',
        width: 400,
        height: 400,
        duration: 10,
        thumbnailUrl: null,
      },
      {
        id: 'att-5',
        type: 'AUDIO',
        url: 'https://example.com/voice.ogg',
        fileName: 'voice.ogg',
        size: 1024 * 50,
        mimeType: 'audio/ogg',
        width: null,
        height: null,
        duration: 15,
        thumbnailUrl: null,
      },
    ];

    render(<MessageAttachments attachments={mockAttachments} isOwnMessage={true} />);

    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByText('File')).toBeInTheDocument();
  });

  it('renders video note identified by mimeType and file with isOwnMessage=false', () => {
    const attachments: AttachmentView[] = [
      {
        id: 'att-vn-mime',
        type: 'VIDEO',
        url: 'https://example.com/custom.mp4',
        fileName: 'custom.mp4',
        size: 1000,
        mimeType: 'video/video_note',
        width: 100,
        height: 200,
        duration: 5,
        thumbnailUrl: null,
      },
      {
        id: 'att-file-other',
        type: 'FILE',
        url: 'https://example.com/other.pdf',
        fileName: 'other.pdf',
        size: 2000,
        mimeType: 'application/pdf',
        width: null,
        height: null,
        duration: null,
        thumbnailUrl: null,
      },
    ];

    render(<MessageAttachments attachments={attachments} isOwnMessage={false} />);
    expect(screen.getByText('other.pdf')).toBeInTheDocument();
  });
});
