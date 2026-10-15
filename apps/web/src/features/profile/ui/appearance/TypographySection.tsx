import React, { useRef, useState, useEffect } from 'react';
import { Type, Heading, Globe, Ban, RotateCcw, Check, Pencil, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore, type AppFontScope } from '@/shared/model/useThemeStore';
import {
  CHAT_FONTS,
  CHAT_TEXT_EFFECTS,
  DISCORD_TEXT_COLORS,
} from '@/features/chat/model/chatTheme';
import { playPresetSelectSound, playToggleSound } from '@/shared/lib/themeSoundFx';
import { preloadTextTabFonts } from '@/features/chat/lib/fontLoader';

export function TypographySection() {
  useEffect(() => {
    preloadTextTabFonts();
  }, []);
  const appFontId = useThemeStore((s) => s.appFontId);
  const appFontScope = useThemeStore((s) => s.appFontScope);
  const appTextEffect = useThemeStore((s) => s.appTextEffect);
  const appTextColor = useThemeStore((s) => s.appTextColor);
  const soundFxEnabled = useThemeStore((s) => s.soundFxEnabled);

  const setAppFontId = useThemeStore((s) => s.setAppFontId);
  const setAppFontScope = useThemeStore((s) => s.setAppFontScope);
  const setAppTextEffect = useThemeStore((s) => s.setAppTextEffect);
  const setAppTextColor = useThemeStore((s) => s.setAppTextColor);
  const resetAppTypography = useThemeStore((s) => s.resetAppTypography);

  const [hoveredFont, setHoveredFont] = useState<string | null>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);

  const selectedFont = CHAT_FONTS.find((f) => f.id === appFontId) || CHAT_FONTS[0];

  const handleSelectScope = (scope: AppFontScope) => {
    if (soundFxEnabled) playToggleSound();
    setAppFontScope(scope);
  };

  const handleSelectFont = (fontId: string) => {
    if (soundFxEnabled) playPresetSelectSound();
    setAppFontId(fontId);
    // If user selects a font while scope is 'none', automatically switch to 'headings' as recommended default
    if (appFontScope === 'none') {
      setAppFontScope('headings');
    }
  };

  const handleSelectEffect = (effectId: string) => {
    if (soundFxEnabled) playToggleSound();
    setAppTextEffect(effectId);
    if (appFontScope === 'none') {
      setAppFontScope('headings');
    }
  };

  const handleSelectColor = (color: string) => {
    if (soundFxEnabled) playToggleSound();
    setAppTextColor(color);
  };

  const handleResetTypography = () => {
    if (soundFxEnabled) playToggleSound();
    resetAppTypography();
  };

  const scopeOptions: {
    id: AppFontScope;
    title: string;
    description: string;
    icon: typeof Heading;
  }[] = [
    {
      id: 'headings',
      title: 'Headings & Titles only',
      description: 'Headers, tabs, modal windows, and usernames',
      icon: Heading,
    },
    {
      id: 'all',
      title: 'Apply to everything',
      description: 'Entire website interface and posts (chats keep their own themes)',
      icon: Globe,
    },
    {
      id: 'none',
      title: 'Do not apply',
      description: 'Default system font without customization',
      icon: Ban,
    },
  ];

  return (
    <div className="flex flex-col gap-6 pt-6 border-t border-black/10 dark:border-white/[0.06]">
      {/* Header with Title and Reset Button */}
      <div className="flex items-center justify-between border-b border-black/10 dark:border-white/[0.06] pb-3.5">
        <div className="flex flex-col">
          <h3 className="text-xl font-bold flex items-center gap-2 text-gray-950 dark:text-white">
            <Type size={20} className="text-cyan-600 dark:text-cyan-400" />
            Typography & Text Styling
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Choose fonts, visual effects, and color accents with styles from chat themes
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetTypography}
          title="Reset typography settings"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.07] dark:hover:bg-white/[0.07] text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white text-xs font-medium border border-black/10 dark:border-white/10 transition cursor-pointer"
        >
          <RotateCcw size={13} />
          <span className="hidden sm:inline">Reset font</span>
        </button>
      </div>

      {/* 1. Scope Selector */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={14} className="text-purple-500" />
          Font Application Scope
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {scopeOptions.map((opt) => {
            const isSelected = appFontScope === opt.id;
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectScope(opt.id)}
                className={`relative p-4 rounded-2xl flex flex-col justify-between text-left transition-all duration-200 border cursor-pointer outline-none h-full ${
                  isSelected
                    ? 'bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/40'
                    : 'bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] border-black/10 dark:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Icon size={16} />
                  </div>

                  {/* Radio Indicator */}
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-black/25 dark:border-white/25'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-gray-950 dark:text-white">
                    {opt.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Preview Card (Message Preview Style) */}
      <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-800 dark:text-gray-300">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-gray-500 dark:text-gray-400">
            <Sparkles size={13} className="text-purple-500" />
            Message Preview
          </span>
          <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
            {selectedFont.name}
          </span>
        </div>

        {/* Chat Message Preview */}
        <div className="p-3.5 rounded-xl bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
            NA
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span
                style={{
                  fontFamily: appFontScope !== 'none' ? selectedFont.fontFamily : undefined,
                  color:
                    appFontScope !== 'none' && appTextColor !== 'auto' ? appTextColor : undefined,
                }}
                className={`text-sm font-bold text-gray-950 dark:text-white ${
                  appFontScope !== 'none' && appTextEffect && appTextEffect !== 'minimal'
                    ? `msg-effect-${appTextEffect}`
                    : ''
                }`}
              >
                Nikolaj Agh
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">today at 5:14 PM</span>
            </div>

            <p
              style={{
                fontFamily: appFontScope === 'all' ? selectedFont.fontFamily : undefined,
                color: appFontScope === 'all' && appTextColor !== 'auto' ? appTextColor : undefined,
              }}
              className={`text-xs mt-1 leading-relaxed ${
                appFontScope === 'all' && appTextEffect && appTextEffect !== 'minimal'
                  ? `msg-effect-${appTextEffect}`
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              Hey! This is how text renders across the interface. The quick brown fox jumps over the
              lazy dog.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Font Grid (13 Fonts including Minecraft) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            Font Collection ({CHAT_FONTS.length})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {CHAT_FONTS.map((font) => {
            const isSelected = appFontId === font.id;
            const isHovered = hoveredFont === font.id;
            return (
              <div key={font.id} className="relative">
                <button
                  type="button"
                  onClick={() => handleSelectFont(font.id)}
                  onMouseEnter={() => setHoveredFont(font.id)}
                  onMouseLeave={() => setHoveredFont(null)}
                  className={`w-full aspect-[1.25/1] rounded-2xl flex flex-col items-center justify-center transition-all duration-150 relative cursor-pointer border ${
                    isSelected
                      ? 'bg-[#1e1f29] dark:bg-[#1e1f29] border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.35)] ring-1 ring-indigo-500/50'
                      : 'bg-black/[0.03] dark:bg-[#181922] hover:bg-black/[0.06] dark:hover:bg-[#20222e] border-black/10 dark:border-white/10'
                  }`}
                  title={font.name}
                >
                  {/* Selected Indicator Dot */}
                  {isSelected && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]" />
                  )}

                  {/* Font Sample Text (Gg) */}
                  <span
                    style={{
                      fontFamily: font.fontFamily,
                      fontSize: font.scale ? `${font.scale * 1.55}rem` : '1.55rem',
                      lineHeight: 1,
                    }}
                    className={`font-bold select-none tracking-tight mb-1.5 ${
                      isSelected
                        ? 'text-white'
                        : 'text-gray-900 dark:text-white group-hover:text-indigo-500'
                    }`}
                  >
                    {font.sampleText || 'Gg'}
                  </span>

                  {/* Font Label */}
                  <span
                    className={`text-[11px] font-medium truncate max-w-[90%] px-1 ${
                      isSelected
                        ? 'text-indigo-300 font-semibold'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {font.name}
                  </span>
                </button>

                {/* Tooltip on Hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 2, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="absolute z-30 bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#111216] border border-white/10 text-white text-[11px] font-medium whitespace-nowrap shadow-2xl pointer-events-none"
                    >
                      {font.name}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#111216]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Text Effect Selection (Minimal, Gradient, Neon, Cartoon, Accent, Gummy, Prisma) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            Text Effects
          </span>
          <button
            type="button"
            onClick={() => handleSelectEffect('minimal')}
            title="Reset effect"
            className="p-1 text-gray-500 hover:text-gray-950 dark:hover:text-white rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1 text-xs cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Default</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {CHAT_TEXT_EFFECTS.map((effect) => {
            const isSelected = (appTextEffect || 'minimal') === effect.id;
            return (
              <button
                key={effect.id}
                type="button"
                onClick={() => handleSelectEffect(effect.id)}
                className={`h-12 rounded-2xl flex items-center justify-center px-3 py-1 transition-all duration-150 text-center cursor-pointer border ${
                  isSelected
                    ? 'bg-[#1e1f29] dark:bg-[#1e1f29] border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.35)] ring-1 ring-indigo-500/50'
                    : 'bg-black/[0.03] dark:bg-[#181922] hover:bg-black/[0.06] dark:hover:bg-[#20222e] border-black/10 dark:border-white/10'
                }`}
                title={effect.name}
              >
                <span
                  className={`text-xs font-bold truncate max-w-full select-none ${
                    effect.id === 'gradient'
                      ? 'msg-effect-gradient font-extrabold'
                      : effect.id === 'neon'
                        ? 'msg-effect-neon font-extrabold text-purple-300'
                        : effect.id === 'cartoon'
                          ? 'msg-effect-cartoon text-pink-400 font-extrabold'
                          : effect.id === 'highlight'
                            ? 'msg-effect-highlight text-emerald-400 font-bold'
                            : effect.id === 'gummy'
                              ? 'msg-effect-gummy text-pink-300 font-extrabold'
                              : effect.id === 'prism'
                                ? 'msg-effect-prism text-white font-bold'
                                : 'text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {effect.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Text Color Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            Text Color Selection
          </span>
          <button
            type="button"
            onClick={() => handleSelectColor('auto')}
            title="Reset color (Auto)"
            className="p-1 text-gray-500 hover:text-gray-950 dark:hover:text-white rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1 text-xs cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Auto contrast</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Color Preview Block */}
          <div
            className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center shadow-md border border-black/10 dark:border-white/10 relative overflow-hidden"
            style={{
              backgroundColor: appTextColor && appTextColor !== 'auto' ? appTextColor : '#ec4899',
            }}
          >
            {(!appTextColor || appTextColor === 'auto') && (
              <div className="absolute inset-0 bg-linear-to-tr from-gray-900 to-gray-500 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  Auto
                </span>
              </div>
            )}
          </div>

          {/* Custom Color Picker Button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                if (soundFxEnabled) playToggleSound();
                colorPickerRef.current?.click();
              }}
              className="w-12 h-12 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md border border-red-400/40 transition active:scale-95 cursor-pointer"
              title="Choose custom color"
            >
              <Pencil size={18} className="stroke-[2.5]" />
            </button>
            <input
              ref={colorPickerRef}
              type="color"
              value={appTextColor && appTextColor !== 'auto' ? appTextColor : '#ec4899'}
              onChange={(e) => handleSelectColor(e.target.value)}
              className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
            />
          </div>

          {/* Quick Swatches Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar">
            {DISCORD_TEXT_COLORS.map((swatch) => {
              const isAuto = swatch.color === 'auto';
              const isSelected = (!appTextColor && isAuto) || appTextColor === swatch.color;
              return (
                <button
                  key={swatch.name}
                  type="button"
                  onClick={() => handleSelectColor(swatch.color)}
                  className={`relative w-8 h-8 rounded-xl shrink-0 transition-transform active:scale-90 border cursor-pointer ${
                    isSelected
                      ? 'border-white ring-2 ring-indigo-500 scale-105 shadow-md'
                      : 'border-black/10 dark:border-white/10 hover:border-white/40 hover:scale-105'
                  }`}
                  style={{ backgroundColor: isAuto ? '#181926' : swatch.color }}
                  title={swatch.name}
                >
                  {isAuto && (
                    <span className="text-[8px] font-bold text-gray-300 block text-center leading-none">
                      A
                    </span>
                  )}
                  {isSelected && !isAuto && (
                    <Check
                      size={13}
                      className="absolute inset-0 m-auto text-white drop-shadow stroke-3"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
