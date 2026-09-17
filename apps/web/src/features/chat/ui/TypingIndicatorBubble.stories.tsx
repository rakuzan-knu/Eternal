import type { Meta, StoryObj } from '@storybook/react';
import TypingIndicatorBubble from './TypingIndicatorBubble';
import { UserSnapshot } from '@/entities/chat/model/types';

const mockUsers: UserSnapshot[] = [
  {
    id: '1',
    username: 'alex',
    displayName: 'Alex Rivers',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  },
  {
    id: '2',
    username: 'elena',
    displayName: 'Elena Rostova',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  },
  {
    id: '3',
    username: 'marcus',
    displayName: 'Marcus Vance',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
  },
];

const meta: Meta<typeof TypingIndicatorBubble> = {
  title: 'Shared/UI/TypingIndicatorBubble',
  component: TypingIndicatorBubble,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof TypingIndicatorBubble>;

export const SingleTypist: Story = {
  args: {
    typists: [mockUsers[0]],
  },
};

export const TwoTypists: Story = {
  args: {
    typists: mockUsers.slice(0, 2),
  },
};

export const MultipleTypists: Story = {
  args: {
    typists: mockUsers,
  },
};
