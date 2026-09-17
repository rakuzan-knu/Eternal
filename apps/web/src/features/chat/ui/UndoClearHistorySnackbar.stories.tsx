import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import { UndoClearHistorySnackbar } from './UndoClearHistorySnackbar';
import { useClearHistoryUndoStore } from '../model/useClearHistoryUndoStore';

function UndoClearWrapper() {
  const startUndo = useClearHistoryUndoStore((s) => s.startUndo);

  useEffect(() => {
    startUndo({
      conversationId: 'conv-1',
      conversationTitle: 'Frontend Core',
      forAll: true,
      rollback: () => {},
      execute: () => {},
    });
  }, [startUndo]);

  return (
    <div className="h-40 flex items-center justify-center">
      <p className="text-xs text-neutral-500">History was cleared. Undo snackbar mounted.</p>
      <UndoClearHistorySnackbar />
    </div>
  );
}

const meta: Meta<typeof UndoClearHistorySnackbar> = {
  title: 'Features/Chat/UndoClearHistorySnackbar',
  component: UndoClearHistorySnackbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof UndoClearHistorySnackbar>;

export const Default: Story = {
  render: () => <UndoClearWrapper />,
};
