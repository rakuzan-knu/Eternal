import type { Meta, StoryObj } from '@storybook/react';
import { AddFileButton } from './AddFileButton';

const meta: Meta<typeof AddFileButton> = {
  title: 'Features/Posts/AddFileButton',
  component: AddFileButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    multiple: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onFilesSelect: { action: 'filesSelected' },
  },
};

export default meta;
type Story = StoryObj<typeof AddFileButton>;

export const Default: Story = {
  args: {
    multiple: true,
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    multiple: true,
    disabled: true,
  },
};
