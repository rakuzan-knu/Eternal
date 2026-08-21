import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import GlobalMediaPlaybackBar from './GlobalMediaPlaybackBar';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';

function GlobalMediaPlaybackBarStoryWrapper({ isPlaying = true }: { isPlaying?: boolean }) {
  useEffect(() => {
    useActiveMediaPlaybackStore.setState({
      activeMediaId: 'audio-msg-1',
      url: 'https://example.com/audio.mp3',
      mediaType: 'voice',
      senderName: 'Elena Rostova',
      sentAt: 'Today at 14:32',
      duration: 125,
      currentTime: 42,
      isPlaying,
      isMuted: false,
      volume: 0.8,
      playbackRate: 1.0,
      playlist: [],
    });

    return () => {
      useActiveMediaPlaybackStore.getState().stopAll();
    };
  }, [isPlaying]);

  return (
    <div className="w-[600px] max-w-full relative h-[140px] flex items-end">
      <GlobalMediaPlaybackBar />
    </div>
  );
}

const meta: Meta<typeof GlobalMediaPlaybackBar> = {
  title: 'Features/Chat/GlobalMediaPlaybackBar',
  component: GlobalMediaPlaybackBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof GlobalMediaPlaybackBar>;

export const Playing: Story = {
  render: () => <GlobalMediaPlaybackBarStoryWrapper isPlaying={true} />,
};

export const Paused: Story = {
  render: () => <GlobalMediaPlaybackBarStoryWrapper isPlaying={false} />,
};
