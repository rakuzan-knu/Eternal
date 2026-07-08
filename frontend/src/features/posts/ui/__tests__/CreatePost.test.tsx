import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreatePost from '../CreatePost';

vi.mock('emoji-picker-react', () => ({
  default: ({ onEmojiClick }: { onEmojiClick: (data: { emoji: string }) => void }) => (
    <button data-testid="mock-emoji-picker" onClick={() => onEmojiClick({ emoji: '😀' })}>
      mock-emoji-picker
    </button>
  ),
  Theme: { DARK: 'dark' },
  EmojiStyle: { APPLE: 'apple' },
}));

class MockFileReader {
  result: string | null = null;
  onloadend: (() => void) | null = null;

  readAsDataURL() {
    this.result = 'data:image/png;base64,mock';
    this.onloadend?.();
  }
}

function getTextarea() {
  return screen.getByPlaceholderText('Що нового?');
}

function getPublishButton() {
  return screen.getByText('Опублікувати');
}

describe('CreatePost', () => {
  let originalFileReader: typeof FileReader;

  beforeEach(() => {
    originalFileReader = global.FileReader;
    // @ts-expect-error - simplified mock, not a full FileReader implementation
    global.FileReader = MockFileReader;
  });

  afterEach(() => {
    global.FileReader = originalFileReader;
    vi.restoreAllMocks();
  });

  it('does not call onPostSubmit when the form is completely empty', async () => {
    const onPostSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreatePost onPostSubmit={onPostSubmit} />);

    await user.click(getPublishButton());

    expect(onPostSubmit).not.toHaveBeenCalled();
  });

  it('submits the typed text and clears the textarea afterwards', async () => {
    const onPostSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreatePost onPostSubmit={onPostSubmit} />);

    await user.type(getTextarea(), 'Hello world');
    await user.click(getPublishButton());

    expect(onPostSubmit).toHaveBeenCalledWith({
      text: 'Hello world',
      image: null,
      gif: null,
      poll: null,
    });
    expect(getTextarea()).toHaveValue('');
  });

  it('ignores a second publish click once the form has already been cleared', async () => {
    const onPostSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreatePost onPostSubmit={onPostSubmit} />);
    const publishButton = getPublishButton();

    await user.type(getTextarea(), 'Hello world');
    await user.click(publishButton);
    await user.click(publishButton);

    expect(onPostSubmit).toHaveBeenCalledTimes(1);
  });

  it('attaches an image, includes it in the submit payload, and clears it afterwards', async () => {
    const onPostSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreatePost onPostSubmit={onPostSubmit} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'photo.png', { type: 'image/png' });

    await user.upload(fileInput, file);
    expect(screen.getByAltText('Upload preview')).toBeInTheDocument();
    await user.type(getTextarea(), 'With a photo');
    await user.click(getPublishButton());

    expect(onPostSubmit).toHaveBeenCalledWith({
      text: 'With a photo',
      image: 'data:image/png;base64,mock',
      gif: null,
      poll: null,
    });
    expect(screen.queryByAltText('Upload preview')).not.toBeInTheDocument();
  });

  it('removes the image preview when its close button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreatePost onPostSubmit={vi.fn()} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'photo.png', { type: 'image/png' });
    await user.upload(fileInput, file);
    const preview = screen.getByAltText('Upload preview');

    await user.click(preview.parentElement!.querySelector('button')!);

    expect(screen.queryByAltText('Upload preview')).not.toBeInTheDocument();
  });

  it('selecting a gif clears a previously attached image (mutually exclusive)', async () => {
    const user = userEvent.setup();
    render(<CreatePost onPostSubmit={vi.fn()} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'photo.png', { type: 'image/png' });
    await user.upload(fileInput, file);
    expect(screen.getByAltText('Upload preview')).toBeInTheDocument();

    await user.click(screen.getByTitle('Додати GIF'));
    await user.click(screen.getAllByRole('img', { name: 'gif' })[0]);

    expect(screen.queryByAltText('Upload preview')).not.toBeInTheDocument();
    expect(screen.getByAltText('GIF preview')).toBeInTheDocument();
  });

  it('attaching a new image clears a previously selected gif (mutually exclusive)', async () => {
    const user = userEvent.setup();
    render(<CreatePost onPostSubmit={vi.fn()} />);
    await user.click(screen.getByTitle('Додати GIF'));
    await user.click(screen.getAllByRole('img', { name: 'gif' })[0]);
    expect(screen.getByAltText('GIF preview')).toBeInTheDocument();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'photo.png', { type: 'image/png' });

    await user.upload(fileInput, file);

    expect(screen.queryByAltText('GIF preview')).not.toBeInTheDocument();
    expect(screen.getByAltText('Upload preview')).toBeInTheDocument();
  });

  it('opening the emoji menu closes an already-open gif menu (single active menu)', async () => {
    const user = userEvent.setup();
    render(<CreatePost onPostSubmit={vi.fn()} />);
    await user.click(screen.getByTitle('Додати GIF'));
    expect(screen.getAllByRole('img', { name: 'gif' }).length).toBeGreaterThan(0);

    await user.click(screen.getByTitle('Додати емодзі'));

    expect(screen.queryAllByRole('img', { name: 'gif' })).toHaveLength(0);
    expect(screen.getByTestId('mock-emoji-picker')).toBeInTheDocument();
  });

  it('closes the gif menu when its own button is clicked again', async () => {
    const user = userEvent.setup();
    render(<CreatePost onPostSubmit={vi.fn()} />);
    const gifButton = screen.getByTitle('Додати GIF');
    await user.click(gifButton);
    expect(screen.getAllByRole('img', { name: 'gif' }).length).toBeGreaterThan(0);

    await user.click(gifButton);

    expect(screen.queryAllByRole('img', { name: 'gif' })).toHaveLength(0);
  });

  it('inserts the picked emoji into the textarea', async () => {
    const user = userEvent.setup();
    render(<CreatePost onPostSubmit={vi.fn()} />);

    await user.click(screen.getByTitle('Додати емодзі'));
    await user.click(screen.getByTestId('mock-emoji-picker'));

    expect(getTextarea()).toHaveValue('😀');
  });

  it('includes poll options in the submit payload when the poll is open', async () => {
    const onPostSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CreatePost onPostSubmit={onPostSubmit} />);

    await user.click(screen.getByTitle('Створити опитування'));
    await user.type(screen.getByPlaceholderText('Варіант 1'), 'Cats');
    await user.type(screen.getByPlaceholderText('Варіант 2'), 'Dogs');
    await user.type(getTextarea(), 'Vote now');
    await user.click(getPublishButton());

    expect(onPostSubmit).toHaveBeenCalledWith({
      text: 'Vote now',
      image: null,
      gif: null,
      poll: { option1: 'Cats', option2: 'Dogs' },
    });
  });

  it('resets the poll UI after a successful submit', async () => {
    const user = userEvent.setup();
    render(<CreatePost onPostSubmit={vi.fn()} />);
    await user.click(screen.getByTitle('Створити опитування'));
    await user.type(getTextarea(), 'Vote now');

    await user.click(getPublishButton());

    expect(screen.queryByPlaceholderText('Варіант 1')).not.toBeInTheDocument();
  });
});
