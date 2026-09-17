import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { MediaAttachment } from './MessageAttachmentPreviews';
import { AttachmentView } from '../../../entities/chat/model/types';

const imageAttachment: AttachmentView = {
  id: 'att-1',
  type: 'IMAGE',
  url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
  fileName: 'photo.jpg',
  size: 1024000,
  mimeType: 'image/jpeg',
  width: 600,
  height: 400,
  duration: null,
  thumbnailUrl: null,
  isSpoiler: false,
};

const spoilerAttachment: AttachmentView = {
  ...imageAttachment,
  id: 'att-2',
  isSpoiler: true,
  fileName: 'spoiler_leak.jpg',
};

const meta: Meta<typeof MediaAttachment> = {
  title: 'Features/Chat/MessageAttachmentPreviews',
  component: MediaAttachment,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[360px] max-w-full p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MediaAttachment>;

export const StandardImage: Story = {
  args: {
    attachment: imageAttachment,
  },
};

export const SpoilerImage: Story = {
  args: {
    attachment: spoilerAttachment,
  },
};
