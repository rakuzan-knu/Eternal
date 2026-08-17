import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteMessageModal from '../DeleteMessageModal';

describe('DeleteMessageModal', () => {
  it('renders modal options for own message including delete for everyone', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(<DeleteMessageModal isOwnMessage={true} onClose={onClose} onConfirm={onConfirm} />);

    expect(screen.getByText('Delete message')).toBeInTheDocument();
    expect(screen.getByText('Delete for everyone')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Delete for everyone'));
    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it('renders standard delete for other message', () => {
    const onConfirm = vi.fn();
    render(<DeleteMessageModal isOwnMessage={false} onClose={vi.fn()} onConfirm={onConfirm} />);

    expect(screen.queryByText('Delete for everyone')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(onConfirm).toHaveBeenCalledWith(false);
  });
});
