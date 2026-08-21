import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ExpandableText } from './ExpandableText';

const meta: Meta<typeof ExpandableText> = {
  title: 'Shared/UI/ExpandableText',
  component: ExpandableText,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    text: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div className="w-[480px] max-w-full p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ExpandableText>;

export const ShortText: Story = {
  args: {
    text: 'This is a short post with a mention to @alex and a hashtag #awesome!',
  },
};

export const LongTextExpandable: Story = {
  args: {
    text: 'Eternal social network combines state-of-the-art WebRTC real-time voice, video messages, and media streaming with rich social interactions. When posts exceed 280 characters in length, they gracefully truncate with an interactive expansion toggle allowing users to view full text on demand. You can also mention friends like @elena or discuss topics with #cybersecurity #design and #engineering!',
  },
};
