import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import Modal from './Modal';

function ModalStoryWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl"
      >
        Open Modal
      </button>

      {isOpen && (
        <Modal onClose={() => setIsOpen(false)}>
          {(requestClose) => (
            <div className="w-[380px] max-w-[90vw] p-6 bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col gap-4 text-center">
              <h3 className="text-xl font-bold text-white">Modal Dialog</h3>
              <p className="text-sm text-neutral-400">
                This is a reusable portal modal with smooth entrance/exit animations and Escape key
                handler.
              </p>
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-medium text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={requestClose}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition"
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

const meta: Meta<typeof Modal> = {
  title: 'Shared/UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  render: () => <ModalStoryWrapper />,
};
