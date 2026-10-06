import React from 'react';
import { Moon, RotateCcw, Volume2, Sparkles, Layers, Music2 } from 'lucide-react';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { CanvasThemesSection } from './CanvasThemesSection';
import { AccentThemesSection } from './AccentThemesSection';
import { GradientThemesSection } from './GradientThemesSection';
import { WallpaperThemesSection } from './WallpaperThemesSection';
import { ThemeLivePreviewCard } from './ThemeLivePreviewCard';
import { TypographySection } from './TypographySection';
import { CursorsSection } from './CursorsSection';
import { playToggleSound } from '@/shared/lib/themeSoundFx';

export default function AppearanceTab() {
  const syncWithSystem = useThemeStore((s) => s.syncWithSystem);
  const setSyncWithSystem = useThemeStore((s) => s.setSyncWithSystem);
  const glassmorphismOpacity = useThemeStore((s) => s.glassmorphismOpacity);
  const setGlassmorphismOpacity = useThemeStore((s) => s.setGlassmorphismOpacity);
  const ambientPlayerGlow = useThemeStore((s) => s.ambientPlayerGlow);
  const setAmbientPlayerGlow = useThemeStore((s) => s.setAmbientPlayerGlow);
  const soundFxEnabled = useThemeStore((s) => s.soundFxEnabled);
  const setSoundFxEnabled = useThemeStore((s) => s.setSoundFxEnabled);
  const resetToDefaults = useThemeStore((s) => s.resetToDefaults);

  const handleToggleSync = () => {
    if (soundFxEnabled) playToggleSound();
    setSyncWithSystem(!syncWithSystem);
  };

  const handleToggleAmbient = () => {
    if (soundFxEnabled) playToggleSound();
    setAmbientPlayerGlow(!ambientPlayerGlow);
  };

  const handleToggleSound = () => {
    playToggleSound();
    setSoundFxEnabled(!soundFxEnabled);
  };

  const handleReset = () => {
    if (soundFxEnabled) playToggleSound();
    resetToDefaults();
  };

  return (
    <div className="text-gray-950 dark:text-white flex flex-col gap-9 animate-fadeIn pb-6">
      {/* Section 1: Color Theme & System Sync */}
      <div id="sec-theme" className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/[0.06] pb-3.5">
          <h3 className="text-xl font-bold flex items-center gap-2 text-gray-950 dark:text-white">
            <Moon size={20} className="text-indigo-600 dark:text-indigo-400" />
            Appearance & Themes
          </h3>

          {/* Sync with System Theme Switch*/}
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-200">
                Sync with device
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">
                Matches your system device theme
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Sync with device"
              aria-checked={syncWithSystem}
              onClick={handleToggleSync}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                syncWithSystem ? 'bg-indigo-600' : 'bg-black/15 dark:bg-white/15'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  syncWithSystem ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Live Preview Card */}
        <ThemeLivePreviewCard />

        {/* 4 Base Themes + Custom RGB 6-Slot Grid */}
        <CanvasThemesSection />

        {/* Accent Tint Palette */}
        <div className="pt-4 border-t border-black/10 dark:border-white/[0.06]">
          <AccentThemesSection />
        </div>

        {/* Gradient Themes & Mixer */}
        <div className="pt-4 border-t border-black/10 dark:border-white/[0.06]">
          <GradientThemesSection />
        </div>

        {/* Wallpaper & Animated GIF/Video */}
        <div className="pt-4 border-t border-black/10 dark:border-white/[0.06]">
          <WallpaperThemesSection />
        </div>

        {/* Advanced Styling Sliders & Toggles */}
        <div className="pt-4 border-t border-black/10 dark:border-white/[0.06] flex flex-col gap-4">
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wider">
            Advanced Interface Settings
          </span>

          {/* Glassmorphism Slider */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-900 dark:text-gray-200 flex items-center gap-2">
                <Layers size={15} className="text-purple-600 dark:text-purple-400" />
                Panel Opacity (Glassmorphism)
              </span>
              <span className="text-purple-600 dark:text-purple-400 font-mono font-semibold">
                {Math.round(glassmorphismOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={glassmorphismOpacity}
              onChange={(e) => setGlassmorphismOpacity(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
              <span>0% — Solid opaque panels</span>
              <span>100% — Liquid acrylic glass</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Spotify Ambient Player Glow */}
            <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-200 flex items-center gap-1.5">
                  <Music2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                  Ambient Player Glow
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Soft ambient glow matching track artwork
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Ambient Player Glow"
                aria-checked={ambientPlayerGlow}
                onClick={handleToggleAmbient}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                  ambientPlayerGlow ? 'bg-emerald-500' : 'bg-black/15 dark:bg-white/15'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    ambientPlayerGlow ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Tactile Sound FX */}
            <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-200 flex items-center gap-1.5">
                  <Volume2 size={14} className="text-amber-600 dark:text-amber-400" />
                  Tactile Sound FX
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Micro-clicks when selecting themes and switches
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Tactile Sound FX"
                aria-checked={soundFxEnabled}
                onClick={handleToggleSound}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                  soundFxEnabled ? 'bg-amber-500' : 'bg-black/15 dark:bg-white/15'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    soundFxEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Reset to Defaults Button */}
        <div className="pt-2 flex justify-start">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.07] dark:hover:bg-white/[0.07] text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white text-xs font-medium border border-black/10 dark:border-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset appearance to default</span>
          </button>
        </div>
      </div>

      {/* Section 2: Typography & Font Layout */}
      <div id="sec-interface">
        <TypographySection />
      </div>

      {/* Section 3: Custom Cursors */}
      <CursorsSection />
    </div>
  );
}
