import React, { useMemo, useState, useCallback } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { AttachmentView } from '../../../entities/chat/model/types';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';
import { samplePeaks, formatVoiceDuration, formatVoiceTime } from '../lib/waveformUtils';
import { WaveformRenderer } from './WaveformRenderer';
import type { ChatThemeConfig } from '../model/chatTheme';
import type { ContrastTheme } from '../lib/themeUtils';

export interface AudioMessageBubbleProps {
  attachment: (AttachmentView | (Partial<AttachmentView> & { id: string; url: string })) & {
    waveform?: number[] | null;
  };
  isOwnMessage?: boolean;
  senderName?: string;
  sentAt?: string;
  conversationId?: string;
  statusIcon?: React.ReactNode;
  chatTheme?: ChatThemeConfig | null;
  contrast?: ContrastTheme | null;
}

export function AudioMessageBubble({
  attachment,
  isOwnMessage = false,
  senderName = 'Voice Message',
  sentAt,
  conversationId,
  statusIcon,
  chatTheme,
  contrast,
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

  const isLightBg = Boolean(contrast?.isLight);

  // Determine activeColor from custom text color or fallback contrast
  const customTextColor = useMemo(() => {
    if (!chatTheme) return undefined;
    const shouldApply = chatTheme.textApplyToAll || isOwnMessage;
    if (shouldApply && chatTheme.textColor && chatTheme.textColor !== 'auto') {
      return chatTheme.textColor;
    }
    if (isOwnMessage && chatTheme.bubbleTextColor && chatTheme.bubbleTextColor !== 'auto') {
      return chatTheme.bubbleTextColor;
    }
    if (
      !isOwnMessage &&
      chatTheme.incomingBubbleTextColor &&
      chatTheme.incomingBubbleTextColor !== 'auto'
    ) {
      return chatTheme.incomingBubbleTextColor;
    }
    return undefined;
  }, [chatTheme, isOwnMessage]);

  const activeColor = useMemo(() => {
    if (customTextColor) return customTextColor;
    if (isLightBg) return '#000000';
    return undefined;
  }, [customTextColor, isLightBg]);

  return (
    <div
      data-testid="audio-message-bubble"
      className="flex items-center gap-3 py-1 pl-1 pr-3 sm:pr-4 w-70 sm:w-82.5 max-w-full overflow-hidden select-none"
    >
      {/* Play / Pause / Buffering Circular Button */}
      <button
        type="button"
        onClick={handleTogglePlay}
        className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-full text-white shadow-md transition-all active:scale-95 cursor-pointer ${
          isOwnMessage
            ? 'bg-linear-to-tr from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
            : 'bg-linear-to-tr from-sky-600 to-blue-500 hover:from-sky-500 hover:to-blue-400 shadow-[0_0_12px_rgba(14,165,233,0.4)]'
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
          isLightBg={isLightBg}
          activeColor={activeColor}
        />

        {/* Timers, Speed Toggle and Message Status */}
        <div className="flex items-center justify-between w-full text-[10.5px] font-mono tracking-tight leading-none px-0.5 mt-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="truncate"
              style={{
                color: isLightBg
                  ? contrast?.timeColor || 'rgba(15, 23, 42, 0.75)'
                  : contrast?.timeColor || 'rgba(255, 255, 255, 0.8)',
              }}
            >
              {displayTimecode}
            </span>

            <button
              type="button"
              onClick={handleCycleSpeed}
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-colors cursor-pointer shrink-0 ${
                isLightBg
                  ? 'bg-black/10 hover:bg-black/20 text-slate-900'
                  : 'bg-white/10 hover:bg-white/20 text-purple-200'
              }`}
              title="Toggle playback speed"
            >
              {storePlaybackRate}x
            </button>
          </div>

          {sentAt && (
            <div
              className="flex items-center gap-1 text-[10px] shrink-0 ml-auto pl-2 select-none font-sans"
              style={{
                color: isLightBg
                  ? contrast?.timeColor || 'rgba(15, 23, 42, 0.65)'
                  : contrast?.timeColor || 'rgba(156, 163, 175, 1)',
              }}
            >
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
