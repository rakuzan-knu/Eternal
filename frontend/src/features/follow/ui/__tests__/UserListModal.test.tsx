import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserListModal } from '../UserListModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

describe('UserListModal', () => {
  const queryClient = new QueryClient();

  it('renders modal title and search input', () => {
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <UserListModal userId="usr-1" mode="followers" isOwnProfile={true} onClose={onClose} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Followers')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by name or username/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
