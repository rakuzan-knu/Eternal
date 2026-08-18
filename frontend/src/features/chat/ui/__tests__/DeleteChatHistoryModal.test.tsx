import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteChatHistoryModal from '../DeleteChatHistoryModal';

describe('DeleteChatHistoryModal', () => {
  it('renders confirmation text, Auto-Delete link, and calls onConfirm on Delete click', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteChatHistoryModal conversationName="Alice" onClose={onClose} onConfirm={onConfirm} />,
    );

    expect(
      screen.getByText(/Are you sure you want to delete all message history with/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByText(/Enable Auto-Delete/i)).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(deleteBtn);

    expect(onConfirm).toHaveBeenCalled();
  });
});
