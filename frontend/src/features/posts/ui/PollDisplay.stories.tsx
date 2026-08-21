import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { PollDisplay } from './PollDisplay';
import { PollData } from '@/entities/post/model/types';

const unvotedPoll: PollData = {
  id: 'poll-1',
  title: 'Which framework do you prefer for frontend web applications?',
  totalVotes: 142,
  myVoteOptionId: null,
  options: [
    { id: 'opt-1', text: 'React & Vite', votes: 85 },
    { id: 'opt-2', text: 'Next.js', votes: 40 },
    { id: 'opt-3', text: 'Svelte', votes: 17 },
  ],
};

const votedPoll: PollData = {
  ...unvotedPoll,
  id: 'poll-2',
  myVoteOptionId: 'opt-1',
};

const meta: Meta<typeof PollDisplay> = {
  title: 'Features/Posts/PollDisplay',
  component: PollDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[450px] max-w-full">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PollDisplay>;

export const Unvoted: Story = {
  args: {
    postId: 'post-1',
    poll: unvotedPoll,
    queryKey: ['posts'],
  },
};

export const VotedResults: Story = {
  args: {
    postId: 'post-2',
    poll: votedPoll,
    queryKey: ['posts'],
  },
};
