import {
  Check,
  Swords,
  Gamepad2,
  Heart,
  Orbit,
  Wand2,
  Moon,
  Leaf,
  PawPrint,
  RotateCcw,
} from 'lucide-react';
import type { ShopItemCategory, ShopItemColor, ShopItemTheme } from '../data/allShopItems';
import Tooltip from '@/shared/ui/Tooltip';
import { isCurrentThemeLight, useThemeStore } from '@/shared/model/useThemeStore';

export type BrowseFilterCategory = ShopItemCategory;

export interface ShopBrowseFilterState {
  showOnly: Set<BrowseFilterCategory>;
  color: ShopItemColor | null;
  theme: ShopItemTheme | null;
}

interface ShopBrowseFilterSidebarProps {
  filters: ShopBrowseFilterState;
  onChange: (next: ShopBrowseFilterState) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

const CATEGORY_OPTIONS: { id: BrowseFilterCategory; label: string }[] = [
  { id: 'avatar', label: 'Avatar Decorations' },
  { id: 'nameplate', label: 'Nameplates' },
  { id: 'effect', label: 'Profile Effects' },
  { id: 'frame', label: 'Profile Frames' },
  { id: 'bundle', label: 'Bundles' },
];

const COLOR_OPTIONS: { id: ShopItemColor; name: string; hex: string; borderHex?: string }[] = [
  { id: 'purple', name: 'Purple', hex: '#8b5cf6' },
  { id: 'blue', name: 'Blue', hex: '#38bdf8' },
  { id: 'green', name: 'Green', hex: '#22c55e' },
  { id: 'yellow', name: 'Yellow', hex: '#eab308' },
  { id: 'orange', name: 'Orange', hex: '#f97316' },
  { id: 'red', name: 'Red', hex: '#ef4444' },
  { id: 'pink', name: 'Pink', hex: '#ec4899' },
  { id: 'white', name: 'White', hex: '#ffffff', borderHex: 'rgba(0,0,0,0.2)' },
  { id: 'black', name: 'Black', hex: '#18181b', borderHex: 'rgba(255,255,255,0.2)' },
];

const THEME_OPTIONS: {
  id: ShopItemTheme;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: 'Anime', label: 'Anime', icon: Swords },
  { id: 'Gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'Cute & Cozy', label: 'Cute & Cozy', icon: Heart },
  { id: 'Sci-Fi', label: 'Sci-Fi', icon: Orbit },
  { id: 'Fantasy', label: 'Fantasy', icon: Wand2 },
  { id: 'Dark & Moody', label: 'Dark & Moody', icon: Moon },
  { id: 'Nature', label: 'Nature', icon: Leaf },
  { id: 'Animals & Pets', label: 'Animals & Pets', icon: PawPrint },
];

export function ShopBrowseFilterSidebar({
  filters,
  onChange,
  onClear,
  hasActiveFilters,
}: ShopBrowseFilterSidebarProps) {
  const isLight = useThemeStore(isCurrentThemeLight);

  const toggleCategory = (cat: BrowseFilterCategory) => {
    const next = new Set(filters.showOnly);
    if (next.has(cat)) {
      next.delete(cat);
    } else {
      next.add(cat);
    }
    onChange({ ...filters, showOnly: next });
  };

  const toggleColor = (col: ShopItemColor) => {
    onChange({
      ...filters,
      color: filters.color === col ? null : col,
    });
  };

  const toggleTheme = (thm: ShopItemTheme) => {
    onChange({
      ...filters,
      theme: filters.theme === thm ? null : thm,
    });
  };

  return (
    <aside
      aria-label="Catalog filters"
      className="w-64 shrink-0 sticky top-4 self-start max-h-[calc(100vh-6.5rem)] overflow-y-auto custom-scrollbar overscroll-contain rounded-2xl glass-card border border-black/10 dark:border-white/10 p-4 sm:p-5 pb-6 select-none transition-all duration-200 shadow-xl backdrop-blur-2xl text-gray-900 dark:text-white"
    >
      {/* 1. Show only checkboxes */}
      <div>
        <h3
          className={
            'text-xs font-bold tracking-wider uppercase mb-3 ' +
            (isLight ? 'text-zinc-600' : 'text-white/60')
          }
        >
          Show only
        </h3>
        <div className="space-y-2">
          {CATEGORY_OPTIONS.map((opt) => {
            const isChecked = filters.showOnly.has(opt.id);
            return (
              <label
                key={opt.id}
                onClick={(e) => {
                  e.preventDefault();
                  toggleCategory(opt.id);
                }}
                className={
                  'flex items-center gap-2.5 py-1 text-sm font-medium cursor-pointer transition-colors ' +
                  (isChecked
                    ? isLight
                      ? 'text-zinc-900 font-semibold'
                      : 'text-white font-semibold'
                    : isLight
                      ? 'text-zinc-600 hover:text-zinc-900'
                      : 'text-white/70 hover:text-white')
                }
              >
                {/* Custom Brand Purple Checkbox */}
                <div
                  className={
                    'w-5 h-5 rounded-md flex items-center justify-center border transition-all ' +
                    (isChecked
                      ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white shadow-sm shadow-purple-500/25'
                      : isLight
                        ? 'border-black/30 hover:border-black/50 bg-black/[0.03]'
                        : 'border-white/20 hover:border-white/40 bg-white/[0.06]')
                  }
                >
                  {isChecked && <Check size={14} strokeWidth={3} className="text-white" />}
                </div>
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 2. Color Palette (NO BROWN) */}
      <div className="mt-6 pt-5 border-t border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3
            className={
              'text-xs font-bold tracking-wider uppercase ' +
              (isLight ? 'text-zinc-600' : 'text-white/60')
            }
          >
            Color
          </h3>
          {filters.color && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, color: null })}
              className="text-[11px] text-[#8b5cf6] hover:underline cursor-pointer font-medium"
            >
              Reset
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {COLOR_OPTIONS.map((c) => {
            const isSelected = filters.color === c.id;
            return (
              <Tooltip key={c.id} label={c.name} position="top">
                <button
                  type="button"
                  aria-label={`Color ${c.name}`}
                  aria-pressed={isSelected}
                  onClick={() => toggleColor(c.id)}
                  style={{
                    backgroundColor: c.hex,
                    borderColor: c.borderHex || 'transparent',
                  }}
                  className={
                    'relative w-7 h-7 rounded-full cursor-pointer transition-all border flex items-center justify-center ' +
                    (isSelected
                      ? 'scale-110 ring-2 ring-offset-2 ' +
                        (isLight
                          ? 'ring-[#8b5cf6] ring-offset-white'
                          : 'ring-[#8b5cf6] ring-offset-zinc-900')
                      : 'hover:scale-105 opacity-90 hover:opacity-100')
                  }
                >
                  {isSelected && (
                    <Check
                      size={14}
                      strokeWidth={3}
                      className={
                        c.id === 'white' || c.id === 'yellow' ? 'text-black' : 'text-white'
                      }
                    />
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* 3. Themes */}
      <div className="mt-6 pt-5 border-t border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3
            className={
              'text-xs font-bold tracking-wider uppercase ' +
              (isLight ? 'text-zinc-600' : 'text-white/60')
            }
          >
            Themes
          </h3>
          {filters.theme && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, theme: null })}
              className="text-[11px] text-[#8b5cf6] hover:underline cursor-pointer font-medium"
            >
              Reset
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {THEME_OPTIONS.map((thm) => {
            const isSelected = filters.theme === thm.id;
            const Icon = thm.icon;
            return (
              <button
                key={thm.id}
                type="button"
                onClick={() => toggleTheme(thm.id)}
                aria-pressed={isSelected}
                className={
                  'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left truncate cursor-pointer ' +
                  (isSelected
                    ? 'bg-[#8b5cf6] text-white shadow-md shadow-purple-500/25 font-bold'
                    : 'bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-gray-800 dark:text-white/80 hover:text-gray-950 dark:hover:text-white')
                }
              >
                <Icon size={14} className="shrink-0" />
                <span className="truncate">{thm.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Clear all filters button */}
      <div className="mt-6 pt-5 pb-2 border-t border-white/5">
        <button
          type="button"
          onClick={onClear}
          disabled={!hasActiveFilters}
          className={
            'w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ' +
            (hasActiveFilters
              ? isLight
                ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-md shadow-purple-500/25 active:scale-[0.98]'
                : 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-md shadow-purple-500/25 active:scale-[0.98]'
              : isLight
                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                : 'bg-white/5 text-white/30 cursor-not-allowed')
          }
        >
          <RotateCcw size={13} />
          <span>Clear all filters</span>
        </button>
      </div>
    </aside>
  );
}
