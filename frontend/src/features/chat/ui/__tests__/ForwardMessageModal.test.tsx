import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ForwardMessageModal from '../ForwardMessageModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('ForwardMessageModal', () => {
  const queryClient = new QueryClient();

  it('renders forward message title and send button disabled when no chat selected', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ForwardMessageModal onClose={vi.fn()} onForward={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Forward message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^send$/i })).toBeDisabled();
  });
});
