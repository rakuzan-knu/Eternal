import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FeedPage from '../Feed';
import { useAuthStore } from '../../../shared/model/useAuthStore';
import { resetUIStore } from '../../../test/resetUIStore';

vi.mock('emoji-picker-react', () => ({
  default: () => <div data-testid="mock-emoji-picker" />,
  Theme: { DARK: 'dark' },
  EmojiStyle: { APPLE: 'apple' },
}));

function renderFeed() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FeedPage />
    </QueryClientProvider>,
  );
}

describe('FeedPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth('user-1');
  });

  afterEach(() => {
    resetUIStore();
    useAuthStore.getState().clearAuth();
    vi.restoreAllMocks();
  });

  it('renders the create-post composer', () => {
    renderFeed();

    expect(screen.getByPlaceholderText('Що нового?')).toBeInTheDocument();
  });

  it('renders the empty-feed placeholder', () => {
    renderFeed();

    expect(screen.getByText('Тут поки що нічого немає...')).toBeInTheDocument();
  });

  it('does not render the comment modal by default', () => {
    renderFeed();

    expect(screen.queryByText('Немає коментарів')).not.toBeInTheDocument();
  });

  it('logs the new post payload and clears the composer on submit', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const user = userEvent.setup();
    renderFeed();

    await user.type(screen.getByPlaceholderText('Що нового?'), 'Hello feed');
    await user.click(screen.getByText('Опублікувати'));

    expect(consoleSpy).toHaveBeenCalledWith(
      'Новий пост готовий до відправки:',
      expect.objectContaining({ text: 'Hello feed' }),
    );
    expect(screen.getByPlaceholderText('Що нового?')).toHaveValue('');
  });

  it('does not log anything when publishing an empty post', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const user = userEvent.setup();
    renderFeed();

    await user.click(screen.getByText('Опублікувати'));

    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
