import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageAttachments from '../MessageAttachments';
import type { AttachmentView } from '@/entities/chat/model/types';

describe('MessageAttachments', () => {
  it('renders null when empty attachments array', () => {
    const { container } = render(<MessageAttachments attachments={[]} isOwnMessage={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders file attachment download card', () => {
    const mockFiles: AttachmentView[] = [
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
    ];

    render(<MessageAttachments attachments={mockFiles} isOwnMessage={true} />);

    expect(screen.getByText('report.pdf')).toBeInTheDocument();
  });
});
