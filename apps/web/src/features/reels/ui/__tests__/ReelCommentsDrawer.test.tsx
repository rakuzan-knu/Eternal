import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/shared/api/httpClient';
import { ReelCommentsDrawer } from '../ReelCommentsDrawer';

vi.mock('@/shared/ui/Avatar', () => ({ default: () => <span /> }));
vi.mock('@/shared/ui/StyledDisplayName', () => ({
  default: ({ name }: { name: string }) => <span>{name}</span>,
}));

afterEach(() => vi.restoreAllMocks());

const comment = {
  id: 'comment-1',
  reelId: 'reel-1',
  userId: 'user-1',
  content: 'My comment',
  createdAt: '2026-10-21T10:00:00Z',
  user: { id: 'user-1', username: 'alice', displayName: 'Alice', avatar: null },
};

function setup(commentsCount = 0) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ReelCommentsDrawer
          reelId="reel-1"
          isOpen
          onClose={() => {}}
          commentsCount={commentsCount}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Reel comment recovery', () => {
  it('preserves a failed draft and allows a successful retry', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    vi.spyOn(apiClient, 'post')
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ data: comment });
    setup();
    await screen.findByText('No comments yet.');
    const input = screen.getByRole('textbox', { name: 'Comment' });
    fireEvent.change(input, { target: { value: 'My comment' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send comment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Your comment was not sent');
    expect(input).toHaveValue('My comment');
    expect(input).toHaveAccessibleDescription(/Your comment was not sent/);
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send comment' }));

    await screen.findByText('Alice');
    await waitFor(() => expect(input).toHaveValue(''));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not erase a new draft typed while an earlier comment is sending', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    let confirm!: (value: { data: typeof comment }) => void;
    vi.spyOn(apiClient, 'post').mockImplementation(
      () =>
        new Promise((resolve) => {
          confirm = resolve;
        }),
    );
    setup();
    await screen.findByText('No comments yet.');
    const input = screen.getByRole('textbox', { name: 'Comment' });
    fireEvent.change(input, { target: { value: 'My comment' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send comment' }));
    await screen.findByRole('button', { name: 'Sending comment' });
    fireEvent.change(input, { target: { value: 'My next thought' } });
    await act(async () => confirm({ data: comment }));
    await screen.findByText('Alice');
    expect(input).toHaveValue('My next thought');
  });

  it('distinguishes a failed load from an empty list and recovers with Retry', async () => {
    vi.spyOn(apiClient, 'get')
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ data: [] });
    setup(215);
    expect(await screen.findByRole('alert')).toHaveTextContent('Comments could not load');
    expect(screen.queryByText(/No comments/)).not.toBeInTheDocument();
    expect(screen.queryByText('(215)')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry comments' }));
    await screen.findByText('No comments to display.');
    expect(screen.queryByText('(215)')).not.toBeInTheDocument();
    expect(screen.queryByText(/Be the first/)).not.toBeInTheDocument();
  });
});
