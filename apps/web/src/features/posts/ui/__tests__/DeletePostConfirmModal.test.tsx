import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeletePostConfirmModal } from '../DeletePostConfirmModal';

describe('DeletePostConfirmModal', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(
      <DeletePostConfirmModal isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders confirmation text, handles Escape and backdrop click, and deletes', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <DeletePostConfirmModal isOpen={true} onClose={onClose} onConfirm={onConfirm} />,
    );

    expect(screen.getByText('Delete post?')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Backdrop click
    const backdrop = screen.getByText('Delete post?').closest('.fixed')!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByText('Delete'));
    expect(onConfirm).toHaveBeenCalled();

    // isDeleting state
    rerender(
      <DeletePostConfirmModal
        isOpen={true}
        isDeleting={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByText('Deleting...')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });
});
