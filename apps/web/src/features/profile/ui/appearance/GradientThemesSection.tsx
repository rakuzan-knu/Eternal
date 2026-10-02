import React, { useState } from 'react';
import { Check, Sparkles, SlidersHorizontal } from 'lucide-react';
import {
  useThemeStore,
  GRADIENT_PRESETS,
  CustomGradientConfig,
} from '@/shared/model/useThemeStore';
import { triggerCircularRippleTransition } from '@/features/chat/lib/themeRippleTransition';
import { playPresetSelectSound, playToggleSound } from '@/shared/lib/themeSoundFx';

const PRESET_ANGLES = [45, 90, 135, 180];

export function GradientThemesSection() {
  const themeMode = useThemeStore((s) => s.themeMode);
  const gradientPresetId = useThemeStore((s) => s.gradientPresetId);
  const customGradient = useThemeStore((s) => s.customGradient);
  const soundFxEnabled = useThemeStore((s) => s.soundFxEnabled);
  const setGradientPreset = useThemeStore((s) => s.setGradientPreset);
  const setCustomGradient = useThemeStore((s) => s.setCustomGradient);

  const [isMixerOpen, setIsMixerOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(customGradient?.from || '#180728');
  const [localTo, setLocalTo] = useState(customGradient?.to || '#3b0764');
  const [localAngle, setLocalAngle] = useState(customGradient?.angle || 135);

  const handleSelectPreset = (presetId: string, e: React.MouseEvent) => {
    if (soundFxEnabled) playPresetSelectSound();
    triggerCircularRippleTransition({ x: e.clientX, y: e.clientY }, () => {
      setGradientPreset(presetId);
    });
  };

  const handleApplyCustomGradient = (e: React.MouseEvent) => {
    if (soundFxEnabled) playToggleSound();
    const config: CustomGradientConfig = {
      from: localFrom,
      to: localTo,
      angle: localAngle,
    };
    triggerCircularRippleTransition({ x: e.clientX, y: e.clientY }, () => {
      setCustomGradient(config);
    });
  };

  const previewGradientCss = `linear-gradient(${localAngle}deg, ${localFrom} 0%, ${localTo} 100%)`;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-950 dark:text-gray-100 flex items-center gap-2">
            <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
            Gradient Themes
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            Curated palettes and custom gradient mixer
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (soundFxEnabled) playToggleSound();
            setIsMixerOpen((v) => !v);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
            isMixerOpen
              ? 'bg-purple-600/20 border-purple-500/40 text-purple-700 dark:text-purple-300'
              : 'bg-black/[0.04] dark:bg-white/[0.04] border-black/10 dark:border-white/10 text-gray-800 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-black/[0.08] dark:hover:bg-white/[0.08]'
          }`}
        >
          <SlidersHorizontal size={13} />
          <span>{isMixerOpen ? 'Hide mixer' : 'Gradient mixer'}</span>
        </button>
      </div>

      {/* Preset Gradients Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {GRADIENT_PRESETS.map((preset) => {
          const isSelected = themeMode === 'gradient' && gradientPresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={(e) => handleSelectPreset(preset.id, e)}
              className={`group relative h-16 rounded-2xl p-2 transition-all duration-200 flex flex-col justify-between items-start text-left cursor-pointer outline-none overflow-hidden ${
                isSelected
                  ? 'ring-2 ring-purple-400 shadow-lg shadow-purple-500/25 scale-[1.03]'
                  : 'hover:scale-[1.02] hover:ring-1 hover:ring-white/20'
              }`}
              style={{ background: preset.gradient }}
            >
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
              <div className="w-full flex items-center justify-between relative z-10">
                <span className="text-[11px] font-semibold text-white drop-shadow-sm truncate pr-1">
                  {preset.name}
                </span>
                {isSelected && (
                  <span className="w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center shadow shrink-0">
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Gradient Mixer Panel */}
      {isMixerOpen && (
        <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col gap-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Live Gradient Preview Box */}
            <div
              className="h-20 sm:w-48 rounded-xl border border-white/15 shadow-inner flex items-center justify-center shrink-0"
              style={{ background: previewGradientCss }}
            >
              <span className="text-xs font-semibold text-white/90 drop-shadow-md bg-black/30 px-2 py-1 rounded-lg backdrop-blur-sm">
                Preview
              </span>
            </div>

            {/* Controls */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Color From */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-400 font-medium uppercase">
                    Start Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localFrom}
                      onChange={(e) => setLocalFrom(e.target.value)}
                      className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localFrom}
                      onChange={(e) => setLocalFrom(e.target.value)}
                      className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>

                {/* Color To */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-400 font-medium uppercase">
                    End Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localTo}
                      onChange={(e) => setLocalTo(e.target.value)}
                      className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localTo}
                      onChange={(e) => setLocalTo(e.target.value)}
                      className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Angle Selector Pills */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400 font-medium">Angle:</span>
                <div className="flex items-center gap-1.5">
                  {PRESET_ANGLES.map((angle) => (
                    <button
                      key={angle}
                      type="button"
                      onClick={() => setLocalAngle(angle)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                        localAngle === angle
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-white/[0.05] text-gray-400 hover:text-white'
                      }`}
                    >
                      {angle}°
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyCustomGradient}
            className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shadow-md shadow-purple-600/30 flex items-center justify-center gap-1.5"
          >
            <Check size={14} />
            Apply custom gradient
          </button>
        </div>
      )}
    </div>
  );
}
