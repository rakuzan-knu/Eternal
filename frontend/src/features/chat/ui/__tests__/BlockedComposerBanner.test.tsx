import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BlockedComposerBanner from '../BlockedComposerBanner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('BlockedComposerBanner', () => {
  const queryClient = new QueryClient();

  it('renders blocked by me message and unblock button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BlockedComposerBanner otherUserId="usr-2" blockedByMe={true} blockingMe={false} />
      </QueryClientProvider>,
    );

    expect(
      screen.getByText(/you blocked this user. you can no longer message each other/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unblock/i })).toBeInTheDocument();
  });

  it('renders blocking me banner without unblock button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BlockedComposerBanner otherUserId="usr-2" blockedByMe={false} blockingMe={true} />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/you can't reply to this conversation/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unblock/i })).not.toBeInTheDocument();
  });
});
