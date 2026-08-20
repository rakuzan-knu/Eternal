import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteChatHistoryModal from '../DeleteChatHistoryModal';

describe('DeleteChatHistoryModal', () => {
  it('renders direct chat confirmation text, Auto-Delete link, and calls onConfirm on Delete click', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteChatHistoryModal
        conversationName="Alice"
        isGroup={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.getByText(/Are you sure you want to delete all message history with/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(
      screen.getByText(/This will delete all messages from all users in this chat/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Enable Auto-Delete/i)).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(deleteBtn);

    expect(onConfirm).toHaveBeenCalled();
  });

  it('renders group chat confirmation text without delete for everyone option', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteChatHistoryModal
        conversationName="Design Team"
        isGroup={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.getByText(/Are you sure you want to delete all message history in/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Design Team')).toBeInTheDocument();
    expect(
      screen.getByText(/This will delete messages in this group for you only/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(deleteBtn);

    expect(onConfirm).toHaveBeenCalled();
  });
});
