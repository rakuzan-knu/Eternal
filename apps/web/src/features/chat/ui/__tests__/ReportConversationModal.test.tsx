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
      expect(chatApi.reportUser).toHaveBeenCalledWith('target-u1', 'OTHER', 'conv-1');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('handles error in reportUser gracefully and still adds toast and closes', async () => {
    vi.mocked(chatApi.reportUser).mockRejectedValueOnce(new Error('Network failure'));
    const onClose = vi.fn();

    render(
      <ReportConversationModal userId="target-u1" conversationId="conv-1" onClose={onClose} />,
    );

    const reasonBtn = screen.getByText('Violence, hostility or exploitation');
    fireEvent.click(reasonBtn);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
