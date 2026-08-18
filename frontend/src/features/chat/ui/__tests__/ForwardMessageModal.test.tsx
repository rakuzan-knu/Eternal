import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ForwardMessageModal from '../ForwardMessageModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('ForwardMessageModal', () => {
  const queryClient = new QueryClient();

  it('renders forward message title and forward button disabled when no chat selected', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ForwardMessageModal onClose={vi.fn()} onForward={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Forward message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^forward/i })).toBeDisabled();
    expect(screen.getByText('Show sender name')).toBeInTheDocument();
  });

  it('toggles hide author name option', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ForwardMessageModal messageCount={3} onClose={vi.fn()} onForward={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Forward 3 messages')).toBeInTheDocument();
    const toggleBtn = screen.getByText('Show sender name').closest('button')!;
    fireEvent.click(toggleBtn);
    expect(screen.getByText('Sender name hidden')).toBeInTheDocument();
  });
});
