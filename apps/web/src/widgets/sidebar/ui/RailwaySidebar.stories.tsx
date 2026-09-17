import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import MessengerSidebar from './RailwaySidebar';
import { useUIStore } from '@/shared/model/useUIStore';

function SidebarStoryWrapper(props: { expanded: boolean }) {
  const setSidebarExpanded = useUIStore((s) => s.setSidebarExpanded);

  useEffect(() => {
    setSidebarExpanded(props.expanded);
  }, [props.expanded, setSidebarExpanded]);

  return (
    <div className="relative h-[650px] w-[350px] bg-[#0b0b0c] p-2 overflow-hidden border border-neutral-800 rounded-3xl">
      <MessengerSidebar />
    </div>
  );
}

const meta: Meta<typeof MessengerSidebar> = {
  title: 'Widgets/Sidebar/RailwaySidebar',
  component: MessengerSidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof MessengerSidebar>;

export const CollapsedRail: Story = {
  render: () => <SidebarStoryWrapper expanded={false} />,
};

export const ExpandedSidebar: Story = {
  render: () => <SidebarStoryWrapper expanded={true} />,
};
