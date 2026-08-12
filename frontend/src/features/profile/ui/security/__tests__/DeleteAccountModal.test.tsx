import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

vi.mock('../../model/useDeleteAccount', () => ({
  useDeleteAccount: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
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
});
