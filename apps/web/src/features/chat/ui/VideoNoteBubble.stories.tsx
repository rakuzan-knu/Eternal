import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { VideoNoteBubble } from './VideoNoteBubble';
import { AttachmentView } from '../../../entities/chat/model/types';

const videoAttachment: AttachmentView = {
  id: 'att-vid-1',
  type: 'VIDEO',
  url: 'https://example.com/videonote.mp4',
  duration: 45,
  size: 5000000,
  fileName: 'videonote.mp4',
  mimeType: 'video/mp4',
  width: 400,
  height: 400,
  thumbnailUrl: null,
};

const meta: Meta<typeof VideoNoteBubble> = {
  title: 'Features/Chat/VideoNoteBubble',
  component: VideoNoteBubble,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[300px] p-6 bg-neutral-900 border border-neutral-800 rounded-3xl flex justify-center">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof VideoNoteBubble>;

export const Default: Story = {
  args: {
    attachment: videoAttachment,
    senderName: 'Elena Rostova',
    sentAt: '14:32',
    conversationId: 'conv-1',
  },
};
