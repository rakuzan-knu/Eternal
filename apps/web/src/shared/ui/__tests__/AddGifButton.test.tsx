import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isGifSearchConfigured, searchGifs, type GifPage } from '@/shared/api/giphy';
import { AddGifButton } from '../AddGifButton';

vi.mock('@/shared/api/giphy', () => ({ isGifSearchConfigured: vi.fn(), searchGifs: vi.fn() }));
const page: GifPage = {
  gifs: [
    {
      id: 'cat',
      title: 'Happy cat',
      url: 'https://media0.giphy.com/cat.gif?cid=test',
      previewUrl: 'https://media1.giphy.com/cat-small.gif',
    },
  ],
  nextOffset: 24,
  hasMore: true,
};
describe('AddGifButton', () => {
  beforeEach(() => {
    vi.mocked(isGifSearchConfigured).mockReturnValue(true);
    vi.mocked(searchGifs).mockResolvedValue(page);
  });
  afterEach(() => vi.resetAllMocks());
  it('does not request GIFs while closed or disabled', () => {
    const { rerender } = render(
      <AddGifButton isOpen={false} onToggle={vi.fn()} onGifSelect={vi.fn()} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(<AddGifButton isOpen disabled onToggle={vi.fn()} onGifSelect={vi.fn()} />);
    expect(searchGifs).not.toHaveBeenCalled();
  });
  it('loads trending GIFs and selects the animated URL', async () => {
    const select = vi.fn(),
      toggle = vi.fn();
    render(<AddGifButton isOpen onToggle={toggle} onGifSelect={select} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Select Happy cat' }));
    expect(searchGifs).toHaveBeenCalledWith('', 0, expect.any(AbortSignal), 'posts');
    expect(select).toHaveBeenCalledWith(page.gifs[0].url);
    expect(toggle).not.toHaveBeenCalled();
  });
  it('debounces search and resets pagination for a new query', async () => {
    render(<AddGifButton isOpen onToggle={vi.fn()} onGifSelect={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Load more GIFs' }));
    await waitFor(() =>
      expect(searchGifs).toHaveBeenLastCalledWith('', 24, expect.any(AbortSignal), 'posts'),
    );
    expect(screen.getAllByRole('button', { name: 'Select Happy cat' })).toHaveLength(1);
    await userEvent.type(screen.getByRole('searchbox'), 'dogs');
    await waitFor(() =>
      expect(searchGifs).toHaveBeenLastCalledWith('dogs', 0, expect.any(AbortSignal), 'posts'),
    );
    expect(vi.mocked(searchGifs).mock.calls.filter(([query]) => query === 'dogs')).toHaveLength(1);
  });
  it('shows loading skeletons and cancels a closed request', async () => {
    vi.mocked(searchGifs).mockImplementation(() => new Promise(() => {}));
    const { rerender } = render(<AddGifButton isOpen onToggle={vi.fn()} onGifSelect={vi.fn()} />);
    expect(await screen.findByRole('status')).toHaveTextContent('Loading GIFs');
    expect(document.querySelectorAll('.skeleton-shimmer')).toHaveLength(6);
    const signal = vi.mocked(searchGifs).mock.calls[0][2];
    rerender(<AddGifButton isOpen={false} onToggle={vi.fn()} onGifSelect={vi.fn()} />);
    expect(signal?.aborted).toBe(true);
  });
  it('uses the chat integration for a message composer', async () => {
    render(<AddGifButton isOpen section="chat" onToggle={vi.fn()} onGifSelect={vi.fn()} />);
    await screen.findByRole('button', { name: 'Select Happy cat' });
    expect(isGifSearchConfigured).toHaveBeenCalledWith('chat');
    expect(searchGifs).toHaveBeenCalledWith('', 0, expect.any(AbortSignal), 'chat');
  });
  it('ignores a stale response after changing search', async () => {
    let resolveOld: (value: GifPage) => void = () => {};
    vi.mocked(searchGifs).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    vi.mocked(searchGifs).mockResolvedValue({ gifs: [], nextOffset: 0, hasMore: false });
    render(<AddGifButton isOpen onToggle={vi.fn()} onGifSelect={vi.fn()} />);
    await userEvent.type(screen.getByRole('searchbox'), 'dogs');
    await screen.findByText('No GIFs found. Try another search.');
    resolveOld(page);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Select Happy cat' })).not.toBeInTheDocument(),
    );
  });
  it('reports failure and retries', async () => {
    vi.mocked(searchGifs).mockRejectedValueOnce(new Error('offline'));
    render(<AddGifButton isOpen onToggle={vi.fn()} onGifSelect={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('GIFs could not load.');
    await userEvent.click(screen.getByRole('button', { name: 'Retry GIFs' }));
    expect(await screen.findByRole('button', { name: 'Select Happy cat' })).toBeVisible();
  });
  it('handles missing configuration without a provider request', () => {
    vi.mocked(isGifSearchConfigured).mockReturnValue(false);
    render(<AddGifButton isOpen onToggle={vi.fn()} onGifSelect={vi.fn()} />);
    expect(screen.getByText('GIF search is not available yet.')).toBeVisible();
    expect(searchGifs).not.toHaveBeenCalled();
  });
  it('portals above the modal and closes on outside click or Escape', async () => {
    const toggle = vi.fn();
    render(
      <div data-modal-id="composer" style={{ zIndex: 10000 }}>
        <AddGifButton isOpen usePortal onToggle={toggle} onGifSelect={vi.fn()} />
      </div>,
    );
    await screen.findByRole('button', { name: 'Select Happy cat' });
    const dialog = screen.getByRole('dialog', { name: 'GIF picker' });
    expect(dialog).toHaveAttribute('data-modal-owner', 'composer');
    expect(Number(dialog.style.zIndex)).toBeGreaterThan(10000);
    fireEvent.mouseDown(document.body);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveBeenCalledTimes(2);
  });
});
