import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { AllCaughtUpBanner } from './AllCaughtUpBanner';

const meta: Meta<typeof AllCaughtUpBanner> = {
  title: 'Widgets/Feed/AllCaughtUpBanner',
  component: AllCaughtUpBanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    showCarousel: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div className="w-[600px] max-w-full p-4 bg-[#0b0b0c]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AllCaughtUpBanner>;

export const BannerWithCarousel: Story = {
  args: {
    showCarousel: true,
  },
};

export const BannerOnly: Story = {
  args: {
    showCarousel: false,
  },
};
