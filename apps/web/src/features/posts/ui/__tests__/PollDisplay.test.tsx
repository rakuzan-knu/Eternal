import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PollDisplay } from '../PollDisplay';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PollData } from '@/entities/post/model/types';

describe('PollDisplay', () => {
  const queryClient = new QueryClient();

  const samplePoll: PollData = {
    id: 'poll-1',
    totalVotes: 10,
    myVoteOptionId: null,
    options: [
      { id: 'opt-1', text: 'React', votes: 7, votesCount: 7 },
      { id: 'opt-2', text: 'Vue', votes: 3, votesCount: 3 },
    ],
  };

  it('renders voting buttons when user has not voted and is not owner', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PollDisplay postId="post-1" poll={samplePoll} isOwner={false} queryKey={['posts']} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Vue')).toBeInTheDocument();
    expect(screen.getByText('10 votes')).toBeInTheDocument();
  });

  it('renders poll results percentages when user has voted or is owner', () => {
    const votedPoll: PollData = {
      ...samplePoll,
      myVoteOptionId: 'opt-1',
    };

    render(
      <QueryClientProvider client={queryClient}>
        <PollDisplay postId="post-1" poll={votedPoll} isOwner={false} queryKey={['posts']} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });
});
