import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteChatModal from '../DeleteChatModal';

describe('DeleteChatModal', () => {
  it('renders direct chat prompt, handles Also delete for checkbox and calls onConfirm with forAll value', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteChatModal
        conversationName="Alice"
        avatarUrl={null}
        isGroup={false}
        otherUserName="Alice"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText(/Delete chat/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to delete all message history with/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Also delete for Alice/i)).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(deleteBtn);

    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it('renders group chat leave confirmation without delete for everyone checkbox', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteChatModal
        conversationName="Dev Group"
        avatarUrl={null}
        isGroup={true}
        memberAvatars={[]}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText(/Delete chat/i)).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
    expect(screen.getByText('Dev Group')).toBeInTheDocument();
    expect(
      screen.getByText(
        /You will leave the group and your chat history will be deleted from your panel/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(deleteBtn);

    expect(onConfirm).toHaveBeenCalledWith(false);
  });
});
