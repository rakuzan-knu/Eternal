import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import { useUIStore } from '@/shared/model/useUIStore';

function FloatingSidebarWrapper(props: { expanded: boolean }) {
  const setSidebarExpanded = useUIStore((s) => s.setSidebarExpanded);

  useEffect(() => {
    setSidebarExpanded(props.expanded);
  }, [props.expanded, setSidebarExpanded]);

  return (
    <div className="relative h-[650px] w-[350px] bg-[#0b0b0c] p-2 overflow-hidden border border-neutral-800 rounded-3xl">
      <Sidebar />
    </div>
  );
}

const meta: Meta<typeof Sidebar> = {
  title: 'Widgets/Sidebar/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const CollapsedFloating: Story = {
  render: () => <FloatingSidebarWrapper expanded={false} />,
};

export const ExpandedFloating: Story = {
  render: () => <FloatingSidebarWrapper expanded={true} />,
};
