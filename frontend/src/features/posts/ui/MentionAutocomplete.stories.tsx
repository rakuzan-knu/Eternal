import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { MentionAutocomplete } from './MentionAutocomplete';

function MentionAutocompleteStoryWrapper({ initialText = 'Hello @' }: { initialText?: string }) {
  const [text, setText] = useState(initialText);
  const [cursorPos, setCursorPos] = useState(initialText.length);

  return (
    <div className="w-[450px] max-w-full p-8 bg-neutral-900 border border-neutral-800 rounded-2xl relative">
      <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase">
        Try typing @username or #hashtag
      </label>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setCursorPos(e.target.selectionStart || 0);
        }}
        onSelect={(e) => {
          const target = e.target as HTMLTextAreaElement;
          setCursorPos(target.selectionStart || 0);
        }}
        rows={3}
        className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:outline-none focus:border-purple-500"
      />
      <MentionAutocomplete
        text={text}
        cursorPos={cursorPos}
        onSelect={(newText, newPos) => {
          setText(newText);
          setCursorPos(newPos);
        }}
      />
    </div>
  );
}

const meta: Meta<typeof MentionAutocomplete> = {
  title: 'Features/Posts/MentionAutocomplete',
  component: MentionAutocomplete,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof MentionAutocomplete>;

export const UserMention: Story = {
  render: () => <MentionAutocompleteStoryWrapper initialText="Welcome to the team @" />,
};

export const HashtagSuggestion: Story = {
  render: () => <MentionAutocompleteStoryWrapper initialText="Check out our new #" />,
};
