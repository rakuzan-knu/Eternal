import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreatePost from '../CreatePost';

vi.mock('emoji-picker-react', () => ({
  default: ({ onEmojiClick }: { onEmojiClick: (data: { emoji: string }) => void }) => (
    <button data-testid="mock-emoji-picker" onClick={() => onEmojiClick({ emoji: '😀' })}>
      mock-emoji-picker
    </button>
  ),
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
function formDataEntries(fd: FormData) {
  const entries: Record<string, FormDataEntryValue[]> = {};
  for (const [key, value] of fd.entries()) (entries[key] ??= []).push(value);
  return entries;
}
function renderCreatePost() {
  const onSubmitFormData = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CreatePost onSubmitFormData={onSubmitFormData} />
    </QueryClientProvider>,
  );
  return onSubmitFormData;
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

  it('does not call onSubmitFormData when the form is completely empty', async () => {
    const onSubmitFormData = renderCreatePost();
    const user = userEvent.setup();

    await user.click(getPublishButton());

    expect(onSubmitFormData).not.toHaveBeenCalled();
  });

  it('submits the typed text as the "content" field and clears the textarea afterwards', async () => {
    const onSubmitFormData = renderCreatePost();
    const user = userEvent.setup();

    await user.type(getTextarea(), 'Hello world');
    await user.click(getPublishButton());

    const fd = onSubmitFormData.mock.calls[0][0] as FormData;
    expect(formDataEntries(fd)).toEqual({ content: ['Hello world'] });
    expect(getTextarea()).toHaveValue('');
  });

  it('ignores a second publish click once the form has already been cleared', async () => {
    const onSubmitFormData = renderCreatePost();
    const user = userEvent.setup();
    await user.type(getTextarea(), 'Hello world');
    const publishButton = getPublishButton();

    await user.click(publishButton);
    await user.click(publishButton);

    expect(onSubmitFormData).toHaveBeenCalledTimes(1);
  });

  it('attaches an image, includes it as a "media" field, and shows a preview', async () => {
    const onSubmitFormData = renderCreatePost();
    const user = userEvent.setup();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'photo.png', { type: 'image/png' });

    await user.upload(fileInput, file);
    expect(screen.getByAltText('preview')).toBeInTheDocument();
    await user.type(getTextarea(), 'With a photo');
    await user.click(getPublishButton());

    const entries = formDataEntries(onSubmitFormData.mock.calls[0][0] as FormData);
    expect(entries.content).toEqual(['With a photo']);
    expect((entries.media[0] as File).name).toBe('photo.png');
  });

  it('removes a media preview when its own close button is clicked', async () => {
    renderCreatePost();
    const user = userEvent.setup();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'photo.png', { type: 'image/png' });
    await user.upload(fileInput, file);
    const preview = screen.getByAltText('preview');

    await user.click(preview.parentElement!.querySelector('button')!);

    expect(screen.queryByAltText('preview')).not.toBeInTheDocument();
  });

  it('allows a gif to be added alongside an already-attached image', async () => {
    renderCreatePost();
    const user = userEvent.setup();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, new File(['content'], 'photo.png', { type: 'image/png' }));

    await user.click(screen.getByTitle('Додати GIF'));

    await user.click(screen.getAllByRole('img', { name: 'gif' })[0]);

    expect(screen.getAllByAltText('preview')).toHaveLength(2);
  });

  it('opening the emoji menu closes an already-open gif menu (single active menu)', async () => {
    renderCreatePost();
    const user = userEvent.setup();
    await user.click(screen.getByTitle('Додати GIF'));
    expect(screen.getAllByRole('img', { name: 'gif' }).length).toBeGreaterThan(0);

    await user.click(screen.getByTitle('Додати емодзі'));

    expect(screen.queryAllByRole('img', { name: 'gif' })).toHaveLength(0);
    expect(await screen.findByTestId('mock-emoji-picker')).toBeInTheDocument();
  });

  it('inserts the picked emoji into the textarea', async () => {
    renderCreatePost();
    const user = userEvent.setup();

    await user.click(screen.getByTitle('Додати емодзі'));
    await user.click(await screen.findByTestId('mock-emoji-picker'));

    expect(getTextarea()).toHaveValue('😀');
  });

  it('includes poll option text in the submit payload as a JSON array', async () => {
    const onSubmitFormData = renderCreatePost();
    const user = userEvent.setup();

    await user.click(screen.getByTitle('Створити опитування'));
    await user.type(screen.getByPlaceholderText('Варіант 1'), 'Cats');
    await user.type(screen.getByPlaceholderText('Варіант 2'), 'Dogs');
    await user.type(getTextarea(), 'Vote now');
    await user.click(getPublishButton());

    const entries = formDataEntries(onSubmitFormData.mock.calls[0][0] as FormData);
    expect(JSON.parse(entries.poll[0] as string)).toEqual(['Cats', 'Dogs']);
  });

  it('adds a third poll option via the "add option" control', async () => {
    renderCreatePost();
    const user = userEvent.setup();
    await user.click(screen.getByTitle('Створити опитування'));
    expect(screen.queryByPlaceholderText('Варіант 3')).not.toBeInTheDocument();

    await user.click(screen.getByText(/Додати варіант/));

    expect(screen.getByPlaceholderText('Варіант 3')).toBeInTheDocument();
  });

  it('resets and closes the poll UI after a successful submit', async () => {
    renderCreatePost();
    const user = userEvent.setup();
    await user.click(screen.getByTitle('Створити опитування'));
    await user.type(getTextarea(), 'Vote now');

    await user.click(getPublishButton());

    expect(screen.queryByPlaceholderText('Варіант 1')).not.toBeInTheDocument();
  });
});
