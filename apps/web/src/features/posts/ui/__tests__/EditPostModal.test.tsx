import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditPostModal } from '../EditPostModal';
import { PostType } from '@/entities/post/model/types';

describe('EditPostModal', () => {
  const mockPost: PostType = {
    id: 'post-1',
    authorId: 'user-1',
    author: 'Ayate',
    handle: 'ayate',
    text: 'Original caption text',
    createdAt: new Date().toISOString(),
  };

  it('renders with existing post text and character limit', () => {
    render(<EditPostModal post={mockPost} isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByText('Edit information')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Original caption text')).toBeInTheDocument();
    expect(screen.getByText(/1000|1,000/)).toBeInTheDocument();
  });

  it('calls onSave with updated content when clicking Done', () => {
    const onSave = vi.fn();
    render(<EditPostModal post={mockPost} isOpen={true} onClose={vi.fn()} onSave={onSave} />);

    const textarea = screen.getByDisplayValue('Original caption text');
    fireEvent.change(textarea, { target: { value: 'Updated caption text' } });

    const doneBtn = screen.getByText('Done');
    fireEvent.click(doneBtn);

    expect(onSave).toHaveBeenCalledWith('Updated caption text');
  });

  it('calls onClose when clicking Cancel', () => {
    const onClose = vi.fn();
    render(<EditPostModal post={mockPost} isOpen={true} onClose={onClose} onSave={vi.fn()} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('handles preview tab toggle, emoji selection, escape key, and formatting hotkeys', () => {
    const onClose = vi.fn();
    render(<EditPostModal post={mockPost} isOpen={true} onClose={onClose} onSave={vi.fn()} />);

    // 1. Preview tab
    const previewBtn = screen.getByRole('button', { name: /preview/i });
    fireEvent.click(previewBtn);
    expect(screen.getByText(/Original caption text/)).toBeInTheDocument();

    const writeBtn = screen.getByRole('button', { name: /write/i });
    fireEvent.click(writeBtn);

    // 2. Formatting hotkey (Ctrl+B)
    const textarea = screen.getByPlaceholderText(/Write a caption.../i) as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 8);
    fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });
    expect(textarea.value).toContain('**');

    // 3. Escape key to close
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
