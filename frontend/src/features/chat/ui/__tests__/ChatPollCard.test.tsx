import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatPollCard, { ChatPollData } from '../ChatPollCard';
import { useChatPollVotesStore } from '../../model/useChatPollVotesStore';

describe('ChatPollCard', () => {
  const mockPoll: ChatPollData = {
    type: 'POLL',
    question: 'Good?',
    options: [
      { id: 'opt-1', text: 'Yes', votes: 0 },
      { id: 'opt-2', text: 'No', votes: 0 },
    ],
  };

  beforeEach(() => {
    useChatPollVotesStore.setState({ votes: {} });
  });

  it('renders poll question and options', () => {
    render(<ChatPollCard messageId="msg-poll-1" poll={mockPoll} isOwnMessage={false} />);

    expect(screen.getByText('Good?')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('handles voting on option and renders percentage progress', () => {
    render(<ChatPollCard messageId="msg-poll-1" poll={mockPoll} isOwnMessage={false} />);

    const yesBtn = screen.getByText('Yes').closest('button')!;
    fireEvent.click(yesBtn);

    expect(useChatPollVotesStore.getState().getVote('msg-poll-1')).toBe('opt-1');
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('1 vote')).toBeInTheDocument();
  });
});
