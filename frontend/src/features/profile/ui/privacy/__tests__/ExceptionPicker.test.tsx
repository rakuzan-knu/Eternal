import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExceptionPicker from '../ExceptionPicker';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../../api/privacyApi', () => ({
  privacyApi: {
    listExceptions: vi.fn().mockResolvedValue({ alwaysAllow: [], neverAllow: [] }),
    addException: vi.fn().mockResolvedValue({ success: true }),
    removeException: vi.fn().mockResolvedValue({ success: true }),
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
});
