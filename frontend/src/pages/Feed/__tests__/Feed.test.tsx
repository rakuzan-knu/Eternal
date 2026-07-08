import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FeedPage from '../Feed';
import { resetUIStore } from '../../../test/resetUIStore';

vi.mock('emoji-picker-react', () => ({
  default: () => <div data-testid="mock-emoji-picker" />,
  Theme: { DARK: 'dark' },
  EmojiStyle: { APPLE: 'apple' },
}));

describe('FeedPage', () => {
  afterEach(() => {
    resetUIStore();
    vi.restoreAllMocks();
  });

  it('renders the create-post composer', () => {
    render(<FeedPage />);

    expect(screen.getByPlaceholderText('Що нового?')).toBeInTheDocument();
  });

  it('renders the empty-feed placeholder', () => {
    render(<FeedPage />);

    expect(screen.getByText('Тут поки що нічого немає...')).toBeInTheDocument();
  });

  it('does not render the comment modal by default', () => {
    render(<FeedPage />);

    expect(screen.queryByText('Немає коментарів')).not.toBeInTheDocument();
  });

  it('logs the new post payload and clears the composer on submit', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<FeedPage />);

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
    render(<FeedPage />);

    await user.click(screen.getByText('Опублікувати'));

    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
