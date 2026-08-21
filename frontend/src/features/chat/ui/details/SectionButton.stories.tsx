import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SectionButton } from './SectionButton';
import { ShieldCheck, Trash2 } from 'lucide-react';

const meta: Meta<typeof SectionButton> = {
  title: 'Features/Chat/Details/SectionButton',
  component: SectionButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[300px] bg-[#181926] border border-white/10 rounded-2xl p-2">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SectionButton>;

export const Standard: Story = {
  args: {
    icon: <ShieldCheck size={18} className="text-blue-400" />,
    label: 'Group Permissions',
    sublabel: 'Custom access rules',
    danger: false,
    onClick: () => console.log('Button clicked'),
  },
};

export const Danger: Story = {
  args: {
    icon: <Trash2 size={18} />,
    label: 'Leave and Delete',
    sublabel: 'Cannot be undone',
    danger: true,
    onClick: () => console.log('Danger clicked'),
  },
};
