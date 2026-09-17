import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CallHistoryItem } from '../CallHistoryItem';
import type { MessageView } from '@common/contracts';

describe('CallHistoryItem Component', () => {
  it('renders missed call details correctly', () => {
    const mockMessage: MessageView = {
      id: 'msg-1',
      conversationId: 'conv-1',
      sender: {
        id: 'user-bob',
        username: 'bob',
        displayName: 'Bob',
        avatar: null,
      },
      body: JSON.stringify({
        callId: 'call-1',
        callType: 'AUDIO',
        status: 'MISSED',
        endedReason: 'MISSED',
        durationMs: 0,
      }),
      messageType: 'CALL_LOG',
      replyTo: null,
      forwardedFrom: null,
      attachments: [],
      reactions: [],
      readBy: [],
      isEdited: false,
      isDeleted: false,
      isPinned: false,
      createdAt: new Date(),
      editedAt: null,
    };

    render(<CallHistoryItem message={mockMessage} currentUserId="user-alice" />);

    expect(screen.getByText(/missed voice call/i)).toBeDefined();
    expect(screen.getByText(/call back/i)).toBeDefined();
  });

  it('renders completed call with duration', () => {
    const mockMessage: MessageView = {
      id: 'msg-2',
      conversationId: 'conv-1',
      sender: {
        id: 'user-alice',
        username: 'alice',
        displayName: 'Alice',
        avatar: null,
      },
      body: JSON.stringify({
        callId: 'call-2',
        callType: 'VIDEO',
        status: 'ENDED',
        endedReason: 'ENDED_BY_USER',
        durationMs: 125000,
      }),
      messageType: 'CALL_LOG',
      replyTo: null,
      forwardedFrom: null,
      attachments: [],
      reactions: [],
      readBy: [],
      isEdited: false,
      isDeleted: false,
      isPinned: false,
      createdAt: new Date(),
      editedAt: null,
    };

    render(<CallHistoryItem message={mockMessage} currentUserId="user-alice" />);

    expect(screen.getByText(/video call/i)).toBeDefined();
    expect(screen.getByText(/2m 5s/i)).toBeDefined();
  });
});
