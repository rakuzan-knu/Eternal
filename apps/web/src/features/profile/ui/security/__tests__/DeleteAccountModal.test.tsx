import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import DeleteAccountModal from '../DeleteAccountModal';

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { id: 'user-1', username: 'testuser', displayName: 'Test User' },
  }),
}));

vi.mock('@/shared/model/useUIStore', () => ({
  useUIStore: () => ({
    closeEditProfile: vi.fn(),
  }),
}));

const mockMutateAsync = vi.fn().mockResolvedValue({ success: true });
vi.mock('../../../model/useDeleteAccount', () => ({
  useDeleteAccount: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('DeleteAccountModal', () => {
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title, warning message and password input', () => {
    renderWithProviders(<DeleteAccountModal onClose={onCloseMock} />);

    expect(screen.getByRole('heading', { name: 'Delete Account' })).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    expect(screen.getByText(/@testuser/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  it('disables submit button when password is empty', () => {
    renderWithProviders(<DeleteAccountModal onClose={onCloseMock} />);

    const submitBtn = screen.getByRole('button', { name: 'Delete Account' });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit button when password is entered', () => {
    renderWithProviders(<DeleteAccountModal onClose={onCloseMock} />);

    const input = screen.getByPlaceholderText('Enter your password');
    fireEvent.change(input, { target: { value: 'secret123' } });

    const submitBtn = screen.getByRole('button', { name: 'Delete Account' });
    expect(submitBtn).not.toBeDisabled();
  });

  it('submits account deletion and handles 401 error and visibility toggle', async () => {
    mockMutateAsync.mockRejectedValueOnce({ response: { status: 401 } });

    renderWithProviders(<DeleteAccountModal onClose={onCloseMock} />);

    // Toggle password visibility
    const showBtn = screen.getByRole('button', { name: 'Show password' });
    fireEvent.click(showBtn);

    const input = screen.getByPlaceholderText('Enter your password');
    fireEvent.change(input, { target: { value: 'wrongpass' } });

    const submitBtn = screen.getByRole('button', { name: 'Delete Account' });
    fireEvent.click(submitBtn);

    await screen.findByText(/Incorrect password/i);

    // Cancel button
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalled();
    });
  });
});
