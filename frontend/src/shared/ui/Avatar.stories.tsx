import type { Meta, StoryObj } from '@storybook/react';
import Avatar from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Shared/UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl'],
    },
    name: {
      control: 'text',
    },
    src: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const DefaultFallback: Story = {
  args: {
    size: 'md',
    name: 'John Doe',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    name: 'Alice Smith',
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
    name: 'Bob Johnson',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    name: 'Charlie Brown',
  },
};
