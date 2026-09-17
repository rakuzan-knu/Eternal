import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChangePasswordModal from '../ChangePasswordModal';
import { securityApi } from '../../../api/securityApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../../api/securityApi', () => ({
  securityApi: {
    changePassword: vi.fn(),
  },
}));

vi.mock('@/features/profile/api/securityApi', () => ({
  securityApi: {
    changePassword: vi.fn(),
  },
}));

describe('ChangePasswordModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('validates password inputs and submits change password request', async () => {
    vi.mocked(securityApi.changePassword).mockResolvedValue({ success: true } as unknown as never);
    const onClose = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <ChangePasswordModal onClose={onClose} />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Change password' })).toBeInTheDocument();

    const currentInput = screen.getByPlaceholderText('Current password');
    const newInput = screen.getByPlaceholderText('New password');
    const confirmInput = screen.getByPlaceholderText('Confirm new password');

    fireEvent.change(currentInput, { target: { value: 'oldpassword123' } });
    fireEvent.change(newInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'newpassword123' } });

    const submitBtn = screen.getByRole('button', { name: 'Change password' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(securityApi.changePassword).toHaveBeenCalledWith({
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
      });
    });
  });

  it('handles visibility toggle, validation errors, and 401 error', async () => {
    vi.mocked(securityApi.changePassword).mockRejectedValueOnce({
      response: { status: 401 },
    });
    const onClose = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <ChangePasswordModal onClose={onClose} />
      </QueryClientProvider>,
    );

    const showBtn = screen.getByRole('button', { name: 'Show password' });
    fireEvent.click(showBtn);

    const currentInput = screen.getByPlaceholderText('Current password');
    const newInput = screen.getByPlaceholderText('New password');
    const confirmInput = screen.getByPlaceholderText('Confirm new password');

    // Too short
    fireEvent.change(newInput, { target: { value: 'short' } });
    expect(screen.getByText(/Use at least 8 characters/i)).toBeInTheDocument();

    // Mismatch
    fireEvent.change(newInput, { target: { value: 'longenoughpass' } });
    fireEvent.change(confirmInput, { target: { value: 'differentpass' } });
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();

    // Submit with wrong current password
    fireEvent.change(currentInput, { target: { value: 'wrongcurrent' } });
    fireEvent.change(confirmInput, { target: { value: 'longenoughpass' } });

    const submitBtn = screen.getByRole('button', { name: 'Change password' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect.')).toBeInTheDocument();
    });

    // Close button
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
