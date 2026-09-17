import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeProposalMessage } from '../ThemeProposalMessage';
import { chatApi } from '../../api/chatApi';
import type { MessageView } from '../../../../entities/chat/model/types';
import React from 'react';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    respondThemeProposal: vi.fn(),
  },
}));

vi.mock('../../lib/themeRippleTransition', () => ({
  triggerCircularRippleTransition: vi.fn((_origin, callback) => callback()),
}));

describe('ThemeProposalMessage', () => {
  const mockMessage: MessageView = {
    id: 'msg-prop-1',
    conversationId: 'conv-123',
    sender: {
      id: 'usr-sender',
      username: 'alice',
      displayName: 'Alice',
      avatar: null,
    },
    body: JSON.stringify({
      proposedTheme: 'preset:synthwave',
      status: 'PENDING',
      proposedByUserId: 'usr-sender',
      proposedByUsername: 'Alice',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    }),
    messageType: 'THEME_PROPOSAL',
    replyTo: null,
    forwardedFrom: null,
    attachments: [],
    reactions: [],
    readBy: [],
    isEdited: false,
    isDeleted: false,
    isPinned: false,
    createdAt: new Date().toISOString(),
    editedAt: null,
  };

  it('renders pending theme proposal for recipient with accept and decline buttons', () => {
    render(
      <ThemeProposalMessage
        message={mockMessage}
        currentUserId="usr-recipient"
        conversationId="conv-123"
      />,
    );

    expect(screen.getByText(/Alice proposed a paired theme/i)).toBeInTheDocument();
    expect(screen.getByText('Accept Theme')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders pending theme proposal for sender with cancel button and handles API error', async () => {
    vi.mocked(chatApi.respondThemeProposal).mockRejectedValueOnce(new Error('Network failure'));

    render(
      <ThemeProposalMessage
        message={mockMessage}
        currentUserId="usr-sender"
        conversationId="conv-123"
      />,
    );

    expect(screen.getByText(/You proposed a paired theme/i)).toBeInTheDocument();
    expect(screen.getByText('Cancel Proposal')).toBeInTheDocument();
    expect(screen.queryByText('Accept Theme')).not.toBeInTheDocument();

    const cancelBtn = screen.getByText('Cancel Proposal');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.getByText('Network failure')).toBeInTheDocument();
    });
  });

  it('handles accepting the proposal and triggers onThemeAccepted callback', async () => {
    const onThemeAccepted = vi.fn();
    vi.mocked(chatApi.respondThemeProposal).mockResolvedValueOnce({
      ...mockMessage,
      body: JSON.stringify({
        proposedTheme: 'preset:synthwave',
        status: 'ACCEPTED',
        proposedByUserId: 'usr-sender',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    });

    render(
      <ThemeProposalMessage
        message={mockMessage}
        currentUserId="usr-recipient"
        conversationId="conv-123"
        onThemeAccepted={onThemeAccepted}
      />,
    );

    const acceptBtn = screen.getByText('Accept Theme');
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(chatApi.respondThemeProposal).toHaveBeenCalledWith('conv-123', 'msg-prop-1', 'ACCEPT');
      expect(onThemeAccepted).toHaveBeenCalledWith('preset:synthwave');
    });
  });

  it('renders accepted, declined and cancelled statuses and handles corrupted body', () => {
    // Declined
    const { rerender } = render(
      <ThemeProposalMessage
        message={{
          ...mockMessage,
          body: JSON.stringify({
            proposedTheme: 'preset:synthwave',
            status: 'DECLINED',
            proposedByUserId: 'usr-sender',
          }),
        }}
        currentUserId="usr-recipient"
        conversationId="conv-123"
      />,
    );
    expect(screen.getByText('Declined')).toBeInTheDocument();

    // Cancelled
    rerender(
      <ThemeProposalMessage
        message={{
          ...mockMessage,
          body: JSON.stringify({
            proposedTheme: 'preset:synthwave',
            status: 'CANCELLED',
            proposedByUserId: 'usr-sender',
          }),
        }}
        currentUserId="usr-recipient"
        conversationId="conv-123"
      />,
    );
    expect(screen.getByText('Cancelled')).toBeInTheDocument();

    // Invalid JSON
    rerender(
      <ThemeProposalMessage
        message={{ ...mockMessage, body: 'invalid-json{' }}
        currentUserId="usr-recipient"
        conversationId="conv-123"
      />,
    );
    expect(screen.getByText('Failed to load theme data')).toBeInTheDocument();
  });

  it('handles declining the proposal', async () => {
    vi.mocked(chatApi.respondThemeProposal).mockResolvedValueOnce({
      ...mockMessage,
      body: JSON.stringify({
        proposedTheme: 'preset:synthwave',
        status: 'DECLINED',
        proposedByUserId: 'usr-sender',
      }),
    });

    render(
      <ThemeProposalMessage
        message={mockMessage}
        currentUserId="usr-recipient"
        conversationId="conv-123"
      />,
    );

    const declineBtn = screen.getByText('Decline');
    fireEvent.click(declineBtn);

    await waitFor(() => {
      expect(chatApi.respondThemeProposal).toHaveBeenCalledWith(
        'conv-123',
        'msg-prop-1',
        'DECLINE',
      );
    });
  });

  it('handles non-Error throw gracefully with default error text', async () => {
    vi.mocked(chatApi.respondThemeProposal).mockRejectedValueOnce('string error');

    render(
      <ThemeProposalMessage
        message={mockMessage}
        currentUserId="usr-sender"
        conversationId="conv-123"
      />,
    );

    const cancelBtn = screen.getByText('Cancel Proposal');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.getByText('Failed to update theme')).toBeInTheDocument();
    });
  });
});
