import React, { useRef } from 'react';
import {
  Sparkles,
  Clock,
  Flame,
  Music2,
  Gamepad2,
  Tv,
  Compass,
  Film,
  ChevronLeft,
  ChevronRight,
  Play,
  Plus,
} from 'lucide-react';
import type { WatchTogetherVideoItem } from '../../api/watchTogetherApi';

interface WatchTogetherRailProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  items: WatchTogetherVideoItem[];
  onPlay: (item: WatchTogetherVideoItem) => void;
  onAddToQueue: (item: WatchTogetherVideoItem) => void;
}

export const WatchTogetherRail: React.FC<WatchTogetherRailProps> = ({
  id,
  title,
  subtitle,
  icon,
  items,
  onPlay,
  onAddToQueue,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 600;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const getRailIcon = () => {
    switch (icon) {
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'Clock':
        return <Clock className="w-4 h-4 text-cyan-400" />;
      case 'Flame':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'Music2':
        return <Music2 className="w-4 h-4 text-pink-400" />;
      case 'Gamepad2':
        return <Gamepad2 className="w-4 h-4 text-emerald-400" />;
      case 'Tv':
        return <Tv className="w-4 h-4 text-blue-400" />;
      case 'Film':
        return <Film className="w-4 h-4 text-rose-400" />;
      default:
        return <Compass className="w-4 h-4 text-purple-400" />;
    }
  };

  const getIconBadgeBg = () => {
    switch (icon) {
      case 'Sparkles':
        return 'bg-purple-500/15 border-purple-500/30';
      case 'Clock':
        return 'bg-cyan-500/15 border-cyan-500/30';
      case 'Flame':
        return 'bg-amber-500/15 border-amber-500/30';
      case 'Music2':
        return 'bg-pink-500/15 border-pink-500/30';
      case 'Gamepad2':
        return 'bg-emerald-500/15 border-emerald-500/30';
      case 'Tv':
        return 'bg-blue-500/15 border-blue-500/30';
      case 'Film':
        return 'bg-rose-500/15 border-rose-500/30';
      default:
        return 'bg-purple-500/15 border-purple-500/30';
    }
  };

  return (
    <section className="space-y-3" id={`rail-${id}`}>
      {/* Rail Header with Title and Scroll Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-xl border ${getIconBadgeBg()}`}>{getRailIcon()}</div>
          <div>
            <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              {title}
            </h4>
            {subtitle && <p className="text-[11px] text-neutral-400">{subtitle}</p>}
          </div>
        </div>

        {/* Scroll Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            aria-label={`Scroll left: ${title}`}
            className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-white/5 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            aria-label={`Scroll right: ${title}`}
            className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-white/5 active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-none scroll-smooth pb-2 pt-1 -mx-1 px-1 snap-x"
      >
        {items.map((video, idx) => (
          <div
            key={`${video.id}-${idx}`}
            className="group w-64 sm:w-72 shrink-0 snap-start bg-neutral-900/40 hover:bg-neutral-900/90 rounded-2xl overflow-hidden border border-white/5 hover:border-purple-500/30 transition-all shadow-sm hover:shadow-xl flex flex-col backdrop-blur-sm"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-neutral-950 overflow-hidden">
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Duration Badge */}
              <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono font-medium text-white backdrop-blur-sm border border-white/10">
                {video.duration}
              </span>

              {/* Resume Watch Progress Bar (if available) */}
              {typeof video.progress === 'number' && video.progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                  <div
                    className="h-full bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                    style={{ width: `${Math.min(100, Math.round(video.progress * 100))}%` }}
                  />
                </div>
              )}
            </div>

            {/* Info & Action Buttons */}
            <div className="p-3 flex-1 flex flex-col justify-between gap-3">
              <div>
                <h5
                  title={video.title}
                  className="text-xs font-semibold text-white line-clamp-2 group-hover:text-purple-300 transition-colors leading-snug"
                >
                  {video.title}
                </h5>
                <p className="text-[11px] text-neutral-400 mt-1 truncate">
                  {video.channelTitle}
                  {video.viewCount && (
                    <span className="text-neutral-500"> • {video.viewCount}</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => onPlay(video)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-all shadow-[0_0_10px_rgba(168,85,247,0.25)] active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Play
                </button>

                <button
                  type="button"
                  onClick={() => onAddToQueue(video)}
                  title="Add to room queue"
                  className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors border border-white/5 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
