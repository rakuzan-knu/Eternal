import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeactivateAccountModal from '../DeactivateAccountModal';
import { securityApi } from '../../../api/securityApi';

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { id: 'usr-1', username: 'ayate', displayName: 'Ayate' },
  }),
}));

const mockUpdatePrivacy = vi.fn().mockResolvedValue({ success: true });
vi.mock('../../../model/usePrivacy', () => ({
  useUpdatePrivacy: () => ({
    mutateAsync: mockUpdatePrivacy,
    isPending: false,
  }),
}));

const mockUpdateShowcase = vi.fn().mockResolvedValue({ success: true });
vi.mock('@/entities/showcase/model/useShowcase', () => ({
  useUpdateShowcase: () => ({
    mutateAsync: mockUpdateShowcase,
    isPending: false,
  }),
}));

vi.mock('../../../api/securityApi', () => ({
  securityApi: {
    verifyPassword: vi.fn(),
  },
}));

describe('DeactivateAccountModal', () => {
  let queryClient: QueryClient;
  const onClose = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('handles step 1 password verification and advances to duration step', async () => {
    vi.mocked(securityApi.verifyPassword).mockResolvedValueOnce({ valid: true });

    render(
      <QueryClientProvider client={queryClient}>
        <DeactivateAccountModal onClose={onClose} />
      </QueryClientProvider>,
    );

    // Initial step: password verification
    expect(screen.getByRole('heading', { name: /Deactivate Account/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your current password/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Enter your current password/i);
    fireEvent.change(input, { target: { value: 'mypassword123' } });

    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(securityApi.verifyPassword).toHaveBeenCalledWith('mypassword123');
    });

    // Step 2: Duration selection
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Deactivation Duration/i })).toBeInTheDocument();
    });

    // Verify time unit buttons
    expect(screen.getByRole('button', { name: 'Hours' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Weeks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Months' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Years' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Indefinitely' })).toBeInTheDocument();

    // Confirm deactivation
    const confirmBtn = screen.getByRole('button', { name: /Deactivate Account/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockUpdatePrivacy).toHaveBeenCalledWith({ isPrivate: true });
      expect(mockUpdateShowcase).toHaveBeenCalledWith(
        expect.objectContaining({
          privacyMeta: 'PRIVATE',
          privacyActivity: 'PRIVATE',
          privacyShowcase: 'PRIVATE',
          privacyLinks: 'PRIVATE',
        }),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows error message when password verification fails', async () => {
    vi.mocked(securityApi.verifyPassword).mockRejectedValueOnce(new Error('Unauthorized'));

    render(
      <QueryClientProvider client={queryClient}>
        <DeactivateAccountModal onClose={onClose} />
      </QueryClientProvider>,
    );

    const input = screen.getByPlaceholderText(/Enter your current password/i);
    fireEvent.change(input, { target: { value: 'wrongpassword' } });

    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/Incorrect password/i)).toBeInTheDocument();
    });
  });
});
