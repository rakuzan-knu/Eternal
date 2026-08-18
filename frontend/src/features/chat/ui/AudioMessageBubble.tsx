import React, { useMemo } from 'react';
import { Play, Pause } from 'lucide-react';
import { AttachmentView } from '../../../entities/chat/model/types';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';

interface AudioMessageBubbleProps {
  attachment: AttachmentView & { waveform?: number[] };
  isOwnMessage?: boolean;
  senderName?: string;
  sentAt?: string;
  conversationId?: string;
}

function formatDuration(sec: number): string {
  if (isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioMessageBubble({
  attachment,
  senderName = 'Voice Message',
  sentAt,
  conversationId,
}: AudioMessageBubbleProps) {
  const {
    activeMediaId,
    isPlaying: storeIsPlaying,
    currentTime: storeCurrentTime,
    duration: storeDuration,
    playbackRate: storePlaybackRate,
    setActiveMedia,
    togglePlay,
    seek,
    setPlaybackRate,
  } = useActiveMediaPlaybackStore();

  const isCurrentActive = activeMediaId === attachment.id;
  const isPlaying = isCurrentActive && storeIsPlaying;
  const totalDuration =
    (isCurrentActive && storeDuration > 0 ? storeDuration : attachment.duration) || 0;
  const currentTime = isCurrentActive ? storeCurrentTime : 0;

  // Parse or default 32-bar waveform
  const waveform = useMemo(() => {
    if (
      attachment.waveform &&
      Array.isArray(attachment.waveform) &&
      attachment.waveform.length > 0
    ) {
      return attachment.waveform;
    }
    const hash = attachment.id || 'voice-note';
    const bars: number[] = [];
    for (let i = 0; i < 32; i++) {
      const code = (hash.charCodeAt(i % hash.length) * (i + 13)) % 100;
      bars.push(Math.max(0.12, (code / 100) * 0.9));
    }
    return bars;
  }, [attachment]);

  // Handle Play/Pause Click
  const handleTogglePlay = () => {
    if (isCurrentActive) {
      togglePlay();
    } else {
      setActiveMedia({
        id: attachment.id,
        mediaType: 'voice',
        url: attachment.url,
        senderName,
        sentAt,
        conversationId,
        duration: totalDuration,
      });
    }
  };

  // Handle Seek on Bar Click
  const handleSeek = (index: number) => {
    const seekFraction = index / waveform.length;
    const targetTime = seekFraction * totalDuration;

    if (isCurrentActive) {
      seek(targetTime);
    } else {
      setActiveMedia({
        id: attachment.id,
        mediaType: 'voice',
        url: attachment.url,
        senderName,
        sentAt,
        conversationId,
        duration: totalDuration,
      });
      setTimeout(() => seek(targetTime), 10);
    }
  };

  // Cycle Speed
  const handleCycleSpeed = () => {
    const nextSpeed =
      storePlaybackRate === 1
        ? 1.5
        : storePlaybackRate === 1.5
          ? 2
          : storePlaybackRate === 2
            ? 0.5
            : 1;
    setPlaybackRate(nextSpeed);
  };

  const progressFraction = totalDuration > 0 ? currentTime / totalDuration : 0;

  return (
    <div
      data-testid="audio-message-bubble"
      className="flex items-center gap-3 p-2 min-w-[240px] sm:min-w-[280px] max-w-[340px] select-none"
    >
      {/* Play / Pause Circular Button */}
      <button
        type="button"
        onClick={handleTogglePlay}
        className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all active:scale-95 cursor-pointer"
        title={isPlaying ? 'Pause' : 'Play voice message'}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      {/* Waveform & Duration */}
      <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
        {/* 32-Bar Waveform */}
        <div className="flex items-center gap-[3px] h-6 cursor-pointer group py-0.5">
          {waveform.map((bar, idx) => {
            const isPlayed = idx / waveform.length <= progressFraction;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSeek(idx)}
                className="flex-1 flex items-center h-full py-0.5 group-hover:opacity-90 transition-opacity cursor-pointer border-0 bg-transparent p-0"
                title={`Seek to ${formatDuration((idx / waveform.length) * totalDuration)}`}
              >
                <span
                  className={`w-full rounded-full transition-colors ${
                    isPlayed
                      ? 'bg-purple-300 shadow-[0_0_6px_rgba(192,132,252,0.6)]'
                      : 'bg-white/20 group-hover:bg-white/30'
                  }`}
                  style={{
                    height: `${Math.max(4, bar * 22)}px`,
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Timers and Speed Toggle */}
        <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono tracking-tight">
          <span>{formatDuration(isPlaying ? currentTime : totalDuration)}</span>

          <button
            type="button"
            onClick={handleCycleSpeed}
            className="px-1.5 py-0.5 rounded-full bg-white/10 hover:bg-white/15 text-purple-300 text-[10px] font-bold transition-colors cursor-pointer"
            title="Toggle playback speed"
          >
            {storePlaybackRate}x
          </button>
        </div>
      </div>
    </div>
  );
}
