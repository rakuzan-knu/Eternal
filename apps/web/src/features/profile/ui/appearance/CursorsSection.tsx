import React, { useState } from 'react';
import {
  MousePointer2,
  Sparkles,
  RotateCcw,
  Check,
  Target,
  Sliders,
  Zap,
  Activity,
} from 'lucide-react';
import {
  CURSOR_PRESETS,
  generateCursorSvg,
  getPresetPreviewImage,
  type CursorPreset,
} from '@/shared/lib/cursorEngine';
import { useThemeStore, type CursorSize } from '@/shared/model/useThemeStore';
import { playPresetSelectSound, playToggleSound } from '@/shared/lib/themeSoundFx';

export function CursorsSection() {
  const customCursorEnabled = useThemeStore((s) => s.customCursorEnabled);
  const customCursorId = useThemeStore((s) => s.customCursorId);
  const customCursorVariant = useThemeStore((s) => s.customCursorVariant);
  const customCursorSize = useThemeStore((s) => s.customCursorSize);
  const cursorVfxEnabled = useThemeStore((s) => s.cursorVfxEnabled);
  const cursorVfxTrail = useThemeStore((s) => s.cursorVfxTrail);
  const cursorVfxClick = useThemeStore((s) => s.cursorVfxClick);
  const soundFxEnabled = useThemeStore((s) => s.soundFxEnabled);

  const setCustomCursorEnabled = useThemeStore((s) => s.setCustomCursorEnabled);
  const setCustomCursor = useThemeStore((s) => s.setCustomCursor);
  const setCustomCursorSize = useThemeStore((s) => s.setCustomCursorSize);
  const setCursorVfxEnabled = useThemeStore((s) => s.setCursorVfxEnabled);
  const setCursorVfxSetting = useThemeStore((s) => s.setCursorVfxSetting);
  const resetCustomCursor = useThemeStore((s) => s.resetCustomCursor);

  // Local state for hover preview simulation inside the cards
  const [hoveredPresetId, setHoveredPresetId] = useState<string | null>(null);

  // Playground interactive test state
  const [clickCount, setClickCount] = useState(0);
  const [testSliderVal, setTestSliderVal] = useState(65);
  const [sampleText, setSampleText] = useState(
    'Type or highlight text here to test the I-beam cursor',
  );

  const handleToggleMaster = () => {
    if (soundFxEnabled) playToggleSound();
    setCustomCursorEnabled(!customCursorEnabled);
  };

  const handleSelectPreset = (preset: CursorPreset) => {
    if (soundFxEnabled) playPresetSelectSound();
    setCustomCursor(preset.id);
  };

  const handleSelectVariant = (presetId: string, variantId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (soundFxEnabled) playPresetSelectSound();
    setCustomCursor(presetId, variantId);
  };

  const handleSizeChange = (size: CursorSize) => {
    if (soundFxEnabled) playToggleSound();
    setCustomCursorSize(size);
  };

  const handleToggleVfxMaster = () => {
    if (soundFxEnabled) playToggleSound();
    const next = !cursorVfxEnabled;
    setCursorVfxEnabled(next);
    if (next && !customCursorEnabled) {
      setCustomCursorEnabled(true);
    }
  };

  const handleToggleVfxSub = (key: 'trail' | 'click') => {
    if (soundFxEnabled) playToggleSound();
    const current = key === 'trail' ? cursorVfxTrail : cursorVfxClick;
    setCursorVfxSetting(key, !current);
  };

  const handleReset = () => {
    if (soundFxEnabled) playToggleSound();
    resetCustomCursor();
  };

  const getVariantLabel = (presetId: string) => {
    switch (presetId) {
      case 'minecraft-sword':
      case 'minecraft-pickaxe':
      case 'minecraft-axe':
        return 'Material:';
      case 'dota2':
        return 'Dota 2 Style:';
      case 'pixel-3d':
        return '3D Style:';
      case 'katana':
        return 'Tsukamaki Wrap:';
      case 'cyberpunk-crosshair':
        return 'HUD Color:';
      case 'magic-wand':
        return 'Element:';
      default:
        return 'Style:';
    }
  };

  return (
    <div
      id="sec-cursors"
      className="flex flex-col gap-6 pt-4 border-t border-black/10 dark:border-white/[0.06]"
    >
      {/* Section Header with Minimalist Master Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 dark:border-white/[0.06] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-500/10 dark:bg-violet-400/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
            <MousePointer2 size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-950 dark:text-white">
              Cursor Style
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Iconic cursors from Minecraft, Dota 2, 3D Pixel, and Katana
            </p>
          </div>
        </div>

        {/* Minimalist Switch */}
        <div
          onClick={handleToggleMaster}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-950 dark:group-hover:text-white transition-colors">
            {customCursorEnabled ? 'Enabled' : 'Disabled'}
          </span>
          <button
            type="button"
            role="switch"
            aria-label="Enable custom cursor"
            aria-checked={customCursorEnabled}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleMaster();
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
              customCursorEnabled ? 'bg-violet-600' : 'bg-black/15 dark:bg-white/15'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                customCursorEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Size Selector Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
          <Sliders size={15} className="text-violet-500" />
          <span>Cursor size:</span>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
          <button
            type="button"
            onClick={() => handleSizeChange('normal')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              customCursorSize === 'normal'
                ? 'bg-violet-600 text-white shadow-sm font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
            }`}
          >
            Normal (32px)
          </button>
          <button
            type="button"
            onClick={() => handleSizeChange('large')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              customCursorSize === 'large'
                ? 'bg-violet-600 text-white shadow-sm font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
            }`}
          >
            Large (44px)
          </button>
        </div>
      </div>

      {/* Cursors Grid (Interactive Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {CURSOR_PRESETS.map((preset) => {
          const isSelected = customCursorEnabled && customCursorId === preset.id;
          const isHovered = hoveredPresetId === preset.id;

          // Resolve active variant for this card
          const currentVariantId = isSelected
            ? customCursorVariant || preset.defaultVariant
            : preset.defaultVariant;

          const activeVariant =
            preset.variants.find((v) => v.id === currentVariantId) || preset.variants[0];

          // Check if this preset has an authentic preview image (Minecraft, Dota 2)
          const previewImg = getPresetPreviewImage(preset.id, activeVariant.id, isHovered);

          // Generate fallback/vector SVG preview string (56px for clean display)
          const previewSvg = generateCursorSvg(preset.id, activeVariant.id, 'default', 56);

          return (
            <div
              key={preset.id}
              role="button"
              tabIndex={0}
              title={preset.name}
              onClick={() => handleSelectPreset(preset)}
              onMouseEnter={() => setHoveredPresetId(preset.id)}
              onMouseLeave={() => setHoveredPresetId(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectPreset(preset);
                }
              }}
              className={`group relative flex flex-col p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none text-left ${
                isSelected
                  ? 'bg-black/[0.04] dark:bg-white/[0.05] border-violet-500 dark:border-violet-400 shadow-[0_0_20px_-4px_rgba(139,92,246,0.3)] ring-1 ring-violet-500'
                  : 'bg-black/[0.015] dark:bg-white/[0.02] border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
              }`}
            >
              {/* Central Preview Cube */}
              <div
                className="relative w-full h-28 rounded-xl flex items-center justify-center overflow-hidden border border-black/5 dark:border-white/5 transition-all duration-300"
                style={{
                  background: `radial-gradient(circle at center, ${
                    activeVariant.glowColor || 'rgba(139,92,246,0.15)'
                  } 0%, rgba(0,0,0,0.02) 75%)`,
                }}
              >
                {/* Subtle grid pattern in cube */}
                <div
                  className="absolute inset-0 opacity-[0.08] dark:opacity-[0.15] pointer-events-none"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
                    backgroundSize: '12px 12px',
                  }}
                />

                {/* Rendered Authentic Pixel Art Image or Crisp Vector SVG */}
                {previewImg ? (
                  <img
                    src={previewImg}
                    alt={preset.name}
                    className="relative z-10 w-16 h-16 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)] [image-rendering:pixelated] select-none pointer-events-none"
                  />
                ) : (
                  <div
                    className="relative z-10 drop-shadow-md select-none pointer-events-none"
                    dangerouslySetInnerHTML={{ __html: previewSvg }}
                  />
                )}
              </div>

              {/* Title & Selected Checkmark */}
              <div className="mt-3 flex items-center justify-between">
                <h4 className="font-semibold text-sm text-gray-950 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {preset.name}
                </h4>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-xs">
                    <Check size={11} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Variants / Materials Selector */}
              <div className="mt-2.5 pt-2.5 border-t border-black/5 dark:border-white/5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 dark:text-gray-400">
                    {getVariantLabel(preset.id)}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    {activeVariant.name}
                  </span>
                </div>

                {/* Clean Horizontal Color Swatches */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {preset.variants.map((v) => {
                    const isVarActive = activeVariant.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        title={v.name}
                        onClick={(e) => handleSelectVariant(preset.id, v.id, e)}
                        className={`relative w-5 h-5 rounded-full transition-all duration-150 cursor-pointer flex items-center justify-center ${
                          isVarActive
                            ? 'ring-2 ring-violet-500 dark:ring-violet-400 ring-offset-2 ring-offset-white dark:ring-offset-[#17181c] scale-110 shadow-xs'
                            : 'opacity-70 hover:opacity-100 hover:scale-110'
                        }`}
                        style={{ backgroundColor: v.color }}
                      >
                        {isVarActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cursor Animations & VFX Drawer (Smoothly expandable) */}
      <div className="flex flex-col rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 overflow-hidden transition-all duration-300">
        {/* Header with Master Switch */}
        <div
          onClick={handleToggleVfxMaster}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 cursor-pointer select-none group hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl border transition-colors ${
                cursorVfxEnabled
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-black/5 dark:bg-white/5 text-gray-500 border-black/5 dark:border-white/5'
              }`}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-950 dark:text-white group-hover:text-amber-500 transition-colors">
                Cursor Animations (VFX)
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Motion trails and particle bursts on click
              </p>
            </div>
          </div>

          {/* Master VFX Toggle Switch */}
          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <button
              type="button"
              role="switch"
              aria-label="Enable cursor animations"
              aria-checked={cursorVfxEnabled}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleVfxMaster();
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                cursorVfxEnabled ? 'bg-amber-500' : 'bg-black/15 dark:bg-white/15'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  cursorVfxEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Smooth CSS Grid Accordion Drawer */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            cursorVfxEnabled
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-4 pt-0 border-t border-black/5 dark:border-white/5 flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Sub-toggle 1: Click Impacts */}
                <div
                  onClick={() => handleToggleVfxSub('click')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 select-none ${
                    cursorVfxClick
                      ? 'bg-amber-500/10 border-amber-500/40 text-gray-950 dark:text-white shadow-xs ring-1 ring-amber-500/20'
                      : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 hover:border-black/15 dark:hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-lg ${
                          cursorVfxClick
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-black/5 dark:bg-white/5 text-gray-400'
                        }`}
                      >
                        <Zap size={14} />
                      </div>
                      <span className="text-xs font-bold">Click Impact</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={cursorVfxClick}
                      onChange={() => handleToggleVfxSub('click')}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                    Critical sword stars, 3D pixel scatter, and katana slash
                  </p>
                </div>

                {/* Sub-toggle 2: Cursor Trails */}
                <div
                  onClick={() => handleToggleVfxSub('trail')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 select-none ${
                    cursorVfxTrail
                      ? 'bg-amber-500/10 border-amber-500/40 text-gray-950 dark:text-white shadow-xs ring-1 ring-amber-500/20'
                      : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 hover:border-black/15 dark:hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-lg ${
                          cursorVfxTrail
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-black/5 dark:bg-white/5 text-gray-400'
                        }`}
                      >
                        <Activity size={14} />
                      </div>
                      <span className="text-xs font-bold">Cursor Trail</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={cursorVfxTrail}
                      onChange={() => handleToggleVfxSub('trail')}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                    Smooth stardust trail and weapon sparks while moving
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cursor Playground Sandbox */}
      <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-violet-500" />
            <h4 className="text-sm font-semibold text-gray-950 dark:text-white">
              Cursor Playground
            </h4>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
            Test all cursor states and visual feedback
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Interactive Button */}
          <button
            type="button"
            onClick={() => {
              if (soundFxEnabled) playToggleSound();
              setClickCount((c) => c + 1);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-xs active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles size={14} />
            <span>Test Click ({clickCount})</span>
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
            placeholder="Type something..."
          />

          {/* Range Slider */}
          <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
            <input
              type="range"
              min="0"
              max="100"
              value={testSliderVal}
              onChange={(e) => setTestSliderVal(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-grab active:cursor-grabbing accent-violet-500"
            />
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 min-w-[28px] text-right">
              {testSliderVal}%
            </span>
          </div>
        </div>

        {/* Text Selection Test */}
        <p className="text-xs text-gray-500 dark:text-gray-400 select-text leading-relaxed px-1">
          Select this text to test the I-beam text cursor. Click the button to inspect particle
          bursts.
        </p>
      </div>

      {/* Reset to System Cursor */}
      <div className="pt-2 flex justify-start">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.07] dark:hover:bg-white/[0.07] text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white text-xs font-medium border border-black/10 dark:border-white/10 transition-colors cursor-pointer"
        >
          <RotateCcw size={13} />
          <span>Reset to system cursor</span>
        </button>
      </div>
    </div>
  );
}
