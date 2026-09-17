import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteChatFolderModal from '../DeleteChatFolderModal';
import React from 'react';

describe('DeleteChatFolderModal', () => {
  it('renders confirmation text with folder name and triggers onConfirm', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteChatFolderModal folderName="Work Folder" onClose={onClose} onConfirm={onConfirm} />,
    );

    expect(screen.getByText('Work Folder')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);
    expect(onConfirm).toHaveBeenCalled();
  });

  it('triggers onClose when Cancel button is clicked', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteChatFolderModal folderName="Work Folder" onClose={onClose} onConfirm={onConfirm} />,
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
