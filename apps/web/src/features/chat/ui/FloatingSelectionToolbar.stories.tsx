import type { Meta, StoryObj } from '@storybook/react';
import FloatingSelectionToolbar from './FloatingSelectionToolbar';

const meta: Meta<typeof FloatingSelectionToolbar> = {
  title: 'Chat/UI/FloatingSelectionToolbar',
  component: FloatingSelectionToolbar,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof FloatingSelectionToolbar>;

export const Default: Story = {
  args: {
    position: { top: 150, left: 300 },
    onFormat: (type, url) => console.log('Format action:', type, url),
    onClose: () => console.log('Toolbar closed'),
  },
};
