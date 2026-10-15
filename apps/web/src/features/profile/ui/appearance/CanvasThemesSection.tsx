import React, { useState, useRef, useEffect } from 'react';
import { Check, Pipette, Plus, Sliders, X } from 'lucide-react';
import {
  useThemeStore,
  BaseSolidTheme,
  SOLID_THEME_COLORS,
  rehydrateWallpaperBlob,
} from '@/shared/model/useThemeStore';
import { triggerCircularRippleTransition } from '@/features/chat/lib/themeRippleTransition';
import { playPresetSelectSound, playToggleSound } from '@/shared/lib/themeSoundFx';
import { hexToRgb } from '@/shared/lib/themeContrastEngine';

const BASE_SLOTS: { id: BaseSolidTheme; label: string; bg: string; border: string }[] = [
  { id: 'light', label: 'Light', bg: '#f8fafc', border: 'border-black/15' },
  { id: 'ash', label: 'Ash', bg: '#26262b', border: 'border-white/10' },
  { id: 'dark', label: 'Dark', bg: '#070709', border: 'border-white/10' },
  { id: 'midnight', label: 'Midnight', bg: '#000000', border: 'border-white/15' },
];

export function CanvasThemesSection() {
  const solidTheme = useThemeStore((s) => s.solidTheme);
  const themeMode = useThemeStore((s) => s.themeMode);
  const customSolidColor = useThemeStore((s) => s.customSolidColor);
  const recentColors = useThemeStore((s) => s.recentColors);
  const wallpaper = useThemeStore((s) => s.wallpaper);
  const activateWallpaper = useThemeStore((s) => s.activateWallpaper);
  const soundFxEnabled = useThemeStore((s) => s.soundFxEnabled);
  const setSolidTheme = useThemeStore((s) => s.setSolidTheme);
  const setCustomSolidColor = useThemeStore((s) => s.setCustomSolidColor);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerHex, setPickerHex] = useState(customSolidColor || '#7c3aed');
  const [pickerRgb, setPickerRgb] = useState(hexToRgb(customSolidColor || '#7c3aed'));
  const pickerRef = useRef<HTMLDivElement>(null);
  const rehydrateAttemptsRef = useRef(0);

  const handleThumbnailError = () => {
    if (rehydrateAttemptsRef.current < 2) {
      rehydrateAttemptsRef.current += 1;
      void rehydrateWallpaperBlob();
    }
  };

  useEffect(() => {
    if (customSolidColor) {
      setPickerHex(customSolidColor);
      setPickerRgb(hexToRgb(customSolidColor));
    }
  }, [customSolidColor]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPickerOpen]);

  const handleSelectBaseTheme = (id: BaseSolidTheme, e: React.MouseEvent) => {
    if (soundFxEnabled) playPresetSelectSound();
    triggerCircularRippleTransition({ x: e.clientX, y: e.clientY }, () => {
      setSolidTheme(id);
    });
  };

  const handleSelectCustomSlot = (e: React.MouseEvent) => {
    if (!customSolidColor) {
      setIsPickerOpen(true);
      return;
    }
    if (soundFxEnabled) playPresetSelectSound();
    triggerCircularRippleTransition({ x: e.clientX, y: e.clientY }, () => {
      setSolidTheme('custom');
    });
  };

  const handleRgbChange = (channel: 'r' | 'g' | 'b', val: number) => {
    const updated = { ...pickerRgb, [channel]: Math.max(0, Math.min(255, val)) };
    setPickerRgb(updated);
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    setPickerHex(`#${toHex(updated.r)}${toHex(updated.g)}${toHex(updated.b)}`);
  };

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPickerHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setPickerRgb(hexToRgb(val));
    }
  };

  const handleApplyCustomColor = (e: React.MouseEvent) => {
    if (soundFxEnabled) playToggleSound();
    const validHex = /^#[0-9A-Fa-f]{6}$/.test(pickerHex) ? pickerHex : '#7c3aed';
    triggerCircularRippleTransition({ x: e.clientX, y: e.clientY }, () => {
      setCustomSolidColor(validHex);
    });
    setIsPickerOpen(false);
  };

  const isCustomActive = themeMode === 'solid' && solidTheme === 'custom';

  return (
    <div className="flex flex-col gap-3.5 relative">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-950 dark:text-gray-100">
            Default Canvas Themes
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            Choose a base interface tone or customize your RGB shade
          </p>
        </div>
      </div>

      {/* Fixed 6-Slot Grid Container with Zero Layout Shift */}
      <div className="grid grid-cols-6 gap-2.5 sm:gap-3 w-full max-w-xl">
        {/* Slots 1-4: Base Themes */}
        {BASE_SLOTS.map((slot) => {
          const isSelected = themeMode === 'solid' && solidTheme === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              onClick={(e) => handleSelectBaseTheme(slot.id, e)}
              title={slot.label}
              className={`group relative aspect-[16/11] rounded-2xl p-1.5 transition-all duration-200 flex flex-col justify-end items-end cursor-pointer outline-none ${
                isSelected
                  ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20 scale-[1.03]'
                  : 'hover:scale-[1.02] hover:ring-1 hover:ring-white/20'
              }`}
              style={{ backgroundColor: slot.bg }}
            >
              <div
                className={`absolute inset-0 rounded-2xl border ${slot.border} pointer-events-none`}
              />
              {isSelected && (
                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md animate-scaleIn">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              <span
                className={`text-[10px] font-medium transition-opacity ${
                  slot.id === 'light' ? 'text-gray-700' : 'text-gray-300'
                } ${isSelected ? 'opacity-90 font-semibold' : 'opacity-60 group-hover:opacity-100'} hidden sm:block`}
              >
                {slot.label}
              </span>
            </button>
          );
        })}

        {/* Slot 5: Custom Saved Color (or dashed placeholder if not chosen yet) */}
        <button
          type="button"
          onClick={handleSelectCustomSlot}
          title={customSolidColor ? `Custom color: ${customSolidColor}` : 'Choose custom shade'}
          className={`group relative aspect-[16/11] rounded-2xl p-1.5 transition-all duration-200 flex flex-col justify-end items-end cursor-pointer outline-none ${
            isCustomActive
              ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20 scale-[1.03]'
              : 'hover:scale-[1.02] hover:ring-1 hover:ring-white/20'
          } ${
            customSolidColor
              ? ''
              : 'border-2 border-dashed border-white/20 hover:border-indigo-400/50 bg-white/[0.02] flex items-center justify-center'
          }`}
          style={{ backgroundColor: customSolidColor || undefined }}
        >
          {customSolidColor ? (
            <>
              <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none" />
              {isCustomActive && (
                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md animate-scaleIn">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              <span className="text-[10px] font-medium text-white/80 hidden sm:block font-mono">
                {customSolidColor}
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 text-gray-400 group-hover:text-indigo-300">
              <Plus size={16} />
              <span className="text-[9px] font-semibold uppercase tracking-wider hidden sm:block">
                Custom
              </span>
            </div>
          )}
        </button>

        {/* Slot 6: RGB Picker Button (Zero-Shift Fixed Position) */}
        <button
          type="button"
          onClick={() => {
            if (soundFxEnabled) playToggleSound();
            setIsPickerOpen((v) => !v);
          }}
          title="Open RGB palette"
          className={`aspect-[16/11] rounded-2xl bg-white/[0.04] border border-white/10 hover:border-indigo-400/50 hover:bg-white/[0.08] transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer outline-none group ${
            isPickerOpen ? 'ring-2 ring-indigo-500/60 bg-white/[0.08]' : ''
          }`}
        >
          <Pipette
            size={16}
            className="text-gray-400 group-hover:text-indigo-400 transition-colors"
          />
          <span className="text-[9px] text-gray-400 group-hover:text-gray-200 font-medium hidden sm:block">
            RGB
          </span>
        </button>
      </div>

      {/* Recent Canvas Colors Dots */}
      {recentColors.length > 0 && (
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-gray-600 dark:text-gray-400">Recent colors:</span>
          <div className="flex items-center gap-1.5">
            {recentColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={(e) => {
                  if (soundFxEnabled) playPresetSelectSound();
                  triggerCircularRippleTransition({ x: e.clientX, y: e.clientY }, () => {
                    setCustomSolidColor(color);
                  });
                }}
                title={color}
                className={`w-4 h-4 rounded-full border border-white/20 transition-transform hover:scale-125 cursor-pointer ${
                  customSolidColor === color && isCustomActive ? 'ring-2 ring-indigo-400' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Wallpaper Switcher Card if user has an uploaded wallpaper */}
      {(wallpaper?.url || wallpaper?.name) && (
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 hover:border-cyan-500/40 transition-all max-w-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-8 rounded-lg overflow-hidden bg-black border border-black/15 dark:border-white/15 relative shrink-0">
              {wallpaper.mediaType === 'video' ? (
                <video
                  src={wallpaper.url}
                  className="w-full h-full object-cover"
                  muted
                  onError={handleThumbnailError}
                />
              ) : (
                <img
                  src={wallpaper.url}
                  alt={wallpaper.name}
                  className="w-full h-full object-cover"
                  onError={handleThumbnailError}
                />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-200 truncate flex items-center gap-1.5">
                <span>My Custom Wallpaper</span>
                {themeMode === 'wallpaper' && (
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-500/15 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                )}
              </span>
              <span className="text-[11px] text-gray-600 dark:text-gray-400 truncate">
                {wallpaper.name}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={async (e) => {
              if (soundFxEnabled) playPresetSelectSound();
              if (!wallpaper.url) {
                await rehydrateWallpaperBlob();
              }
              triggerCircularRippleTransition({ x: e.clientX, y: e.clientY }, () => {
                activateWallpaper();
              });
            }}
            disabled={themeMode === 'wallpaper'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              themeMode === 'wallpaper'
                ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 cursor-default'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-md hover:scale-[1.02] active:scale-95'
            }`}
          >
            <Check size={13} strokeWidth={2.5} />
            <span>{themeMode === 'wallpaper' ? 'Active' : 'Enable wallpaper'}</span>
          </button>
        </div>
      )}
      {isPickerOpen && (
        <div
          ref={pickerRef}
          className="absolute right-0 top-full mt-2 z-50 w-72 p-4 bg-[#16171d] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl animate-scaleIn text-white flex flex-col gap-3.5"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
              <Sliders size={14} className="text-indigo-400" />
              Custom RGB Color
            </span>
            <button
              type="button"
              onClick={() => setIsPickerOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Color Preview Swatch */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl border border-white/20 shadow-inner shrink-0"
              style={{ backgroundColor: pickerHex }}
            />
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                HEX
              </label>
              <input
                type="text"
                value={pickerHex}
                onChange={handleHexInput}
                placeholder="#7C3AED"
                maxLength={7}
                className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          {/* RGB Sliders */}
          <div className="flex flex-col gap-2.5">
            {(['r', 'g', 'b'] as const).map((channel) => {
              const label = channel === 'r' ? 'Red' : channel === 'g' ? 'Green' : 'Blue';
              const colorClass =
                channel === 'r'
                  ? 'text-red-400'
                  : channel === 'g'
                    ? 'text-emerald-400'
                    : 'text-blue-400';
              return (
                <div key={channel} className="flex items-center gap-2 text-xs">
                  <span className={`w-12 text-[11px] font-semibold ${colorClass}`}>{label}</span>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={pickerRgb[channel]}
                    onChange={(e) => handleRgbChange(channel, Number(e.target.value))}
                    className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <span className="w-8 text-right font-mono text-[11px] text-gray-300">
                    {pickerRgb[channel]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Apply Button */}
          <button
            type="button"
            onClick={handleApplyCustomColor}
            className="w-full mt-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5"
          >
            <Check size={14} />
            Apply color
          </button>
        </div>
      )}
    </div>
  );
}
