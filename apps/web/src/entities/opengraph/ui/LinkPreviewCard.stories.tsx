import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { LinkPreviewCard } from './LinkPreviewCard';

const meta: Meta<typeof LinkPreviewCard> = {
  title: 'Shared/UI/LinkPreviewCard',
  component: LinkPreviewCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    url: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div className="w-[480px] max-w-full">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LinkPreviewCard>;

export const Default: Story = {
  args: {
    url: 'https://github.com/facebook/react',
  },
};
