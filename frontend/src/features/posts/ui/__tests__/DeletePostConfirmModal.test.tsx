import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeletePostConfirmModal } from '../DeletePostConfirmModal';

describe('DeletePostConfirmModal', () => {
  it('renders confirmation text and buttons', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(<DeletePostConfirmModal isOpen={true} onClose={onClose} onConfirm={onConfirm} />);

    expect(screen.getByText('Delete post?')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Delete'));
    expect(onConfirm).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
