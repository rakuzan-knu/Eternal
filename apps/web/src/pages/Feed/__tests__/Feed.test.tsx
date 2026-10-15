import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FeedPage from '../Feed';
import { useAuthStore } from '../../../shared/model/useAuthStore';
import { resetUIStore } from '../../../test/resetUIStore';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { server } from '../../../test/mocks/server';
import { http, HttpResponse } from 'msw';

vi.mock('emoji-picker-react', () => ({
  default: () => <div data-testid="mock-emoji-picker" />,
  Theme: { DARK: 'dark' },
  EmojiStyle: { APPLE: 'apple' },
  Categories: {},
  SuggestionMode: {},
}));

describe('FeedPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth('user-1');
  });

  afterEach(() => {
    resetUIStore();
    useAuthStore.getState().clearAuth();
    vi.restoreAllMocks();
  });

  it('renders the create-post composer', async () => {
    renderWithProviders(<FeedPage />);

    expect(await screen.findByPlaceholderText("What's new?")).toBeInTheDocument();
  });

  it('renders the feed with posts', async () => {
    renderWithProviders(<FeedPage />);

    expect(await screen.findByText('Thats fire!')).toBeInTheDocument();
    expect(await screen.findByText('Eternal CEO is here!')).toBeInTheDocument();
  });

  it('renders the empty-feed placeholder when there are no posts', async () => {
    server.use(http.get('*/posts', () => HttpResponse.json({ posts: [], nextCursor: null })));

    renderWithProviders(<FeedPage />);

    expect(await screen.findByText("There's nothing here yet...")).toBeInTheDocument();
    expect(await screen.findByText('Discover Creators')).toBeInTheDocument();
  });

  it('submits a new post and clears the composer', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<FeedPage />);

    const composer = await screen.findByPlaceholderText("What's new?");
    await user.type(composer, 'Hello feed');
    await user.click(screen.getByText('Publish'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("What's new?")).toHaveValue('');
    });
  });

  it('distinguishes a failed feed from empty data and keeps the draft after retry', async () => {
    server.use(http.get('*/posts', () => new HttpResponse(null, { status: 503 })));
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<FeedPage />);
    expect(await screen.findByText('Your feed could not load')).toBeInTheDocument();
    expect(screen.queryByText("There's nothing here yet...")).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("What's new?"), 'Keep this draft');
    server.use(http.get('*/posts', () => HttpResponse.json({ posts: [], nextCursor: null })));
    await user.click(screen.getByRole('button', { name: 'Retry feed' }));
    expect(await screen.findByText("There's nothing here yet...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("What's new?")).toHaveValue('Keep this draft');
  });

  it('does not publish an empty post', async () => {
    renderWithProviders(<FeedPage />);

    const publishBtn = await screen.findByText('Publish');
    expect(publishBtn).toBeDisabled();
  });
});
