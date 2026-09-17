import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { CheckCheck } from 'lucide-react';
import { AudioMessageBubble } from './AudioMessageBubble';
import { AttachmentView } from '@/entities/chat/model/types';

const defaultAttachment: AttachmentView = {
  id: 'voice-1',
  type: 'AUDIO',
  url: 'https://example.com/audio.mp3',
  duration: 26,
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
      <div className="p-4 rounded-3xl bg-[#12131b]/90 border border-white/10 shadow-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AudioMessageBubble>;

export const IncomingVoiceMessage: Story = {
  args: {
    attachment: defaultAttachment,
    isOwnMessage: false,
    senderName: 'Michael',
    sentAt: '21:35',
  },
};

export const OwnVoiceMessageWithStatus: Story = {
  args: {
    attachment: {
      ...defaultAttachment,
      id: 'voice-own',
      duration: 26,
    },
    isOwnMessage: true,
    senderName: 'You',
    sentAt: '18:11',
    statusIcon: <CheckCheck size={13} className="text-purple-400 stroke-[2.2]" />,
  },
};

export const CustomWaveform: Story = {
  args: {
    attachment: {
      ...defaultAttachment,
      id: 'voice-custom',
      duration: 162,
      waveform: [
        0.2, 0.4, 0.7, 0.9, 0.5, 0.8, 0.3, 0.6, 0.9, 0.4, 0.2, 0.8, 1.0, 0.7, 0.5, 0.3, 0.6, 0.8,
        0.4, 0.2, 0.7, 0.9, 0.6, 0.4, 0.3, 0.5, 0.8, 0.7, 0.4, 0.3, 0.2, 0.1, 0.5, 0.7, 0.8, 0.9,
      ],
    },
    isOwnMessage: true,
    senderName: 'You',
    sentAt: '13:12',
    statusIcon: <CheckCheck size={13} className="text-purple-400 stroke-[2.2]" />,
  },
};

export const ShortTwoSecondAudio: Story = {
  args: {
    attachment: {
      ...defaultAttachment,
      id: 'voice-short',
      duration: 2,
    },
    isOwnMessage: false,
    senderName: 'Alice',
    sentAt: '17:55',
  },
};
