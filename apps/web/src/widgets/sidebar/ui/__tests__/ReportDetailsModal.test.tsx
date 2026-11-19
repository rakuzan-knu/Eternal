import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportDetailsModal } from '../ReportDetailsModal';
import { reportApi } from '../../api/reportApi';
import React from 'react';

vi.mock('../../api/reportApi', () => ({
  reportApi: {
    submitReport: vi.fn(),
  },
}));

describe('ReportDetailsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retains the draft and offers the real support channel when app delivery fails', async () => {
    vi.mocked(reportApi.submitReport).mockRejectedValueOnce(
      new Error('Synthetic unavailable route'),
    );
    render(<ReportDetailsModal onClose={vi.fn()} onBack={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/explain what exactly/i);
    fireEvent.change(textarea, { target: { value: 'Synthetic report draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit a report' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('link')).toHaveAttribute('href', 'mailto:eternalnet.support@proton.me');
    expect(textarea).toHaveValue('Synthetic report draft');
    expect(screen.queryByText('Thank you! Report sent.')).not.toBeInTheDocument();
  });

  it('renders input form, handles description and submits report successfully', async () => {
    vi.mocked(reportApi.submitReport).mockResolvedValue({ success: true } as unknown as never);
    const onClose = vi.fn();
    const onBack = vi.fn();

    render(<ReportDetailsModal onClose={onClose} onBack={onBack} />);

    expect(screen.getByText('Report details')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/explain what exactly/i);
    fireEvent.change(textarea, { target: { value: 'Crash on feed scroll' } });

    const submitBtn = screen.getByRole('button', { name: 'Submit a report' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(reportApi.submitReport).toHaveBeenCalledWith({
        description: 'Crash on feed scroll',
        area: 'Home',
        screenshot: null,
      });
      expect(screen.getByText('Thank you! Report sent.')).toBeInTheDocument();
    });
  });
});
