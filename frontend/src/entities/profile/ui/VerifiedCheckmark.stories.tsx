import type { Meta, StoryObj } from '@storybook/react';
import VerifiedCheckmark from './VerifiedCheckmark';

const meta: Meta<typeof VerifiedCheckmark> = {
  title: 'Entities/Profile/VerifiedCheckmark',
  component: VerifiedCheckmark,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    isVerified: { control: 'boolean' },
    primaryBadge: {
      control: 'select',
      options: [null, 'DEVELOPER', 'PREMIUM', 'CONTRIBUTOR'],
    },
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof VerifiedCheckmark>;

export const DefaultMedium: Story = {
  args: {
    isVerified: true,
    size: 'md',
  },
};

export const ExtraSmall: Story = {
  args: {
    isVerified: true,
    size: 'xs',
  },
};

export const LargeWithBadge: Story = {
  args: {
    isVerified: true,
    primaryBadge: 'DEVELOPER',
    size: 'lg',
  },
};
