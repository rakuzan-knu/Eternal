import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { HeroSection } from './LoginHeroSection';

const meta: Meta<typeof HeroSection> = {
  title: 'Pages/Login/HeroSection',
  component: HeroSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="p-8 bg-[#0b0b0c] flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HeroSection>;

export const Default: Story = {};
