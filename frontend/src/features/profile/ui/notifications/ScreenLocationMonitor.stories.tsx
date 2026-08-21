import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import ScreenLocationMonitor from './ScreenLocationMonitor';
import { NotificationPosition } from '@/shared/model/useNotificationSettingsStore';

function ScreenLocationMonitorStoryWrapper() {
  const [hovered, setHovered] = useState<NotificationPosition | null>(null);

  return (
    <div className="w-[420px] max-w-full p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
      <ScreenLocationMonitor hoveredCorner={hovered} onHoverCorner={setHovered} />
    </div>
  );
}

const meta: Meta<typeof ScreenLocationMonitor> = {
  title: 'Features/Profile/Notifications/ScreenLocationMonitor',
  component: ScreenLocationMonitor,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ScreenLocationMonitor>;

export const Default: Story = {
  render: () => <ScreenLocationMonitorStoryWrapper />,
};
