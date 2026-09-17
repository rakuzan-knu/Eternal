import React, { useEffect, useState } from 'react';
import type { SubtitleCue, SubtitleLanguage } from '../lib/reelSubtitles';

interface ReelSubtitlesOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cues: SubtitleCue[];
  subtitleLanguage: SubtitleLanguage;
}

/**
 * Enterprise Memoized Subtitles Overlay
 *
 * Listens to video playback and only re-renders when the spoken dialogue line
 * transitions. Completely isolates subtitle rendering from the main ReelCard component.
 */
export const ReelSubtitlesOverlay: React.FC<ReelSubtitlesOverlayProps> = React.memo(
  ({ videoRef, cues, subtitleLanguage }) => {
    const [currentLine, setCurrentLine] = useState<string | null>(null);

    useEffect(() => {
      if (subtitleLanguage === 'off' || cues.length === 0) {
        setCurrentLine(null);
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      const checkCues = () => {
        const time = video.currentTime;
        const matched = cues.find((c) => time >= c.start && time <= c.end);
        const nextText = matched ? matched.text : null;
        setCurrentLine((prev) => (prev !== nextText ? nextText : prev));
      };

      video.addEventListener('timeupdate', checkCues, { passive: true });
      return () => {
        video.removeEventListener('timeupdate', checkCues);
      };
    }, [videoRef, cues, subtitleLanguage]);

    if (subtitleLanguage === 'off' || !currentLine) {
      return null;
    }

    return (
      <div className="absolute bottom-36 sm:bottom-40 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-[85%] px-4 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 shadow-xl text-center animate-in fade-in duration-150">
        <p className="text-white font-medium text-xs sm:text-sm tracking-wide select-none drop-shadow">
          {currentLine}
        </p>
      </div>
    );
  },
);

ReelSubtitlesOverlay.displayName = 'ReelSubtitlesOverlay';
