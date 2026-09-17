import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { CheckoutButton } from './CheckoutButton';

const meta: Meta<typeof CheckoutButton> = {
  title: 'Features/Checkout/CheckoutButton',
  component: CheckoutButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    cartId: { control: 'text' },
    onSuccess: { action: 'success' },
    onError: { action: 'error' },
  },
  decorators: [
    (Story) => (
      <div className="p-4 bg-neutral-900 rounded-2xl border border-neutral-800 flex justify-center [&_button]:px-6 [&_button]:py-2.5 [&_button]:bg-purple-600 [&_button]:hover:bg-purple-500 [&_button]:text-white [&_button]:font-semibold [&_button]:rounded-xl [&_button]:transition">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CheckoutButton>;

export const Default: Story = {
  args: {
    cartId: 'cart-12345',
    onSuccess: (id) => console.log('Order created:', id),
    onError: (err) => console.error('Order error:', err),
  },
};
