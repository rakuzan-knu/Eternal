import React, { useState, useRef, useEffect } from 'react';
import { Check, Pipette, X } from 'lucide-react';
import { useThemeStore, ACCENT_PRESETS } from '@/shared/model/useThemeStore';
import { playPresetSelectSound, playToggleSound } from '@/shared/lib/themeSoundFx';
import { getTextOnAccent } from '@/shared/lib/themeContrastEngine';
import { triggerCircularRippleTransition } from '@/features/chat/lib/themeRippleTransition';

export function AccentThemesSection() {
  const accentColor = useThemeStore((s) => s.accentColor);
  const textOnAccent = useThemeStore((s) => s.textOnAccent);
  const recentAccents = useThemeStore((s) => s.recentAccents);
  const soundFxEnabled = useThemeStore((s) => s.soundFxEnabled);
  const setAccentColor = useThemeStore((s) => s.setAccentColor);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerHex, setPickerHex] = useState(accentColor);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPickerHex(accentColor);
  }, [accentColor]);

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

  const handleSelectAccent = (hex: string, e?: React.MouseEvent) => {
    if (soundFxEnabled) playPresetSelectSound();
    const origin = e ? { x: e.clientX, y: e.clientY } : null;
    triggerCircularRippleTransition(origin, () => {
      setAccentColor(hex);
    });
  };

  const handleApplyCustomAccent = (e: React.MouseEvent) => {
    if (soundFxEnabled) playToggleSound();
    const validHex = /^#[0-9A-Fa-f]{6}$/.test(pickerHex) ? pickerHex : '#8B5CF6';
    triggerCircularRippleTransition({ x: e.clientX, y: e.clientY }, () => {
      setAccentColor(validHex);
    });
    setIsPickerOpen(false);
  };

  const customTextOnAccent = getTextOnAccent(pickerHex);

  return (
    <div className="flex flex-col gap-3 relative">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-950 dark:text-gray-100">Accent Color</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            Applies to active buttons, channels, badges, and interface accents
          </p>
        </div>
      </div>

      {/* Preset Swatches Row + Custom Picker */}
      <div className="flex flex-wrap items-center gap-2.5">
        {ACCENT_PRESETS.map((preset) => {
          const isSelected = accentColor.toLowerCase() === preset.hex.toLowerCase();
          const presetTextOnAccent = getTextOnAccent(preset.hex);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={(e) => handleSelectAccent(preset.hex, e)}
              title={`${preset.name} (${preset.hex})`}
              className={`w-9 h-9 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer outline-none ${
                isSelected
                  ? 'ring-2 ring-white/60 shadow-lg scale-110'
                  : 'hover:scale-105 hover:ring-1 hover:ring-white/30'
              }`}
              style={{ backgroundColor: preset.hex }}
            >
              {isSelected ? (
                <Check size={16} strokeWidth={3} style={{ color: presetTextOnAccent }} />
              ) : (
                <span
                  className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: presetTextOnAccent }}
                >
                  Aa
                </span>
              )}
            </button>
          );
        })}

        {/* Custom Accent Picker Button */}
        <button
          type="button"
          onClick={() => {
            if (soundFxEnabled) playToggleSound();
            setIsPickerOpen((v) => !v);
          }}
          title="Custom accent color"
          className={`w-9 h-9 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] transition-all flex items-center justify-center text-gray-400 hover:text-white cursor-pointer ${
            isPickerOpen ? 'ring-2 ring-indigo-400' : ''
          }`}
        >
          <Pipette size={16} />
        </button>
      </div>

      {/* Recent Accents */}
      {recentAccents.length > 0 && (
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-gray-500">Recent accents:</span>
          <div className="flex items-center gap-1.5">
            {recentAccents.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={(e) => handleSelectAccent(hex, e)}
                title={hex}
                className={`w-3.5 h-3.5 rounded-full border border-white/20 transition-transform hover:scale-125 cursor-pointer ${
                  accentColor === hex ? 'ring-2 ring-white/70' : ''
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Popover Custom Accent */}
      {isPickerOpen && (
        <div
          ref={pickerRef}
          className="absolute left-0 top-full mt-2 z-50 w-64 p-3.5 bg-[#16171d] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl animate-scaleIn text-white flex flex-col gap-3"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
            <span className="text-xs font-semibold text-gray-200">Choose Accent Color</span>
            <button
              type="button"
              onClick={() => setIsPickerOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl border border-white/20 shadow-inner flex items-center justify-center font-bold text-xs shrink-0"
              style={{
                backgroundColor: pickerHex,
                color: customTextOnAccent,
              }}
            >
              Aa
            </div>
            <input
              type="text"
              value={pickerHex}
              onChange={(e) => setPickerHex(e.target.value)}
              placeholder="#8B5CF6"
              maxLength={7}
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none focus:border-indigo-400"
            />
          </div>

          <button
            type="button"
            onClick={handleApplyCustomAccent}
            className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30"
          >
            <Check size={14} />
            Set Accent
          </button>
        </div>
      )}
    </div>
  );
}
