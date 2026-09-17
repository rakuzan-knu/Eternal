import type { Meta, StoryObj } from '@storybook/react';
import { ErrorFallback } from './ErrorFallback';

const meta: Meta<typeof ErrorFallback> = {
  title: 'Shared/UI/ErrorFallback',
  component: ErrorFallback,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    error: { control: 'object' },
    componentStack: { control: 'text' },
    resetError: { action: 'resetError' },
  },
};

export default meta;
type Story = StoryObj<typeof ErrorFallback>;

export const Default: Story = {
  args: {
    error: new Error('Cannot read properties of undefined (reading "user")'),
    componentStack:
      'at ComponentA (src/widgets/Sidebar.tsx:42:15)\n    at App (src/app/App.tsx:12:3)',
    resetError: () => console.log('Resetting error boundary'),
  },
};
