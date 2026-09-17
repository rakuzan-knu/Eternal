import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentForm } from '../CommentForm';

vi.mock('emoji-picker-react', () => ({
  default: ({ onEmojiClick }: { onEmojiClick: (data: { emoji: string }) => void }) => (
    <button data-testid="mock-emoji-picker" onClick={() => onEmojiClick({ emoji: '😀' })}>
      mock-emoji-picker
    </button>
  ),
  Theme: { DARK: 'dark' },
  EmojiStyle: { APPLE: 'apple' },
}));

function getTextarea() {
  return screen.getByPlaceholderText('Comment as @ayate...');
}

describe('CommentForm', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the textarea with a placeholder that includes the current user handle', () => {
    render(<CommentForm currentUserHandle="@ayate" />);

    expect(getTextarea()).toBeInTheDocument();
  });

  it('disables the submit button when there is no text and no images', () => {
    render(<CommentForm currentUserHandle="@ayate" />);

    const submitButton = document.querySelector('button[type="submit"]');
    expect(submitButton).toBeDisabled();
  });

  it('enables the submit button once the user types some text', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CommentForm currentUserHandle="@ayate" />);
    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;

    await user.type(getTextarea(), 'Nice post!');

    expect(submitButton).not.toBeDisabled();
  });

  it('clears the textarea after a successful submit', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CommentForm currentUserHandle="@ayate" />);
    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;

    await user.type(getTextarea(), 'Nice post!');
    await user.click(submitButton);

    expect(getTextarea()).toHaveValue('');
    expect(submitButton).toBeDisabled();
  });

  it('submits on Enter without Shift and clears the text', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CommentForm currentUserHandle="@ayate" />);

    await user.type(getTextarea(), 'Nice post!{Enter}');

    expect(getTextarea()).toHaveValue('');
  });

  it('does not submit on Shift+Enter, allowing a newline instead', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CommentForm currentUserHandle="@ayate" />);

    await user.type(getTextarea(), 'Line 1{Shift>}{Enter}{/Shift}Line 2');

    expect(getTextarea()).toHaveValue('Line 1\nLine 2');
  });

  it('ignores a submit click when text is only whitespace and there are no images', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CommentForm currentUserHandle="@ayate" />);

    await user.type(getTextarea(), '   ');

    const submitButton = document.querySelector('button[type="submit"]');
    expect(submitButton).toBeDisabled();
  });

  it('inserts the picked emoji into the textarea', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CommentForm currentUserHandle="@ayate" />);

    await user.click(screen.getByTitle('Add Emoji'));
    await user.click(await screen.findByTestId('mock-emoji-picker'));

    expect(getTextarea()).toHaveValue('😀');
  });

  it('adds an image preview and removes it when its remove button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CommentForm currentUserHandle="@ayate" />);
    const file = new File(['content'], 'photo.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    const preview = screen.getByAltText('preview');
    expect(preview).toBeInTheDocument();

    const removeButton = preview.parentElement!.querySelector('button')!;
    await user.click(removeButton);

    expect(screen.queryByAltText('preview')).not.toBeInTheDocument();
  });

  it('clears image previews after a successful submit', async () => {
    const user = userEvent.setup({ delay: null });
    render(<CommentForm currentUserHandle="@ayate" />);
    const file = new File(['content'], 'photo.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);
    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;

    await user.click(submitButton);

    expect(screen.queryByAltText('preview')).not.toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('handles markdown formatting hotkeys with Ctrl/Cmd key combinations and link wrapping', () => {
    render(<CommentForm currentUserHandle="@ayate" />);
    const textarea = getTextarea() as HTMLTextAreaElement;

    // Type text
    fireEvent.change(textarea, { target: { value: 'hello world' } });
    textarea.selectionStart = 0;
    textarea.selectionEnd = 5;

    // Ctrl+B
    fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });
    expect(textarea.value).toContain('**');

    // Ctrl+I
    fireEvent.keyDown(textarea, { key: 'i', ctrlKey: true });
    expect(textarea.value).toContain('*');

    // Ctrl+U
    fireEvent.keyDown(textarea, { key: 'u', ctrlKey: true });
    expect(textarea.value).toContain('__');

    // Ctrl+Shift+X
    fireEvent.keyDown(textarea, { key: 'x', ctrlKey: true, shiftKey: true });
    expect(textarea.value).toContain('~~');

    // Ctrl+Shift+C
    fireEvent.keyDown(textarea, { key: 'c', ctrlKey: true, shiftKey: true });
    expect(textarea.value).toContain('```');

    // Ctrl+K with normal text
    fireEvent.change(textarea, { target: { value: 'my link' } });
    textarea.selectionStart = 0;
    textarea.selectionEnd = 7;
    fireEvent.keyDown(textarea, { key: 'k', ctrlKey: true });
    expect(textarea.value).toContain('https://');

    // Ctrl+K with url
    fireEvent.change(textarea, { target: { value: 'https://example.com' } });
    textarea.selectionStart = 0;
    textarea.selectionEnd = 19;
    fireEvent.keyDown(textarea, { key: 'k', ctrlKey: true });
    expect(textarea.value).toContain('[link](');

    // Wrap pair: e.g. "("
    fireEvent.change(textarea, { target: { value: 'sample' } });
    textarea.selectionStart = 0;
    textarea.selectionEnd = 6;
    fireEvent.keyDown(textarea, { key: '(' });
    expect(textarea.value).toBe('(sample)');
  });

  it('detects pasted code snippets and formats as markdown or attaches as file', () => {
    render(<CommentForm currentUserHandle="@ayate" />);
    const textarea = getTextarea() as HTMLTextAreaElement;

    const codeSnippet = `function calculateTotal(items) {\n  let total = 0;\n  for (const item of items) {\n    total += item.price;\n  }\n  return total;\n}`;
    fireEvent.paste(textarea, {
      clipboardData: { getData: () => codeSnippet },
    });

    expect(screen.getByText(/Code snippet detected/i)).toBeInTheDocument();

    const formatBtn = screen.getByRole('button', { name: /^Format$/i });
    fireEvent.click(formatBtn);

    expect(textarea.value).toContain('```');
  });
});
