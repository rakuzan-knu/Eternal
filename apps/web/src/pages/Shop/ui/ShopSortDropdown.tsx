import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { isCurrentThemeLight, useThemeStore } from '@/shared/model/useThemeStore';

export type ShopSortOption = 'popular' | 'newest' | 'price-asc' | 'price-desc';

interface ShopSortDropdownProps {
  value: ShopSortOption;
  onChange: (value: ShopSortOption) => void;
}

const SORT_OPTIONS: { id: ShopSortOption; label: string }[] = [
  { id: 'popular', label: 'Popular' },
  { id: 'newest', label: 'Recently Added' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
];

export function ShopSortDropdown({ value, onChange }: ShopSortDropdownProps) {
  const isLight = useThemeStore(isCurrentThemeLight);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLabel = SORT_OPTIONS.find((o) => o.id === value)?.label ?? 'Popular';

  return (
    <div className="relative inline-flex items-center gap-2" ref={containerRef}>
      <span
        className={
          'text-xs font-semibold select-none ' + (isLight ? 'text-zinc-600' : 'text-white/60')
        }
      >
        Sort by
      </span>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/15 bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-gray-900 dark:text-white text-xs font-semibold cursor-pointer transition-colors min-w-[130px] backdrop-blur-xl shadow-xs"
      >
        <span>{activeLabel}</span>
        <ChevronDown
          size={14}
          className={'transition-transform duration-200 ' + (open ? 'rotate-180' : 'rotate-0')}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1.5 w-48 rounded-xl glass-menu border border-black/10 dark:border-white/15 shadow-2xl p-1.5 z-40 text-gray-900 dark:text-white animate-in fade-in zoom-in-95"
        >
          {SORT_OPTIONS.map((opt) => {
            const isSelected = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={
                  'w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg font-medium transition-colors cursor-pointer text-left ' +
                  (isSelected
                    ? isLight
                      ? 'bg-black/10 text-zinc-900 font-bold'
                      : 'bg-white/15 text-white font-semibold'
                    : isLight
                      ? 'text-zinc-700 hover:bg-black/5 hover:text-zinc-900'
                      : 'text-white/80 hover:bg-white/10 hover:text-white')
                }
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={14} className="shrink-0 text-[#8b5cf6]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
