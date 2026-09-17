import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import NearbyRecommendationsToggle from './NearbyRecommendationsToggle';

const meta: Meta<typeof NearbyRecommendationsToggle> = {
  title: 'Features/Profile/Privacy/NearbyRecommendationsToggle',
  component: NearbyRecommendationsToggle,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[450px] max-w-full p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NearbyRecommendationsToggle>;

export const Default: Story = {};
