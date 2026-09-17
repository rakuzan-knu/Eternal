import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PollVotersModal } from '../PollVotersModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/httpClient';

describe('PollVotersModal', () => {
  it('renders modal header and options with voters list, handles Escape key and backdrop click', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: [
        {
          optionId: 'opt-1',
          voters: [
            { id: 'usr-1', username: 'bob', displayName: 'Bob', avatar: null },
            { id: 'usr-2', username: 'alice', displayName: null, avatar: null },
          ],
        },
      ],
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const onClose = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <PollVotersModal
          postId="post-1"
          options={[
            { id: 'opt-1', text: 'Option A' },
            { id: 'opt-2', text: 'Option B' },
          ]}
          onClose={onClose}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Who voted')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Option A/)).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('No one voted yet..')).toBeInTheDocument();
    });

    // Modal card stop propagation click
    const modalContent = screen.getByText('Who voted').closest('div[class*="max-w-md"]')!;
    fireEvent.click(modalContent);
    expect(onClose).not.toHaveBeenCalled();

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Backdrop click
    const backdrop = screen.getByText('Who voted').closest('.fixed')!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);

    const closeBtn = screen.getByTitle('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(3);

    // Other key should not close
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('renders 1 vote label and loading state correctly', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: [
        {
          optionId: 'opt-1',
          voters: [{ id: 'usr-1', username: 'charlie', displayName: 'Charlie', avatar: null }],
        },
      ],
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PollVotersModal
          postId="post-2"
          options={[{ id: 'opt-1', text: 'Option 1' }]}
          onClose={vi.fn()}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('1 vote')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  it('renders loading state when query is pending', () => {
    vi.spyOn(apiClient, 'get').mockReturnValue(new Promise(() => {}));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PollVotersModal
          postId="post-3"
          options={[{ id: 'opt-1', text: 'Option 1' }]}
          onClose={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Loading voters...')).toBeInTheDocument();
  });
});
