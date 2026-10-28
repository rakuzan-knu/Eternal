import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportConversationModal from '../ReportConversationModal';
import { chatApi } from '../../api/chatApi';
import React from 'react';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    reportUser: vi.fn(),
  },
}));

describe('ReportConversationModal', () => {
  it('renders report reasons and submits report on reason selection', async () => {
    vi.mocked(chatApi.reportUser).mockResolvedValue({ success: true } as unknown as never);
    const onClose = vi.fn();

    render(
      <ReportConversationModal userId="target-u1" conversationId="conv-1" onClose={onClose} />,
    );

    expect(screen.getByText('Report conversation')).toBeInTheDocument();
    expect(screen.getByText('Fraud, deception, or spam')).toBeInTheDocument();

    const reasonBtn = screen.getByText('Fraud, deception, or spam');
    fireEvent.click(reasonBtn);

    await waitFor(() => {
      expect(chatApi.reportUser).toHaveBeenCalledWith(
        'target-u1',
        'FRAUD',
        'Fraud, deception, or spam\nConversation: conv-1',
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('retains the reason after failure and submits only on successful retry', async () => {
    vi.mocked(chatApi.reportUser).mockRejectedValueOnce(new Error('Network failure'));
    const onClose = vi.fn();

    render(
      <ReportConversationModal userId="target-u1" conversationId="conv-1" onClose={onClose} />,
    );

    const reasonBtn = screen.getByText('Violence, hostility or exploitation');
    fireEvent.click(reasonBtn);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Your report was not sent'),
    );
    expect(onClose).not.toHaveBeenCalled();
    vi.mocked(chatApi.reportUser).mockResolvedValueOnce(undefined as never);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
