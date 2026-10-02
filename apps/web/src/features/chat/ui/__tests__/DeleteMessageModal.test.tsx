import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteMessageModal from '../DeleteMessageModal';
import React from 'react';

describe('DeleteMessageModal', () => {
  it('renders with "Also delete for [User]" checkbox checked by default and deletes for everyone', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteMessageModal
        isOwnMessage={true}
        peerName="Nikolaj"
        canDeleteForAll={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Delete message')).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    expect(screen.getByText('Also delete for Nikolaj')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);
    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it('unchecking the checkbox confirms delete for self only', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteMessageModal
        isOwnMessage={true}
        peerName="Nikolaj"
        canDeleteForAll={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);
    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it('renders for non-deletable-for-all message and confirms delete for self only', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteMessageModal
        isOwnMessage={false}
        canDeleteForAll={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

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
