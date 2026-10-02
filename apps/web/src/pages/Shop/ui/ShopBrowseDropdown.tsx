import React, { useRef, useEffect } from 'react';
import type { ShopCategory } from '../types';
import { useThemeStore } from '@/shared/model/useThemeStore';

interface ShopBrowseDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: ShopCategory | null;
  onSelectCategory: (category: ShopCategory) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const BROWSE_OPTIONS: { category: ShopCategory; description: string }[] = [
  {
    category: 'Avatar Decorations',
    description: 'Hats, halos, horns & animated headpieces',
  },
  {
    category: 'Nameplates',
    description: 'Custom stylized name banners & textures',
  },
  {
    category: 'Profile Effects',
    description: 'Full-card particle storms & auras',
  },
  {
    category: 'Profile Frames',
    description: 'Animated rings & borders around your avatar',
  },
  {
    category: 'Bundles',
    description: 'Value packs with matching sets at a discount',
  },
  {
    category: 'Shop All',
    description: 'Browse every cosmetic in the catalog',
  },
];

export const ShopBrowseDropdown: React.FC<ShopBrowseDropdownProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory,
  onMouseEnter,
  onMouseLeave,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const accentColor = useThemeStore((s) => s.accentColor);
  const solidTheme = useThemeStore((s) => s.solidTheme);
  const isLight = solidTheme === 'light';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute top-full left-0 pt-2 z-[100] animate-slideDownDropdown"
      style={{ minWidth: '240px' }}
    >
      <div
        className="w-full rounded-2xl p-1.5 border shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
        style={{
          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(18, 16, 26, 0.96)',
          borderColor: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="flex flex-col gap-0.5">
          {BROWSE_OPTIONS.map(({ category, description }) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  onSelectCategory(category);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/8 hover:text-gray-950 dark:hover:text-white'
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: `${accentColor}25`,
                        color: accentColor,
                      }
                    : {}
                }
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="whitespace-nowrap leading-tight">{category}</div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-400 truncate font-normal mt-0.5">
                    {description}
                  </div>
                </div>
                {isSelected && (
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: accentColor,
                      boxShadow: `0 0 8px ${accentColor}`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
