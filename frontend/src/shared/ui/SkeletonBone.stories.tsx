import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import SkeletonBone from './SkeletonBone';

const meta: Meta<typeof SkeletonBone> = {
  title: 'Shared/UI/SkeletonBone',
  component: SkeletonBone,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof SkeletonBone>;

export const Line: Story = {
  render: () => <SkeletonBone className="w-64 h-4 rounded-md" />,
};

export const AvatarCircle: Story = {
  render: () => <SkeletonBone className="w-12 h-12 rounded-full" />,
};

export const CardPreview: Story = {
  render: () => (
    <div className="w-[320px] p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <SkeletonBone className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          <SkeletonBone className="w-24 h-3.5 rounded" />
          <SkeletonBone className="w-16 h-3 rounded" />
        </div>
      </div>
      <SkeletonBone className="w-full h-32 rounded-xl" />
      <SkeletonBone className="w-4/5 h-3 rounded" />
    </div>
  ),
};
