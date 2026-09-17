import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteMessageModal from '../DeleteMessageModal';
import React from 'react';

describe('DeleteMessageModal', () => {
  it('renders options for own message and confirms delete for everyone', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(<DeleteMessageModal isOwnMessage={true} onClose={onClose} onConfirm={onConfirm} />);

    expect(screen.getByText('Delete message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete for everyone' })).toBeInTheDocument();

    const deleteForAllBtn = screen.getByRole('button', { name: 'Delete for everyone' });
    fireEvent.click(deleteForAllBtn);
    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it('renders for non-own message and confirms delete for self only', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(<DeleteMessageModal isOwnMessage={false} onClose={onClose} onConfirm={onConfirm} />);

    expect(screen.queryByRole('button', { name: 'Delete for everyone' })).not.toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);
    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it('handles cancel button click', async () => {
    const onClose = vi.fn();
    render(<DeleteMessageModal isOwnMessage={false} onClose={onClose} onConfirm={vi.fn()} />);

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
