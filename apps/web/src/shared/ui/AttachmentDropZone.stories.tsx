import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import AttachmentDropZone from './AttachmentDropZone';

const meta: Meta<typeof AttachmentDropZone> = {
  title: 'Shared/UI/AttachmentDropZone',
  component: AttachmentDropZone,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[500px] h-[350px] p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AttachmentDropZone>;

export const Default: Story = {
  args: {
    onFilesDropped: (files) => console.log('Files dropped:', files),
    children: (
      <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-700 rounded-xl text-center text-neutral-400">
        <p className="font-medium text-white mb-1">Drag and drop files here</p>
        <p className="text-xs text-neutral-500">
          Supports images, videos, and documents up to 50MB
        </p>
      </div>
    ),
  },
};
