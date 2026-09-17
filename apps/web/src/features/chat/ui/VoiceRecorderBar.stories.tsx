import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import VoiceRecorderBar from './VoiceRecorderBar';

const meta: Meta<typeof VoiceRecorderBar> = {
  title: 'Features/Chat/VoiceRecorderBar',
  component: VoiceRecorderBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[500px] max-w-full p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof VoiceRecorderBar>;

export const Recording: Story = {
  args: {
    recordState: 'recording',
    duration: 14,
    liveAmplitudes: [0.2, 0.4, 0.7, 0.9, 0.6, 0.3, 0.5, 0.8, 0.4],
    previewPayload: null,
    dragOffset: { x: 0, y: 0 },
    onDiscard: () => console.log('Discard voice'),
    onPausePreview: () => console.log('Pause preview'),
    onSend: () => console.log('Send voice'),
  },
};

export const Locked: Story = {
  args: {
    recordState: 'locked',
    duration: 28,
    liveAmplitudes: [0.3, 0.5, 0.8, 0.6, 0.4, 0.9, 0.7, 0.3],
    previewPayload: null,
    dragOffset: { x: 0, y: 0 },
    onDiscard: () => console.log('Discard voice'),
    onPausePreview: () => console.log('Pause preview'),
    onSend: () => console.log('Send voice'),
  },
};
