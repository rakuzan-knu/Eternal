import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import MessageAttachments from './MessageAttachments';
import { AttachmentView } from '../../../entities/chat/model/types';

const sampleAttachments: AttachmentView[] = [
  {
    id: 'att-1',
    type: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    fileName: 'landscape.jpg',
    mimeType: 'image/jpeg',
    size: 2048000,
    width: 800,
    height: 600,
    duration: null,
    thumbnailUrl: null,
  },
  {
    id: 'att-2',
    type: 'FILE',
    url: 'https://example.com/spec.pdf',
    fileName: 'API_Specification_v2.pdf',
    size: 4500000,
    mimeType: 'application/pdf',
    width: null,
    height: null,
    duration: null,
    thumbnailUrl: null,
  },
];

const meta: Meta<typeof MessageAttachments> = {
  title: 'Features/Chat/MessageAttachments',
  component: MessageAttachments,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[400px] max-w-full p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MessageAttachments>;

export const Default: Story = {
  args: {
    attachments: sampleAttachments,
  },
};
