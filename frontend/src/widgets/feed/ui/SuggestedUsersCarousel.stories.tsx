import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SuggestedUsersCarousel } from './SuggestedUsersCarousel';

const meta: Meta<typeof SuggestedUsersCarousel> = {
  title: 'Widgets/Feed/SuggestedUsersCarousel',
  component: SuggestedUsersCarousel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    title: { control: 'text' },
    limit: { control: 'number' },
    onEmpty: { action: 'empty' },
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
type Story = StoryObj<typeof SuggestedUsersCarousel>;

export const Default: Story = {
  args: {
    title: 'Suggested for you',
    limit: 8,
  },
};
