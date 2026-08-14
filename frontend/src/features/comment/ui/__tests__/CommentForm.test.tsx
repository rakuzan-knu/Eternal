import { render, screen } from '@testing-library/react';
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
    const user = userEvent.setup();
    render(<CommentForm currentUserHandle="@ayate" />);
    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;

    await user.type(getTextarea(), 'Nice post!');

    expect(submitButton).not.toBeDisabled();
  });

  it('clears the textarea after a successful submit', async () => {
    const user = userEvent.setup();
    render(<CommentForm currentUserHandle="@ayate" />);
    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;

    await user.type(getTextarea(), 'Nice post!');
    await user.click(submitButton);

    expect(getTextarea()).toHaveValue('');
    expect(submitButton).toBeDisabled();
  });

  it('submits on Enter without Shift and clears the text', async () => {
    const user = userEvent.setup();
    render(<CommentForm currentUserHandle="@ayate" />);

    await user.type(getTextarea(), 'Nice post!{Enter}');

    expect(getTextarea()).toHaveValue('');
  });

  it('does not submit on Shift+Enter, allowing a newline instead', async () => {
    const user = userEvent.setup();
    render(<CommentForm currentUserHandle="@ayate" />);

    await user.type(getTextarea(), 'Line 1{Shift>}{Enter}{/Shift}Line 2');

    expect(getTextarea()).toHaveValue('Line 1\nLine 2');
  });

  it('ignores a submit click when text is only whitespace and there are no images', async () => {
    const user = userEvent.setup();
    render(<CommentForm currentUserHandle="@ayate" />);

    await user.type(getTextarea(), '   ');

    const submitButton = document.querySelector('button[type="submit"]');
    expect(submitButton).toBeDisabled();
  });

  it('inserts the picked emoji into the textarea', async () => {
    const user = userEvent.setup();
    render(<CommentForm currentUserHandle="@ayate" />);

    await user.click(screen.getByTitle('Add Emoji'));
    await user.click(await screen.findByTestId('mock-emoji-picker'));

    expect(getTextarea()).toHaveValue('😀');
  });

  it('adds an image preview and removes it when its remove button is clicked', async () => {
    const user = userEvent.setup();
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
    const user = userEvent.setup();
    render(<CommentForm currentUserHandle="@ayate" />);
    const file = new File(['content'], 'photo.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);
    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;

    await user.click(submitButton);

    expect(screen.queryByAltText('preview')).not.toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
});
