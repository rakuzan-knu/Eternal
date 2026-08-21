import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import ReplyPreview from './ReplyPreview';
import { MessageView } from '@/entities/chat/model/types';

const mockReplyMessage = {
  id: 'msg-reply-target',
  conversationId: 'conv-1',
  messageType: 'TEXT',
  body: 'The real-time audio waveforms look absolutely stunning!',
  createdAt: '2026-08-21T12:00:00Z',
  editedAt: null,
  replyTo: null,
  sender: {
    id: 'user-2',
    username: 'elena',
    displayName: 'Elena Rostova',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  },
  attachments: [],
  reactions: [],
} as unknown as MessageView;

const meta: Meta<typeof ReplyPreview> = {
  title: 'Features/Chat/ReplyPreview',
  component: ReplyPreview,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[420px] max-w-full">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ReplyPreview>;

export const TextReply: Story = {
  args: {
    message: mockReplyMessage,
    onCancel: () => console.log('Cancel reply'),
  },
};

export const AttachmentReply: Story = {
  args: {
    message: {
      ...mockReplyMessage,
      body: '',
      attachments: [
        {
          id: 'att-1',
          type: 'IMAGE',
          url: 'https://example.com/img.jpg',
          fileName: 'image.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 200,
          width: 800,
          height: 600,
          duration: null,
          thumbnailUrl: null,
        },
      ],
    },
    onCancel: () => console.log('Cancel reply'),
  },
};
