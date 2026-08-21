import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { AudioMessageBubble } from './AudioMessageBubble';
import { AttachmentView } from '@/entities/chat/model/types';

const defaultAttachment: AttachmentView = {
  id: 'voice-1',
  type: 'AUDIO',
  url: 'https://example.com/audio.mp3',
  duration: 38,
  fileName: 'voice.mp3',
  mimeType: 'audio/mpeg',
  size: 1024 * 50,
  width: null,
  height: null,
  thumbnailUrl: null,
};

const meta: Meta<typeof AudioMessageBubble> = {
  title: 'Features/Chat/AudioMessageBubble',
  component: AudioMessageBubble,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AudioMessageBubble>;

export const Default: Story = {
  args: {
    attachment: defaultAttachment,
    senderName: 'Elena Rostova',
    sentAt: '14:25',
  },
};

export const CustomWaveform: Story = {
  args: {
    attachment: {
      ...defaultAttachment,
      id: 'voice-2',
      url: 'https://example.com/audio2.mp3',
      duration: 64,
      waveform: [
        0.2, 0.4, 0.7, 0.9, 0.5, 0.8, 0.3, 0.6, 0.9, 0.4, 0.2, 0.8, 1.0, 0.7, 0.5, 0.3, 0.6, 0.8,
        0.4, 0.2, 0.7, 0.9, 0.6, 0.4, 0.3, 0.5, 0.8, 0.7, 0.4, 0.3, 0.2, 0.1,
      ],
    },
    senderName: 'Marcus Vance',
    sentAt: '15:10',
  },
};
