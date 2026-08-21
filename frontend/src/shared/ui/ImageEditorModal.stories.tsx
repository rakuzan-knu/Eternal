import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import ImageEditorModal from './ImageEditorModal';

const dummyFile = new File(['mock image content'], 'sample-photo.png', { type: 'image/png' });

function ImageEditorModalStoryWrapper({ initialSpoiler = false }: { initialSpoiler?: boolean }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition"
      >
        Open Image Editor
      </button>

      {isOpen && (
        <ImageEditorModal
          file={dummyFile}
          initialSpoiler={initialSpoiler}
          onCancel={() => setIsOpen(false)}
          onSave={(editedFile, isSpoiler) => {
            console.log('Saved edited image:', editedFile, 'isSpoiler:', isSpoiler);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

const meta: Meta<typeof ImageEditorModal> = {
  title: 'Shared/UI/ImageEditorModal',
  component: ImageEditorModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ImageEditorModal>;

export const Default: Story = {
  render: () => <ImageEditorModalStoryWrapper />,
};

export const WithSpoilerInitial: Story = {
  render: () => <ImageEditorModalStoryWrapper initialSpoiler={true} />,
};
