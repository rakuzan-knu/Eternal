import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import MediaFilesLinksModal from './MediaFilesLinksModal';
import { MessageView } from '../../../entities/chat/model/types';

const sampleMessages: MessageView[] = [
  {
    id: 'm-1',
    conversationId: 'conv-1',
    body: 'Check out the new design system: https://figma.com/design/sample and the repo at https://github.com/react/react',
    createdAt: '2026-08-20T10:00:00Z',
    attachments: [
      {
        id: 'att-1',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
        fileType: 'IMAGE',
        fileName: 'architecture_diagram.png',
        fileSize: 2048576,
      },
    ],
    sender: { id: 'u1', username: 'elena', displayName: 'Elena Rostova', avatar: null },
  },
  {
    id: 'm-2',
    conversationId: 'conv-1',
    body: 'Here is the project specification PDF document',
    createdAt: '2026-08-20T11:00:00Z',
    attachments: [
      {
        id: 'att-2',
        url: 'https://example.com/spec.pdf',
        fileType: 'DOCUMENT',
        fileName: 'social_network_specs_v2.pdf',
        fileSize: 4520000,
      },
    ],
    sender: { id: 'u2', username: 'marcus', displayName: 'Marcus Vance', avatar: null },
  },
] as unknown as MessageView[];

function MediaFilesLinksModalStoryWrapper({
  initialTab = 'media',
}: {
  initialTab?: 'media' | 'files' | 'links';
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
      >
        Open Shared Media ({initialTab})
      </button>

      {isOpen && (
        <MediaFilesLinksModal
          messages={sampleMessages}
          initialTab={initialTab}
          onClose={() => setIsOpen(false)}
          onJumpToMessage={(id) => console.log('Jump to message:', id)}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof MediaFilesLinksModal> = {
  title: 'Features/Chat/MediaFilesLinksModal',
  component: MediaFilesLinksModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof MediaFilesLinksModal>;

export const MediaTab: Story = {
  render: () => <MediaFilesLinksModalStoryWrapper initialTab="media" />,
};

export const FilesTab: Story = {
  render: () => <MediaFilesLinksModalStoryWrapper initialTab="files" />,
};

export const LinksTab: Story = {
  render: () => <MediaFilesLinksModalStoryWrapper initialTab="links" />,
};
