import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BatchDeleteModal from '../BatchDeleteModal';
import React from 'react';

describe('BatchDeleteModal', () => {
  it('renders batch delete confirmation and triggers confirm callback', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <BatchDeleteModal count={3} canDeleteForAll={true} onClose={onClose} onConfirm={onConfirm} />,
    );

    expect(screen.getByText('Delete 3 messages')).toBeInTheDocument();

    const checkbox = screen.getByLabelText('Also delete for everyone');
    fireEvent.click(checkbox);

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);

    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it('renders singular 1 message label, hides delete for all, and handles cancel', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <BatchDeleteModal
        count={1}
        canDeleteForAll={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Delete 1 message')).toBeInTheDocument();
    expect(screen.queryByLabelText('Also delete for everyone')).not.toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
