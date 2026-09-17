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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<MenuView>('main');
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setView('main');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setView('main');
  };

  return (
    <div className="relative pointer-events-auto" ref={menuRef}>
      {/* 3 Dots Trigger Button with hover feedback */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/70 hover:scale-105 active:scale-95 transition-all shadow-lg pointer-events-auto cursor-pointer"
        aria-label="Більше параметрів"
      >
        <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      </button>

      {/* Dark Glass Dropdown Menu */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute right-0 top-full mt-2 w-64 bg-[#18181b]/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-white select-none"
        >
          {/* Main Menu View */}
          {view === 'main' && (
            <div className="space-y-0.5">
              {/* 4.1 Speed */}
              <button
                type="button"
                onClick={() => setView('speed')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Gauge className="w-4 h-4 text-purple-400" />
                  <span>Швидкість відтворення</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400">
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
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>Якість</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400">
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
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <PictureInPicture2 className="w-4 h-4 text-emerald-400" />
                  <span>Floating Player</span>
                </div>
                <span className="text-[10px] text-zinc-500 uppercase font-bold">PiP</span>
              </button>

              {/* 4.4 Subtitles */}
              <button
                type="button"
                onClick={() => setView('subtitles')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Subtitles className="w-4 h-4 text-pink-400" />
                  <span>Субтитри</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400">
                  <span className="text-[11px]">
                    {SUBTITLE_LANGUAGES.find((l) => l.id === subtitleLanguage)?.label || 'Вимкнено'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              <div className="h-px bg-white/10 my-1" />

              {/* 4.7 Not Interested */}
              <button
                type="button"
                onClick={() => {
                  onNotInterested();
                  handleClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
              >
                <EyeOff className="w-4 h-4 text-amber-400" />
                <span>Не цікаво</span>
              </button>

              {/* 4.8 Report */}
              <button
                type="button"
                onClick={() => {
                  onOpenReport();
                  handleClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <Flag className="w-4 h-4 text-red-400" />
                <span>Поскаржитися</span>
              </button>
            </div>
          )}

          {/* Speed Submenu */}
          {view === 'speed' && (
            <div>
              <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/10 mb-1">
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-white">Швидкість відтворення</span>
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
                        ? 'bg-purple-500/20 text-purple-300 font-bold'
                        : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{s === 1 ? '1x (Звичайна)' : `${s}x`}</span>
                    {playbackRate === s && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quality Submenu */}
          {view === 'quality' && (
            <div>
              <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/10 mb-1">
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-white">Якість відео</span>
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
                        ? 'bg-blue-500/20 text-blue-300 font-bold'
                        : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{q}</span>
                    {quality === q && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subtitles Submenu */}
          {view === 'subtitles' && (
            <div>
              <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/10 mb-1">
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-white">Субтитри (Мова)</span>
              </div>
              <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
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
                        ? 'bg-pink-500/20 text-pink-300 font-bold'
                        : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </div>
                    {subtitleLanguage === lang.id && (
                      <Check className="w-3.5 h-3.5 text-pink-400" />
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
