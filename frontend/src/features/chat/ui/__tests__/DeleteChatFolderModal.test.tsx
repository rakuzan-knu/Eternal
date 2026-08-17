import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteChatFolderModal from '../DeleteChatFolderModal';

describe('DeleteChatFolderModal', () => {
  it('renders confirmation text and triggers onConfirm', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(<DeleteChatFolderModal folderName="Work" onClose={onClose} onConfirm={onConfirm} />);

    expect(screen.getByText(/delete folder/i)).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /^delete$/i });
    fireEvent.click(deleteBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
