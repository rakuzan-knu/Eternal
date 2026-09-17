import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import TextWithSpoilers from './TextWithSpoilers';

const meta: Meta<typeof TextWithSpoilers> = {
  title: 'Shared/UI/TextWithSpoilers',
  component: TextWithSpoilers,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    text: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div className="w-[420px] max-w-full p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-gray-200 text-sm leading-relaxed">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TextWithSpoilers>;

export const SingleSpoiler: Story = {
  args: {
    text: 'In the season finale, the main character is actually ||the undercover detective|| who solved it.',
  },
};

export const MultipleSpoilers: Story = {
  args: {
    text: 'Key movie reveals: 1) ||Neo takes the red pill||, 2) ||Darth Vader is Luke’s father||, 3) ||Bruce Willis was a ghost||.',
  },
};
