import React, { useMemo, useState, useCallback } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { AttachmentView } from '../../../entities/chat/model/types';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';
import { samplePeaks, formatVoiceDuration, formatVoiceTime } from '../lib/waveformUtils';
import { WaveformRenderer } from './WaveformRenderer';

export interface AudioMessageBubbleProps {
  attachment: (AttachmentView | (Partial<AttachmentView> & { id: string; url: string })) & {
    waveform?: number[];
  };
  isOwnMessage?: boolean;
  senderName?: string;
  sentAt?: string;
  conversationId?: string;
  statusIcon?: React.ReactNode;
}

export function AudioMessageBubble({
  attachment,
  isOwnMessage = false,
  senderName = 'Voice Message',
  sentAt,
  conversationId,
  statusIcon,
}: AudioMessageBubbleProps) {
  const {
    activeMediaId,
    isPlaying: storeIsPlaying,
    isLoading: storeIsLoading,
    currentTime: storeCurrentTime,
    duration: storeDuration,
    playbackRate: storePlaybackRate,
    setActiveMedia,
    togglePlay,
    seek,
    setPlaybackRate,
  } = useActiveMediaPlaybackStore();

  const [hoverFraction, setHoverFraction] = useState<number | null>(null);

  const isCurrentActive = activeMediaId === attachment.id;
  const isPlaying = isCurrentActive && storeIsPlaying;
  const isLoading = isCurrentActive && storeIsLoading;

  const totalDuration =
    (isCurrentActive && storeDuration > 0 ? storeDuration : attachment.duration) || 0;
  const currentTime = isCurrentActive ? storeCurrentTime : 0;

  // Fixed 45-bar sampled and normalized waveform
  const peaks = useMemo(() => {
    return samplePeaks(attachment.waveform, 45, attachment.id || 'voice-msg');
  }, [attachment.waveform, attachment.id]);

  // Handle Play/Pause Click
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Handle Seek on Bar / Waveform Interaction
  const handleSeek = useCallback(
    (fraction: number) => {
      const targetTime = Math.max(0, Math.min(totalDuration, fraction * totalDuration));

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
        setTimeout(() => seek(targetTime), 20);
      }
    },
    [
      attachment,
      conversationId,
      isCurrentActive,
      seek,
      senderName,
      sentAt,
      totalDuration,
      setActiveMedia,
    ],
  );

  // Cycle Speed (1x -> 1.5x -> 2x -> 0.5x -> 1x)
  const handleCycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const progressFraction = totalDuration > 0 ? Math.min(1, currentTime / totalDuration) : 0;

  const displayTimecode = useMemo(() => {
    if (hoverFraction !== null && totalDuration > 0) {
      return `${formatVoiceTime(hoverFraction * totalDuration)} / ${formatVoiceTime(totalDuration)}`;
    }
    return formatVoiceDuration(currentTime, totalDuration, isPlaying);
  }, [hoverFraction, totalDuration, currentTime, isPlaying]);

  return (
    <div
      data-testid="audio-message-bubble"
      className="flex items-center gap-3 py-1 pl-1 pr-3 sm:pr-4 w-[245px] sm:w-[275px] max-w-full overflow-hidden select-none"
    >
      {/* Play / Pause / Buffering Circular Button */}
      <button
        type="button"
        onClick={handleTogglePlay}
        className={`w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center rounded-full text-white shadow-md transition-all active:scale-95 cursor-pointer ${
          isOwnMessage
            ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
            : 'bg-gradient-to-tr from-sky-600 to-blue-500 hover:from-sky-500 hover:to-blue-400 shadow-[0_0_12px_rgba(14,165,233,0.4)]'
        }`}
        title={isLoading ? 'Buffering audio...' : isPlaying ? 'Pause' : 'Play voice message'}
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin text-white" />
        ) : isPlaying ? (
          <Pause size={15} className="fill-current" />
        ) : (
          <Play size={15} className="fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform & Duration Container */}
      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0 overflow-hidden pr-1">
        {/* 45-Bar Waveform with Hover & Scrub */}
        <WaveformRenderer
          peaks={peaks}
          progressFraction={progressFraction}
          totalDuration={totalDuration}
          onSeek={handleSeek}
          onHoverFractionChange={setHoverFraction}
          isOwnMessage={isOwnMessage}
        />

        {/* Timers, Speed Toggle and Message Status */}
        <div className="flex items-center justify-between w-full text-[10.5px] text-gray-300/80 font-mono tracking-tight leading-none px-0.5 mt-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate">{displayTimecode}</span>

            <button
              type="button"
              onClick={handleCycleSpeed}
              className="px-1.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-purple-200 text-[9px] font-bold transition-colors cursor-pointer shrink-0"
              title="Toggle playback speed"
            >
              {storePlaybackRate}x
            </button>
          </div>

          {sentAt && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400 shrink-0 ml-auto pl-2 select-none font-sans">
              <span>{sentAt}</span>
              {statusIcon}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const VoiceMessagePlayer = AudioMessageBubble;
