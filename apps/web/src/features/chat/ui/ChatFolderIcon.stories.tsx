import type { Meta, StoryObj } from '@storybook/react';
import ChatFolderIcon from './ChatFolderIcon';

const meta: Meta<typeof ChatFolderIcon> = {
  title: 'Features/Chat/ChatFolderIcon',
  component: ChatFolderIcon,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    iconKey: {
      control: 'select',
      options: ['folder', 'star', 'work', 'personal', 'crypto', 'archive'],
    },
    emoji: { control: 'text' },
    color: { control: 'color' },
    size: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof ChatFolderIcon>;

export const DefaultFolder: Story = {
  args: {
    iconKey: 'folder',
    color: '#a855f7',
    size: 20,
  },
};

export const StarIcon: Story = {
  args: {
    iconKey: 'star',
    color: '#eab308',
    size: 24,
  },
};

export const EmojiIcon: Story = {
  args: {
    iconKey: null,
    emoji: '🔥',
    color: '#ef4444',
    size: 20,
  },
};
