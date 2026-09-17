import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArchivedChatsModal from '../ArchivedChatsModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('ArchivedChatsModal', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders archive header with locked state by default', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ArchivedChatsModal onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Archived chats')).toBeInTheDocument();
    expect(screen.getByText(/unlock/i)).toBeInTheDocument();
  });

  it('supports expand/collapse toggle and unlocking archive view', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ArchivedChatsModal onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    const expandBtn = screen.getByRole('button', { name: 'Expand' });
    fireEvent.click(expandBtn);
    expect(screen.getByRole('button', { name: 'Collapse' })).toBeInTheDocument();

    // Unlock flow
    const pwdInput = screen.getByPlaceholderText('Password');
    const confirmInput = screen.getByPlaceholderText('Confirm password');
    fireEvent.change(pwdInput, { target: { value: '1234' } });
    fireEvent.change(confirmInput, { target: { value: '1234' } });

    const submitBtn = screen.getByRole('button', { name: /set password & unlock/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Password')).toBeInTheDocument();
    });

    // Relock
    fireEvent.click(screen.getByText('Password'));
    expect(screen.getByText(/unlock/i)).toBeInTheDocument();
  });
});
