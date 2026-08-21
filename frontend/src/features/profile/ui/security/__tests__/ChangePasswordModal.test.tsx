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
});
