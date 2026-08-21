import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import MediaLightbox from './MediaLightbox';
import { MediaItem } from '../model/chatMediaTypes';
import { MessageView } from '../../../entities/chat/model/types';

const sampleMessages: MessageView[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    body: 'Abstract artwork',
    createdAt: '2026-08-21T10:00:00Z',
    sender: { id: 'u1', username: 'elena', displayName: 'Elena Rostova', avatar: null },
  } as unknown as MessageView,
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    body: 'Gradient flow',
    createdAt: '2026-08-21T10:05:00Z',
    sender: { id: 'u2', username: 'marcus', displayName: 'Marcus Vance', avatar: null },
  } as unknown as MessageView,
];

const sampleMediaItems: MediaItem[] = [
  {
    message: sampleMessages[0],
    attachment: {
      id: 'att-1',
      type: 'IMAGE',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      fileName: 'abstract_art.jpg',
      mimeType: 'image/jpeg',
      size: 1024000,
      width: 1200,
      height: 800,
      duration: null,
      thumbnailUrl: null,
    },
  },
  {
    message: sampleMessages[1],
    attachment: {
      id: 'att-2',
      type: 'IMAGE',
      url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
      fileName: 'gradient_flow.jpg',
      mimeType: 'image/jpeg',
      size: 1024000,
      width: 1200,
      height: 800,
      duration: null,
      thumbnailUrl: null,
    },
  },
];

function MediaLightboxStoryWrapper() {
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Open Lightbox
      </button>

      {isOpen && (
        <MediaLightbox
          items={sampleMediaItems}
          index={index}
          onIndexChange={setIndex}
          onClose={() => setIsOpen(false)}
          onJumpToMessage={(msgId) => console.log('Jump to message:', msgId)}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof MediaLightbox> = {
  title: 'Features/Chat/MediaLightbox',
  component: MediaLightbox,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof MediaLightbox>;

export const Default: Story = {
  render: () => <MediaLightboxStoryWrapper />,
};
