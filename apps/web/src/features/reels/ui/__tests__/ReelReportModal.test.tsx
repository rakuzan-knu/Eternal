import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { apiClient } from '@/shared/api/httpClient';
import { ReelReportModal } from '../ReelReportModal';

afterEach(() => vi.restoreAllMocks());

it('preserves the report category and details after failure and retries before acknowledging success', async () => {
  const post = vi
    .spyOn(apiClient, 'post')
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce({ data: { success: true, message: 'Sent' } });
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <ReelReportModal reelId="reel-1" isOpen onClose={onClose} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('radio', { name: 'Harassment or bullying' }));
  const details = screen.getByRole('textbox', { name: 'Additional comments (optional):' });
  fireEvent.change(details, { target: { value: 'Keep these details' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your report was not sent');
  expect(screen.queryByText('Report Submitted')).not.toBeInTheDocument();
  expect(details).toHaveValue('Keep these details');
  expect(screen.getByRole('radio', { name: 'Harassment or bullying' })).toBeChecked();
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));
  await screen.findByText('Report Submitted');
  expect(post).toHaveBeenLastCalledWith('/reels/reel-1/report', {
    category: 'HARASSMENT',
    details: 'Keep these details',
  });
});
