import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import SlideOverPanel from './SlideOverPanel';
import { SettingsPanelHost } from './SettingsPanelHost';

function SlideOverStory() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <SettingsPanelHost>
      <div className="relative w-[400px] h-[500px] bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden p-6">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl font-medium"
        >
          Open Panel
        </button>

        {isOpen && (
          <SlideOverPanel title="Privacy Settings" onClose={() => setIsOpen(false)}>
            <div className="flex flex-col gap-3 py-2">
              <p className="text-sm text-neutral-400">
                Configure who can see your profile information and interact with your account.
              </p>
              <div className="p-3 bg-white/5 rounded-xl text-xs text-neutral-300">
                All changes take effect immediately across all sessions.
              </div>
            </div>
          </SlideOverPanel>
        )}
      </div>
    </SettingsPanelHost>
  );
}

const meta: Meta<typeof SlideOverPanel> = {
  title: 'Shared/UI/SlideOverPanel',
  component: SlideOverPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof SlideOverPanel>;

export const Default: Story = {
  render: () => <SlideOverStory />,
};
