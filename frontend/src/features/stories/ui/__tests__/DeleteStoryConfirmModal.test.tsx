import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DeleteStoryConfirmModal } from '../DeleteStoryConfirmModal';

describe('DeleteStoryConfirmModal', () => {
  it('renders confirmation text and buttons correctly', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(<DeleteStoryConfirmModal isOpen={true} onClose={onClose} onConfirm={onConfirm} />);

    expect(screen.getByText('Delete Story?')).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to delete this story? This action cannot be undone.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Delete'));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles loading state while deleting', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <DeleteStoryConfirmModal
        isOpen={true}
        isDeleting={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Deleting...')).toBeInTheDocument();
    expect(screen.getByText('Deleting...')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('closes on Escape key press', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(<DeleteStoryConfirmModal isOpen={true} onClose={onClose} onConfirm={onConfirm} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports custom texts via props', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <DeleteStoryConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Custom title"
        description="Custom description"
        confirmText="Yes, delete"
        cancelText="No, keep"
      />,
    );

    expect(screen.getByText('Custom title')).toBeInTheDocument();
    expect(screen.getByText('Custom description')).toBeInTheDocument();
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
    expect(screen.getByText('No, keep')).toBeInTheDocument();
  });
});
