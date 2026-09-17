import type { Meta, StoryObj } from '@storybook/react';
import ContributorTierBadge from './ContributorTierBadge';

const meta: Meta<typeof ContributorTierBadge> = {
  title: 'Entities/Profile/ContributorTierBadge',
  component: ContributorTierBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    level: {
      control: { type: 'range', min: 1, max: 5, step: 1 },
    },
    size: { control: { type: 'range', min: 24, max: 128, step: 4 } },
  },
};

export default meta;
type Story = StoryObj<typeof ContributorTierBadge>;

export const Tier1: Story = {
  args: {
    level: 1,
    size: 64,
  },
};

export const Tier2: Story = {
  args: {
    level: 2,
    size: 64,
  },
};

export const Tier3: Story = {
  args: {
    level: 3,
    size: 64,
  },
};

export const Tier4: Story = {
  args: {
    level: 4,
    size: 64,
  },
};

export const Tier5: Story = {
  args: {
    level: 5,
    size: 64,
  },
};
