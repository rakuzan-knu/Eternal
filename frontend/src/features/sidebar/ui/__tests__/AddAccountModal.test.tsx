import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddAccountModal } from '../AddAccountModal';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/features/auth/ui/LoginForm', () => ({
  LoginForm: ({ onSuccess }: { onSuccess: (data: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onSuccess({
          user: {
            id: 'new-user',
            username: 'newuser',
            displayName: 'New User',
            email: 'new@example.com',
          },
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
        })
      }
    >
      Simulate Login Success
    </button>
  ),
}));

describe('AddAccountModal', () => {
  it('renders modal and handles back/close and success flow', () => {
    const onBack = vi.fn();
    const onClose = vi.fn();
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AddAccountModal onBack={onBack} onClose={onClose} />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Add account')).toBeInTheDocument();

    const backBtn = screen.getByRole('button', { name: 'Go back' });
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();

    const simLoginBtn = screen.getByText('Simulate Login Success');
    fireEvent.click(simLoginBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
