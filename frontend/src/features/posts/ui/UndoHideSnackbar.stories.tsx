import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import { UndoHideSnackbar } from './UndoHideSnackbar';
import { useHiddenUndoStore } from '../model/useHiddenUndoStore';

function UndoHideWrapper() {
  const showUndo = useHiddenUndoStore((s) => s.showUndo);

  useEffect(() => {
    showUndo('post-101');
  }, [showUndo]);

  return (
    <div className="h-40 flex items-center justify-center">
      <p className="text-xs text-neutral-500">Post was hidden. Snackbar mounted at bottom.</p>
      <UndoHideSnackbar />
    </div>
  );
}

const meta: Meta<typeof UndoHideSnackbar> = {
  title: 'Features/Posts/UndoHideSnackbar',
  component: UndoHideSnackbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof UndoHideSnackbar>;

export const Default: Story = {
  render: () => <UndoHideWrapper />,
};
