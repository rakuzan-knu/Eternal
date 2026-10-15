import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  Gauge,
  Sliders,
  PictureInPicture2,
  Subtitles,
  EyeOff,
  Flag,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react';
import { SUBTITLE_LANGUAGES, type SubtitleLanguage } from '../lib/reelSubtitles';

export interface ReelOptionsMenuProps {
  playbackRate: number;
  onSelectPlaybackRate: (rate: number) => void;
  quality: string;
  availableQualities: string[];
  onSelectQuality: (q: string) => void;
  onTogglePictureInPicture: () => void;
  subtitleLanguage: SubtitleLanguage;
  onSelectSubtitleLanguage: (lang: SubtitleLanguage) => void;
  onNotInterested: () => void;
  onOpenReport: () => void;
  onOpenChange?: (open: boolean) => void;
}

type MenuView = 'main' | 'speed' | 'quality' | 'subtitles';

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export const ReelOptionsMenu: React.FC<ReelOptionsMenuProps> = ({
  playbackRate,
  onSelectPlaybackRate,
  quality,
  availableQualities,
  onSelectQuality,
  onTogglePictureInPicture,
  subtitleLanguage,
  onSelectSubtitleLanguage,
  onNotInterested,
  onOpenReport,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<MenuView>('main');
  const menuRef = useRef<HTMLDivElement | null>(null);

  const updateOpenState = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        updateOpenState(false);
        setView('main');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleClose = () => {
    updateOpenState(false);
    setView('main');
  };

  return (
    <div className="relative pointer-events-auto" ref={menuRef}>
      {/* 3 Dots Trigger Button with hover feedback */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          updateOpenState(!isOpen);
        }}
        className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/70 hover:scale-105 active:scale-95 transition-all shadow-lg pointer-events-auto cursor-pointer"
        aria-label="More options"
      >
        <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      </button>

      {/* Dark Glass Dropdown Menu */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute right-0 top-full mt-2 w-64 glass-modal border border-black/10 dark:border-white/15 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-gray-800 dark:text-gray-200 select-none"
        >
          {/* Main Menu View */}
          {view === 'main' && (
            <div className="space-y-0.5">
              {/* 4.1 Speed */}
              <button
                type="button"
                onClick={() => setView('speed')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Gauge className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                  <span>Playback Speed</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400 dark:text-zinc-400">
                  <span className="text-[11px] font-mono">
                    {playbackRate === 1 ? '1x' : `${playbackRate}x`}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* 4.2 Quality */}
              <button
                type="button"
                onClick={() => setView('quality')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  <span>Quality</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400 dark:text-zinc-400">
                  <span className="text-[11px]">{quality}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* 4.3 Floating Player */}
              <button
                type="button"
                onClick={() => {
                  onTogglePictureInPicture();
                  handleClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <PictureInPicture2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <span>Floating Player</span>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase font-bold">
                  PiP
                </span>
              </button>

              {/* 4.4 Subtitles */}
              <button
                type="button"
                onClick={() => setView('subtitles')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Subtitles className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                  <span>Subtitles</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400 dark:text-zinc-400">
                  <span className="text-[11px]">
                    {SUBTITLE_LANGUAGES.find((l) => l.id === subtitleLanguage)?.label || 'Off'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              <div className="h-px bg-black/10 dark:bg-white/10 my-1" />

              {/* 4.7 Not Interested */}
              <button
                type="button"
                onClick={() => {
                  onNotInterested();
                  handleClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-600 dark:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
              >
                <EyeOff className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Not Interested</span>
              </button>

              {/* 4.8 Report */}
              <button
                type="button"
                onClick={() => {
                  onOpenReport();
                  handleClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <Flag className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>Report</span>
              </button>
            </div>
          )}

          {/* Speed Submenu */}
          {view === 'speed' && (
            <div>
              <div className="flex items-center gap-2 px-2 py-1.5 border-b border-black/10 dark:border-white/10 mb-1">
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="p-1 rounded-lg text-gray-500 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  Playback Speed
                </span>
              </div>
              <div className="space-y-0.5">
                {PLAYBACK_SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      onSelectPlaybackRate(s);
                      handleClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      playbackRate === s
                        ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold'
                        : 'text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-950 dark:hover:text-white'
                    }`}
                  >
                    <span>{s === 1 ? '1x (Normal)' : `${s}x`}</span>
                    {playbackRate === s && (
                      <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quality Submenu */}
          {view === 'quality' && (
            <div>
              <div className="flex items-center gap-2 px-2 py-1.5 border-b border-black/10 dark:border-white/10 mb-1">
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="p-1 rounded-lg text-gray-500 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  Video Quality
                </span>
              </div>
              <div className="space-y-0.5">
                {availableQualities.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      onSelectQuality(q);
                      handleClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      quality === q
                        ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 font-bold'
                        : 'text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-950 dark:hover:text-white'
                    }`}
                  >
                    <span>{q}</span>
                    {quality === q && (
                      <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subtitles Submenu */}
          {view === 'subtitles' && (
            <div>
              <div className="flex items-center gap-2 px-2 py-1.5 border-b border-black/10 dark:border-white/10 mb-1">
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="p-1 rounded-lg text-gray-500 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  Subtitle Language
                </span>
              </div>
              <div className="space-y-0.5 max-h-56 overflow-y-auto">
                {SUBTITLE_LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => {
                      onSelectSubtitleLanguage(lang.id);
                      handleClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      subtitleLanguage === lang.id
                        ? 'bg-pink-500/20 text-pink-600 dark:text-pink-300 font-bold'
                        : 'text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-950 dark:hover:text-white'
                    }`}
                  >
                    <span>{lang.label}</span>
                    {subtitleLanguage === lang.id && (
                      <Check className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
