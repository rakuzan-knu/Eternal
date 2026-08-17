import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PollVotersModal } from '../PollVotersModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/httpClient';

describe('PollVotersModal', () => {
  it('renders modal header and options with voters list', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: [
        {
          optionId: 'opt-1',
          voters: [{ id: 'usr-1', username: 'bob', displayName: 'Bob', avatar: null }],
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
    });

    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
