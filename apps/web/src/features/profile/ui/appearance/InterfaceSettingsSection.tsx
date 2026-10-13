import React from 'react';
import { Layout, Check, RectangleHorizontal, Square } from 'lucide-react';
import { useThemeStore, type SpotifyDockStyle } from '@/shared/model/useThemeStore';
import { playPresetSelectSound } from '@/shared/lib/themeSoundFx';

interface DockStyleOption {
  id: SpotifyDockStyle;
  title: string;
  subtitle: string;
  icon: typeof RectangleHorizontal;
}

const DOCK_STYLE_OPTIONS: DockStyleOption[] = [
  {
    id: 'bar',
    title: 'Floating Dock Bar',
    subtitle: 'Classic horizontal dock pinned to bottom center',
    icon: RectangleHorizontal,
  },
  {
    id: 'square',
    title: 'Compact Square (Call Style)',
    subtitle: 'Floating squircle with cover gradient & micro-controls',
    icon: Square,
  },
];

export function InterfaceSettingsSection() {
  const spotifyDockStyle = useThemeStore((s) => s.spotifyDockStyle);
  const setSpotifyDockStyle = useThemeStore((s) => s.setSpotifyDockStyle);
  const soundFxEnabled = useThemeStore((s) => s.soundFxEnabled);

  const handleSelectStyle = (style: SpotifyDockStyle) => {
    if (spotifyDockStyle === style) return;
    if (soundFxEnabled) playPresetSelectSound();
    setSpotifyDockStyle(style);
  };

  return (
    <div className="flex flex-col gap-5 pt-4 border-t border-black/10 dark:border-white/[0.06]">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-black/10 dark:border-white/[0.06] pb-3">
        <div className="flex flex-col">
          <h3 className="text-xl font-bold flex items-center gap-2 text-gray-950 dark:text-white">
            <Layout size={20} className="text-indigo-600 dark:text-indigo-400" />
            Interface Settings
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configure player appearance and dock presentation
          </span>
        </div>
      </div>

      {/* Symmetrical Minimalist Selection Cards */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wider">
          Player Presentation
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DOCK_STYLE_OPTIONS.map((opt) => {
            const isSelected = spotifyDockStyle === opt.id;
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                role="button"
                onClick={() => handleSelectStyle(opt.id)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500 shadow-sm ring-1 ring-indigo-500/40'
                    : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/10 dark:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400/40 shadow-sm'
                        : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-black/10 dark:border-white/10'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-gray-950 dark:text-white truncate">
                      {opt.title}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                      {opt.subtitle}
                    </span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'border border-gray-400 dark:border-zinc-600'
                  }`}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
