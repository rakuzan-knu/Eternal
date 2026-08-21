import type { Meta, StoryObj } from '@storybook/react';
import { AuthFooter } from './AuthFooter';

const meta: Meta<typeof AuthFooter> = {
  title: 'Shared/UI/AuthFooter',
  component: AuthFooter,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof AuthFooter>;

export const Default: Story = {};
