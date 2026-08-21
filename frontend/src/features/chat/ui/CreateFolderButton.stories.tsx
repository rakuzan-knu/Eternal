import type { Meta, StoryObj } from '@storybook/react';
import CreateFolderButton from './CreateFolderButton';

const meta: Meta<typeof CreateFolderButton> = {
  title: 'Features/Chat/CreateFolderButton',
  component: CreateFolderButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof CreateFolderButton>;

export const Default: Story = {
  args: {
    onCreate: () => console.log('Create folder button clicked'),
  },
};
