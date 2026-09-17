import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AttachmentDropZone from '../AttachmentDropZone';

describe('AttachmentDropZone', () => {
  it('renders children and handles file drag and drop', () => {
    const onFilesDropped = vi.fn();
    render(
      <AttachmentDropZone onFilesDropped={onFilesDropped}>
        <div>Drop area content</div>
      </AttachmentDropZone>,
    );

    expect(screen.getByText('Drop area content')).toBeInTheDocument();

    const container = screen.getByText('Drop area content').parentElement!;
    const file = new File(['data'], 'test.png', { type: 'image/png' });

    // Non-file drag enter
    fireEvent.dragEnter(container, {
      dataTransfer: { types: ['text/plain'] },
    });
    expect(screen.queryByText('Drop files here to send')).not.toBeInTheDocument();

    // File drag enter
    fireEvent.dragEnter(container, {
      dataTransfer: { types: ['Files'] },
    });
    expect(screen.getByText('Drop files here to send')).toBeInTheDocument();

    // Drag over
    fireEvent.dragOver(container, {
      dataTransfer: { types: ['Files'] },
    });

    // Drag leave
    fireEvent.dragLeave(container, {
      dataTransfer: { types: ['Files'] },
    });
    expect(screen.queryByText('Drop files here to send')).not.toBeInTheDocument();

    // Drag enter and drop
    fireEvent.dragEnter(container, {
      dataTransfer: { types: ['Files'] },
    });
    fireEvent.drop(container, {
      dataTransfer: { files: [file], types: ['Files'] },
    });

    expect(onFilesDropped).toHaveBeenCalledWith([file]);
  });
});
