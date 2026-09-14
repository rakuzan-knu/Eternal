import React, { useRef, useEffect, useState } from 'react';
import { Bookmark, X, Ban } from 'lucide-react';

export interface StoryFilterPreset {
  id: string;
  name: string;
  css: string;
  previewBg: string;
}

export const STORY_FILTERS: StoryFilterPreset[] = [
  {
    id: 'none',
    name: 'Normal',
    css: 'none',
    previewBg: 'linear-gradient(135deg, #27272a, #09090b)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    css: 'contrast(1.15) saturate(1.4) hue-rotate(-10deg) brightness(1.05)',
    previewBg: 'linear-gradient(135deg, #f97316, #ec4899)',
  },
  {
    id: '8k',
    name: '8K Ultra',
    css: 'contrast(1.22) saturate(1.25) brightness(1.02)',
    previewBg: 'linear-gradient(135deg, #ef4444, #8b5cf6)',
  },
  {
    id: '4k',
    name: '4K Sharp',
    css: 'contrast(1.15) brightness(1.06) saturate(1.12)',
    previewBg: 'linear-gradient(135deg, #eab308, #3b82f6)',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    css: 'sepia(0.38) contrast(0.95) brightness(0.96) saturate(1.25)',
    previewBg: 'linear-gradient(135deg, #d97706, #78350f)',
  },
  {
    id: 'noir',
    name: 'Noir',
    css: 'grayscale(1) contrast(1.3) brightness(0.95)',
    previewBg: 'linear-gradient(135deg, #71717a, #18181b)',
  },
  {
    id: 'tokyo-neon',
    name: 'Tokyo Neon',
    css: 'hue-rotate(35deg) saturate(1.65) contrast(1.15)',
    previewBg: 'linear-gradient(135deg, #06b6d4, #d946ef)',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    css: 'contrast(1.3) saturate(1.8) hue-rotate(-25deg)',
    previewBg: 'linear-gradient(135deg, #ec4899, #3b82f6)',
  },
  {
    id: 'warm-gold',
    name: 'Warm Gold',
    css: 'sepia(0.25) saturate(1.5) brightness(1.08)',
    previewBg: 'linear-gradient(135deg, #f59e0b, #b45309)',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    css: 'hue-rotate(85deg) saturate(1.25) contrast(1.1)',
    previewBg: 'linear-gradient(135deg, #10b981, #064e3b)',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    css: 'contrast(1.25) brightness(0.92) saturate(1.15)',
    previewBg: 'linear-gradient(135deg, #3b82f6, #1e1b4b)',
  },
];

export function getStoryFilterCss(filterId?: string): string {
  const found = STORY_FILTERS.find((f) => f.id === filterId);
  return found ? found.css : 'none';
}

interface StoryFiltersCarouselProps {
  activeFilterId: string;
  onSelectFilter: (id: string) => void;
  onClose: () => void;
}

export const StoryFiltersCarousel: React.FC<StoryFiltersCarouselProps> = ({
  activeFilterId,
  onSelectFilter,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeItem = STORY_FILTERS.find((f) => f.id === activeFilterId) || STORY_FILTERS[0];

  const [savedFilters, setSavedFilters] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('story_favorite_filters');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isFavorite = savedFilters.includes(activeItem.id);

  const toggleFavorite = () => {
    const next = isFavorite
      ? savedFilters.filter((id) => id !== activeItem.id)
      : [...savedFilters, activeItem.id];
    setSavedFilters(next);
    try {
      localStorage.setItem('story_favorite_filters', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Center active filter when it changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeEl = container.querySelector<HTMLElement>(`[data-filter-id="${activeFilterId}"]`);
    if (activeEl) {
      const offsetLeft = activeEl.offsetLeft;
      const targetScroll = offsetLeft - container.clientWidth / 2 + activeEl.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }, [activeFilterId]);

  // Dampened wheel scrolling for smooth slow wheel browsing
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      e.stopPropagation();
      if (containerRef.current) {
        containerRef.current.scrollLeft += e.deltaY * 0.4;
      }
    }
  };

  const handleResetFilter = () => {
    onSelectFilter('none');
    if (containerRef.current) {
      containerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full pb-3 z-30 select-none animate-fadeIn">
      {/* Horizontal Filter Circles Carousel */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        className="flex items-center gap-4 overflow-x-auto w-full px-6 py-2 scrollbar-none justify-start"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {STORY_FILTERS.map((f) => {
          const isSelected = f.id === activeFilterId;
          const isNone = f.id === 'none';

          return (
            <button
              key={f.id}
              type="button"
              data-filter-id={f.id}
              onClick={() => onSelectFilter(f.id)}
              style={{ scrollSnapAlign: 'center' }}
              className={`relative flex items-center justify-center shrink-0 rounded-full transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'w-16 h-16 ring-4 ring-white shadow-[0_0_20px_rgba(255,255,255,0.7)] scale-110 z-10'
                  : 'w-12 h-12 ring-2 ring-white/30 hover:ring-white/60 opacity-80 hover:opacity-100 hover:scale-105'
              }`}
            >
              <div
                style={{ background: f.previewBg }}
                className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
              >
                {isNone ? (
                  <Ban size={isSelected ? 26 : 20} className="text-white drop-shadow" />
                ) : (
                  <span className="text-[10px] font-black text-white drop-shadow-md tracking-wider uppercase">
                    {f.name.slice(0, 3)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Filter Info & Action Pill (Instagram Screenshot 4 & 5 Match) */}
      <div className="flex items-center justify-between gap-4 px-5 py-2.5 rounded-full bg-[#181822]/90 backdrop-blur-2xl border border-white/15 text-white shadow-2xl min-w-[260px] max-w-[320px]">
        {/* Bookmark Favorite */}
        <button
          type="button"
          onClick={toggleFavorite}
          className={`p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer ${
            isFavorite ? 'text-amber-400' : 'text-gray-400 hover:text-white'
          }`}
          title={isFavorite ? 'In favorites' : 'Save filter'}
        >
          <Bookmark size={18} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        {/* Filter Name */}
        <span className="text-xs font-bold text-white tracking-wide truncate">
          {activeItem.name}
        </span>

        {/* Cancel / Reset X */}
        <button
          type="button"
          onClick={handleResetFilter}
          className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Reset filter"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
