import type { Meta, StoryObj } from '@storybook/react';
import { PremiumTierBadge } from './PremiumTierBadge';

const meta: Meta<typeof PremiumTierBadge> = {
  title: 'Entities/Profile/PremiumTierBadge',
  component: PremiumTierBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    level: {
      control: { type: 'range', min: 0, max: 7, step: 1 },
    },
    size: { control: { type: 'range', min: 24, max: 128, step: 4 } },
  },
};

export default meta;
type Story = StoryObj<typeof PremiumTierBadge>;

export const BronzeLevel1: Story = {
  args: {
    level: 1,
    size: 64,
  },
};

export const SilverLevel2: Story = {
  args: {
    level: 2,
    size: 64,
  },
};

export const GoldLevel3: Story = {
  args: {
    level: 3,
    size: 64,
  },
};

export const PlatinumLevel4: Story = {
  args: {
    level: 4,
    size: 64,
  },
};

export const DiamondLevel5: Story = {
  args: {
    level: 5,
    size: 64,
  },
};

export const RubyLevel6: Story = {
  args: {
    level: 6,
    size: 64,
  },
};

export const OpalLevel7: Story = {
  args: {
    level: 7,
    size: 64,
  },
};
