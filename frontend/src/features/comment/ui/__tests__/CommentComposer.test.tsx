import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommentComposer } from '../CommentComposer';
import { MemoryRouter } from 'react-router-dom';

describe('CommentComposer', () => {
  it('renders input and submits text on submit click', () => {
    const onSubmit = vi.fn();
    const onCancelReply = vi.fn();

    render(
      <MemoryRouter>
        <CommentComposer
          currentUserHandle="alex"
          replyingTo={null}
          onCancelReply={onCancelReply}
          onSubmit={onSubmit}
        />
      </MemoryRouter>,
    );

    const textarea = screen.getByPlaceholderText(/Comment as @alex.../i);
    fireEvent.change(textarea, { target: { value: 'Great perspective!' } });

    const submitBtn = screen.getByTitle('Send comment');
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith(
      'Great perspective!',
      undefined,
      undefined,
      expect.any(String),
    );
  });

  it('renders replying banner and prefixes mention when replyingTo is set', () => {
    const onSubmit = vi.fn();
    const onCancelReply = vi.fn();

    render(
      <MemoryRouter>
        <CommentComposer
          currentUserHandle="alex"
          replyingTo={{ commentId: 'c-99', username: 'sarah' }}
          onCancelReply={onCancelReply}
          onSubmit={onSubmit}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Replying to')).toBeInTheDocument();
    expect(screen.getAllByText(/@sarah/)[0]).toBeInTheDocument();

    const cancelBtn = screen.getByTitle('Cancel reply (Esc)');
    fireEvent.click(cancelBtn);
    expect(onCancelReply).toHaveBeenCalled();
  });

  it('submits on regular Enter key and does not submit on Shift+Enter', () => {
    const onSubmit = vi.fn();
    const onCancelReply = vi.fn();

    render(
      <MemoryRouter>
        <CommentComposer
          currentUserHandle="alex"
          replyingTo={null}
          onCancelReply={onCancelReply}
          onSubmit={onSubmit}
        />
      </MemoryRouter>,
    );

    const textarea = screen.getByPlaceholderText(/Comment as @alex.../i);
    fireEvent.change(textarea, { target: { value: 'Awesome comment!' } });

    // Press Shift+Enter -> should NOT submit
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();

    // Press regular Enter -> should submit
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(onSubmit).toHaveBeenCalledWith(
      'Awesome comment!',
      undefined,
      undefined,
      expect.any(String),
    );
  });
});
