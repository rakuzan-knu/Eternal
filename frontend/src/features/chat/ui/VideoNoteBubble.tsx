import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';
import { AttachmentView } from '../../../entities/chat/model/types';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';

interface VideoNoteBubbleProps {
  attachment: AttachmentView;
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

export function VideoNoteBubble({
  attachment,
  senderName = 'Video Note',
  sentAt,
  conversationId,
}: VideoNoteBubbleProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(attachment.duration || 0);

  const {
    activeMediaId,
    setActiveMedia,
    setCurrentTime: setStoreCurrentTime,
    setDuration: setStoreDuration,
    isPlaying: storeIsPlaying,
    isMuted: storeIsMuted,
    volume: storeVolume,
    playbackRate: storePlaybackRate,
    seekTarget,
  } = useActiveMediaPlaybackStore();

  const isCurrentActive = activeMediaId === attachment.id;

  // Global playback overlap coordinator: if another media activates, mute this one
  useEffect(() => {
    if (activeMediaId && activeMediaId !== attachment.id && !isMuted) {
      if (videoRef.current) {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    }
  }, [activeMediaId, attachment.id, isMuted]);

  // Sync with global store when this video is active
  useEffect(() => {
    if (!isCurrentActive) return;
    const video = videoRef.current;
    if (!video) return;

    // Sync play / pause
    if (storeIsPlaying && video.paused) {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else if (!storeIsPlaying && !video.paused) {
      video.pause();
      setIsPlaying(false);
    }

    // Sync mute & volume
    video.muted = storeIsMuted;
    video.volume = storeVolume;
    setIsMuted(storeIsMuted);

    // Sync speed
    video.playbackRate = storePlaybackRate;
  }, [isCurrentActive, storeIsPlaying, storeIsMuted, storeVolume, storePlaybackRate]);

  // Handle global seek target
  useEffect(() => {
    if (!isCurrentActive || seekTarget === null) return;
    const video = videoRef.current;
    if (video) {
      video.currentTime = seekTarget;
      setCurrentTime(seekTarget);
    }
  }, [isCurrentActive, seekTarget]);

  // Autoplay muted on loop when in viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const video = videoRef.current;
        if (!video) return;

        if (entry.isIntersecting) {
          video
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => {});
        } else {
          video.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Handle tap / click on the video circle:
  // 1st click: un-mutes and activates the global top player bar
  // 2nd click: pauses / unpauses
  const handleCircleClick = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      // First click: turn sound ON and register in Global Top Bar
      const nextMuted = false;
      video.muted = nextMuted;
      setIsMuted(nextMuted);

      setActiveMedia({
        id: attachment.id,
        mediaType: 'video',
        url: attachment.url,
        senderName,
        sentAt,
        conversationId,
        duration: totalDuration || video.duration || 0,
      });

      if (video.paused) {
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    } else {
      // Sound is already on: toggle pause/play
      if (video.paused) {
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
        if (isCurrentActive) {
          useActiveMediaPlaybackStore.getState().setIsPlaying(true);
        }
      } else {
        video.pause();
        setIsPlaying(false);
        if (isCurrentActive) {
          useActiveMediaPlaybackStore.getState().setIsPlaying(false);
        }
      }
    }
  };

  const size = 240;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressFraction = totalDuration > 0 ? currentTime / totalDuration : 0;
  const strokeDashoffset = circumference * (1 - progressFraction);

  return (
    <div
      ref={containerRef}
      data-testid="video-note-bubble"
      onClick={handleCircleClick}
      className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full overflow-hidden border-2 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.6)] bg-black cursor-pointer select-none group transition-transform active:scale-[0.98]"
      title={isMuted ? 'Click to turn sound on' : isPlaying ? 'Click to pause' : 'Click to resume'}
    >
      <video
        ref={videoRef}
        src={attachment.url}
        playsInline
        loop
        muted={isMuted}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (d && !isNaN(d) && isFinite(d)) {
            setTotalDuration(d);
            if (isCurrentActive) setStoreDuration(d);
          }
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setCurrentTime(t);
          if (isCurrentActive) setStoreCurrentTime(t);
        }}
        className="w-full h-full object-cover pointer-events-none"
      />

      {/* Radial Progress Ring */}
      <svg
        className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#a855f7"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-150"
        />
      </svg>

      {/* Top Status Icon: Mute / Sound indicator */}
      <div className="absolute top-2.5 inset-x-0 flex justify-center pointer-events-none">
        <div className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-md">
          {isMuted ? (
            <VolumeX size={13} className="text-gray-300" />
          ) : (
            <Volume2 size={13} className="text-purple-400 animate-pulse" />
          )}
        </div>
      </div>

      {/* Play Icon Overlay if paused */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
          <div className="w-12 h-12 rounded-full bg-purple-600/80 border border-purple-400/40 backdrop-blur-md flex items-center justify-center text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]">
            <Play size={20} className="ml-0.5 fill-white" />
          </div>
        </div>
      )}

      {/* Bottom Floating Glass Capsule: Current Time & Total Duration */}
      <div className="absolute bottom-2.5 inset-x-0 flex justify-center pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 border border-white/10 backdrop-blur-md text-[11px] font-mono font-bold text-white shadow-lg">
          <span>{formatDuration(currentTime || totalDuration)}</span>
        </div>
      </div>
    </div>
  );
}
