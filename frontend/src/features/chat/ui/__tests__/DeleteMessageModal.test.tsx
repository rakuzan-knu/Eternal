import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
});
