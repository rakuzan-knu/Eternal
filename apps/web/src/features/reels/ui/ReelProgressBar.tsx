import React, { useEffect, useRef } from 'react';

interface ReelProgressBarProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onSeek?: (time: number) => void;
}

/**
 * Enterprise Decoupled Reel Progress Bar
 *
 * Subscribes directly to video element's timeupdate/progress events and mutates
 * the progress bar DOM directly. Completely eliminates 4-10 re-renders per second
 * from the parent ReelCard component.
 */
export const ReelProgressBar: React.FC<ReelProgressBarProps> = React.memo(
  ({ videoRef, onSeek }) => {
    const barRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const updateProgress = () => {
        if (barRef.current && video.duration > 0) {
          const percent = Math.min(100, Math.max(0, (video.currentTime / video.duration) * 100));
          barRef.current.style.width = `${percent}%`;
        }
      };

      video.addEventListener('timeupdate', updateProgress, { passive: true });
      return () => {
        video.removeEventListener('timeupdate', updateProgress);
      };
    }, [videoRef]);

    const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const video = videoRef.current;
      if (!video || !video.duration) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const targetTime = ratio * video.duration;

      if (barRef.current) {
        barRef.current.style.width = `${ratio * 100}%`;
      }
      onSeek?.(targetTime);
    };

    return (
      <div
        className="absolute bottom-0 inset-x-0 h-1 hover:h-2.5 bg-white/20 z-30 cursor-pointer group transition-all"
        onClick={handleScrubberClick}
        aria-label="Перемотування відео"
        role="progressbar"
      >
        <div
          ref={barRef}
          className="h-full bg-[#fe2c55] relative transition-none"
          style={{ width: '0%' }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow transition-opacity pointer-events-none" />
        </div>
      </div>
    );
  },
);

ReelProgressBar.displayName = 'ReelProgressBar';
