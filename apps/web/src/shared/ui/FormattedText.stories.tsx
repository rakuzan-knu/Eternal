import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { FormattedText } from './FormattedText';

const meta: Meta<typeof FormattedText> = {
  title: 'Shared/UI/FormattedText',
  component: FormattedText,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    text: { control: 'text' },
    className: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div className="w-[450px] max-w-full p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-gray-200">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FormattedText>;

export const MentionsAndTags: Story = {
  args: {
    text: 'Hello @john_doe, check out the new design system from @sarah! It is super fast and clean. #ui #ux #webdev',
  },
};

export const WithPunctuation: Story = {
  args: {
    text: 'Have you seen @alice, @bob, and @charlie? Let us meet at #conference! Or maybe #summit?',
  },
};

export const MultilineFormatted: Story = {
  args: {
    text: 'Line 1: Discussing #architecture with @team_lead.\nLine 2: Reviewing PRs.\nLine 3: Release ready! #deploy #v2',
  },
};
