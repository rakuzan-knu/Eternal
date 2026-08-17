import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MentionAutocomplete } from '../MentionAutocomplete';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/httpClient';

describe('MentionAutocomplete', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders null when cursor is not at mention trigger', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MentionAutocomplete text="Hello world" cursorPos={5} onSelect={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('detects @ mention trigger and displays suggestions list', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: [{ id: 'usr-1', username: 'alice', displayName: 'Alice Smith', avatar: null }],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MentionAutocomplete text="Hello @al" cursorPos={9} onSelect={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
  });
});
