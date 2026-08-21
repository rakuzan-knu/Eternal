import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportProblemModal } from '../ReportProblemModal';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

describe('ReportProblemModal', () => {
  it('renders problem report intro and handles continue and cancel', async () => {
    const onClose = vi.fn();
    const onContinue = vi.fn();

    render(
      <BrowserRouter>
        <ReportProblemModal onClose={onClose} onContinue={onContinue} />
      </BrowserRouter>,
    );

    expect(screen.getByText('Problem report')).toBeInTheDocument();
    expect(screen.getByText('Help Center')).toBeInTheDocument();

    const continueBtn = screen.getByRole('button', { name: 'Continue to report' });
    fireEvent.click(continueBtn);
    expect(onContinue).toHaveBeenCalled();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
