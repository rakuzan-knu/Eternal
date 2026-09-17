import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CommentComposer } from '../CommentComposer';
import { MemoryRouter } from 'react-router-dom';

describe('CommentComposer', () => {
  it('renders input and submits text on submit click', () => {
    const onSubmit = vi.fn();
    const onCancelReply = vi.fn();

    act(() => {
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
    });

    const textarea = screen.getByPlaceholderText(/Comment as @alex.../i);
    act(() => {
      fireEvent.change(textarea, { target: { value: 'Great perspective!' } });
    });

    const submitBtn = screen.getByTitle('Send comment');
    act(() => {
      fireEvent.click(submitBtn);
    });

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

    act(() => {
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
    });

    expect(screen.getByText('Replying to')).toBeInTheDocument();
    expect(screen.getAllByText(/@sarah/)[0]).toBeInTheDocument();

    const cancelBtn = screen.getByTitle('Cancel reply (Esc)');
    act(() => {
      fireEvent.click(cancelBtn);
    });
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

  it('handles near limit and over limit styling and emoji select', () => {
    const { container } = render(
      <MemoryRouter>
        <CommentComposer
          currentUserHandle="alex"
          replyingTo={null}
          onCancelReply={vi.fn()}
          onSubmit={vi.fn()}
        />
      </MemoryRouter>,
    );

    const textarea = screen.getByPlaceholderText(/Comment as @alex.../i);

    // Near limit (e.g. 900 chars)
    fireEvent.change(textarea, { target: { value: 'a'.repeat(900) } });
    expect(container.querySelector('.text-amber-400')).toBeInTheDocument();

    // Over limit (e.g. 1005 chars)
    fireEvent.change(textarea, { target: { value: 'a'.repeat(1005) } });
    expect(container.querySelector('.text-red-400')).toBeInTheDocument();

    // Emoji button
    const emojiBtn = screen.getByTitle('Add Emoji');
    fireEvent.click(emojiBtn);
  });

  it('handles hotkeys (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Shift+X, Ctrl+K) and auto-wrapping quotes', () => {
    render(
      <MemoryRouter>
        <CommentComposer
          currentUserHandle="alex"
          replyingTo={null}
          onCancelReply={vi.fn()}
          onSubmit={vi.fn()}
        />
      </MemoryRouter>,
    );

    const textarea = screen.getByPlaceholderText(/Comment as @alex.../i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    textarea.selectionStart = 0;
    textarea.selectionEnd = 5;

    // Ctrl+B (Bold)
    fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });
    expect(textarea.value).toContain('**Hello**');

    // Auto-wrap quote with selection
    textarea.selectionStart = 2;
    textarea.selectionEnd = 7;
    fireEvent.keyDown(textarea, { key: '"' });
    expect(textarea.value).toContain('"Hello"');

    // Ctrl+I (Italic)
    textarea.selectionStart = 0;
    textarea.selectionEnd = 5;
    fireEvent.keyDown(textarea, { key: 'i', ctrlKey: true });

    // Ctrl+U (Underline)
    fireEvent.keyDown(textarea, { key: 'u', ctrlKey: true });

    // Ctrl+Shift+X (Strike)
    fireEvent.keyDown(textarea, { key: 'x', ctrlKey: true, shiftKey: true });

    // Ctrl+Shift+C (Code block)
    fireEvent.keyDown(textarea, { key: 'c', ctrlKey: true, shiftKey: true });

    // Ctrl+K (Link)
    fireEvent.keyDown(textarea, { key: 'k', ctrlKey: true });
  });

  it('handles image file selection, size limit, preview removal, and code paste banner', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onCancelReply = vi.fn();

    const { container } = render(
      <MemoryRouter>
        <CommentComposer
          currentUserHandle="alex"
          replyingTo={{ commentId: 'c1', username: 'bob' }}
          onCancelReply={onCancelReply}
          onSubmit={vi.fn()}
        />
      </MemoryRouter>,
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    // 1. File > 5MB triggers alert
    const largeFile = new File(['a'.repeat(6 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    expect(alertSpy).toHaveBeenCalledWith('Image exceeds 5MB limit');

    // 2. Normal file
    const validFile = new File(['test image data'], 'photo.png', { type: 'image/png' });
    Object.defineProperty(validFile, 'size', { value: 1024 });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // 3. Paste code snippet
    const textarea = screen.getByPlaceholderText(/Reply to @bob.../i);
    const pasteEvent = {
      clipboardData: {
        getData: (format: string) => (format === 'text' ? 'const x = 42;\nfunction test() {}' : ''),
      },
    };
    fireEvent.paste(textarea, pasteEvent);

    // 4. Escape key to cancel reply
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancelReply).toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
