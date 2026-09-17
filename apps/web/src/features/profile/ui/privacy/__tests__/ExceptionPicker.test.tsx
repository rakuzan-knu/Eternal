import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExceptionPicker from '../ExceptionPicker';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { privacyApi } from '../../../api/privacyApi';
import { userSearchApi } from '@/entities/user/api/userSearchApi';
import React from 'react';

vi.mock('../../../api/privacyApi', () => ({
  privacyApi: {
    listExceptions: vi.fn().mockResolvedValue({ allow: [], deny: [] }),
    addException: vi.fn().mockResolvedValue({ success: true }),
    removeException: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/features/profile/api/privacyApi', () => ({
  privacyApi: {
    listExceptions: vi.fn().mockResolvedValue({ allow: [], deny: [] }),
    addException: vi.fn().mockResolvedValue({ success: true }),
    removeException: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/entities/user/api/userSearchApi', () => ({
  userSearchApi: {
    search: vi.fn().mockResolvedValue([]),
  },
}));

describe('ExceptionPicker', () => {
  it('renders search input for adding exceptions', () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ExceptionPicker dimension="MESSAGES" mode="ALLOW" />
      </QueryClientProvider>,
    );

    expect(screen.getByPlaceholderText('Search people to add')).toBeInTheDocument();
  });

  it('renders existing exceptions, removes an exception, and adds new exception from search', async () => {
    vi.mocked(privacyApi.listExceptions).mockResolvedValue({
      allow: [{ id: 'usr-1', username: 'alice', displayName: 'Alice', avatar: null }],
      deny: [],
    } as any);

    vi.mocked(userSearchApi.search).mockResolvedValue([
      { id: 'usr-2', username: 'bob', displayName: 'Bob', avatar: null } as any,
    ]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ExceptionPicker dimension="MESSAGES" mode="ALLOW" />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Alice')).toBeInTheDocument();

    // Remove exception
    const removeBtn = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(removeBtn);
    await waitFor(() => {
      expect(privacyApi.removeException).toHaveBeenCalled();
    });

    // Search and add
    const searchInput = screen.getByPlaceholderText('Search people to add');
    fireEvent.change(searchInput, { target: { value: 'bob' } });

    const bobOption = await screen.findByText('Bob');
    fireEvent.click(bobOption);
    await waitFor(() => {
      expect(privacyApi.addException).toHaveBeenCalled();
    });
  });
});
