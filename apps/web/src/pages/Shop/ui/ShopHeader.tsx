import React, { useState, useRef, useEffect } from 'react';
import { Store, ChevronDown, Search, Heart, X } from 'lucide-react';
import type { ShopTab, ShopCategory } from '../types';
import { ShopBrowseDropdown } from './ShopBrowseDropdown';
import { useThemeStore } from '@/shared/model/useThemeStore';

interface ShopHeaderProps {
  activeTab: ShopTab;
  onTabChange: (tab: ShopTab) => void;
  selectedCategory: ShopCategory | null;
  onSelectCategory: (category: ShopCategory) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  wishlistCount: number;
  isWishlistActive: boolean;
  onToggleWishlist: () => void;
  userBalance?: number;
  userOrbsBalance?: number;
}

export const ShopHeader: React.FC<ShopHeaderProps> = ({
  activeTab,
  onTabChange,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  wishlistCount,
  isWishlistActive,
  onToggleWishlist,
  userBalance = 0.0,
  userOrbsBalance,
}) => {
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [isGameShopsOpen, setIsGameShopsOpen] = useState(false);

  const browseLeaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameShopsLeaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const browseRef = useRef<HTMLDivElement>(null);
  const gameShopsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (browseRef.current && !browseRef.current.contains(target)) {
        setIsBrowseOpen(false);
      }
      if (gameShopsRef.current && !gameShopsRef.current.contains(target)) {
        setIsGameShopsOpen(false);
      }
    };
    if (isBrowseOpen || isGameShopsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBrowseOpen, isGameShopsOpen]);

  const accentColor = useThemeStore((s) => s.accentColor);
  const textOnAccent = useThemeStore((s) => s.textOnAccent);
  const solidTheme = useThemeStore((s) => s.solidTheme);
  const isLight = solidTheme === 'light';

  // Effective balance to display in USD ($0.00 default)
  const currentBalance =
    typeof userBalance === 'number' ? userBalance : userOrbsBalance ? userOrbsBalance / 100 : 0.0;

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Browse hover handlers with 180ms grace delay
  const handleBrowseEnter = () => {
    if (browseLeaveTimerRef.current) {
      clearTimeout(browseLeaveTimerRef.current);
      browseLeaveTimerRef.current = null;
    }
    setIsBrowseOpen(true);
    setIsGameShopsOpen(false);
  };

  const handleBrowseLeave = () => {
    browseLeaveTimerRef.current = setTimeout(() => {
      setIsBrowseOpen(false);
    }, 180);
  };

  // Game Shops hover handlers with 180ms grace delay
  const handleGameShopsEnter = () => {
    if (gameShopsLeaveTimerRef.current) {
      clearTimeout(gameShopsLeaveTimerRef.current);
      gameShopsLeaveTimerRef.current = null;
    }
    setIsGameShopsOpen(true);
    setIsBrowseOpen(false);
  };

  const handleGameShopsLeave = () => {
    gameShopsLeaveTimerRef.current = setTimeout(() => {
      setIsGameShopsOpen(false);
    }, 180);
  };

  // Mutually exclusive active state resolution
  const isGameShopsActive = isGameShopsOpen || (activeTab === 'Game Shops' && !isBrowseOpen);
  const isBrowseActive =
    !isGameShopsActive && (isBrowseOpen || (activeTab === 'Browse' && !isGameShopsOpen));
  const isFeaturedActive =
    !isGameShopsActive && !isBrowseActive && activeTab === 'Featured' && !isBrowseOpen;

  // Browse label: only shows specific category when active in Browse
  const browseLabel =
    activeTab === 'Browse' && selectedCategory && selectedCategory !== 'Shop All'
      ? selectedCategory
      : 'Browse';

  return (
    <header
      className="sticky top-0 z-50 w-full h-14 border-b backdrop-blur-2xl px-4 flex items-center justify-between gap-4 transition-colors select-none"
      style={{
        backgroundColor: isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(13, 11, 20, 0.82)',
        borderColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Left: Shop Icon & Main Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 relative h-full">
        {/* Store Brand Icon - Click to return to Featured */}
        <button
          type="button"
          onClick={() => {
            onTabChange('Featured');
            onSearchChange('');
            setIsBrowseOpen(false);
            setIsGameShopsOpen(false);
          }}
          className="flex items-center gap-2 pr-1.5 shrink-0 cursor-pointer"
          title="Back to Featured"
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform hover:scale-105"
            style={{
              backgroundColor: `${accentColor}20`,
              color: accentColor,
            }}
          >
            <Store size={18} />
          </div>
        </button>

        {/* Tab 1: Featured */}
        <div className="relative h-full flex items-center">
          <button
            type="button"
            onClick={() => {
              onTabChange('Featured');
              onSearchChange('');
              setIsBrowseOpen(false);
              setIsGameShopsOpen(false);
            }}
            className={`relative px-3 py-1.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              isFeaturedActive
                ? 'text-gray-950 dark:text-white font-bold'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            Featured
          </button>
          {isFeaturedActive && (
            <span
              className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-full transition-all duration-200"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 10px ${accentColor}`,
              }}
            />
          )}
        </div>

        {/* Tab 2: Browse (Hover & Click with smooth slide dropdown) */}
        <div
          ref={browseRef}
          className="relative h-full flex items-center"
          onMouseEnter={handleBrowseEnter}
          onMouseLeave={handleBrowseLeave}
        >
          <button
            type="button"
            onClick={() => {
              setIsBrowseOpen(true);
              setIsGameShopsOpen(false);
              onTabChange('Browse');
              onSearchChange('');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              isBrowseActive
                ? 'text-gray-950 dark:text-white font-bold'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <span>{browseLabel}</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isBrowseOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isBrowseActive && (
            <span
              className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-full transition-all duration-200"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 10px ${accentColor}`,
              }}
            />
          )}

          <ShopBrowseDropdown
            isOpen={isBrowseOpen}
            onClose={() => setIsBrowseOpen(false)}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => {
              onSelectCategory(cat);
              onTabChange('Browse');
              onSearchChange('');
            }}
            onMouseEnter={handleBrowseEnter}
            onMouseLeave={handleBrowseLeave}
          />
        </div>

        {/* Tab 3: Game Shops (Hover & Click with smooth slide dropdown - Displays 'Soon') */}
        <div
          ref={gameShopsRef}
          className="relative h-full flex items-center"
          onMouseEnter={handleGameShopsEnter}
          onMouseLeave={handleGameShopsLeave}
        >
          <button
            type="button"
            onClick={() => {
              setIsGameShopsOpen(true);
              setIsBrowseOpen(false);
              onTabChange('Game Shops');
              onSearchChange('');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              isGameShopsActive
                ? 'text-gray-950 dark:text-white font-bold'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <span>Game Shops</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isGameShopsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isGameShopsActive && (
            <span
              className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-full transition-all duration-200"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 10px ${accentColor}`,
              }}
            />
          )}

          {/* Smooth Slide-out Game Shops Menu: Displays 'Soon' */}
          {isGameShopsOpen && (
            <div
              className="absolute top-full left-0 pt-2 z-[100] animate-slideDownDropdown"
              style={{ minWidth: '190px' }}
            >
              <div
                className="w-full rounded-2xl py-6 px-4 border shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-2xl flex flex-col items-center justify-center text-center gap-2"
                style={{
                  backgroundColor: isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(18, 16, 26, 0.96)',
                  borderColor: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <div
                  className="px-3.5 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-xs select-none"
                  style={{
                    backgroundColor: `${accentColor}25`,
                    color: accentColor,
                    border: `1px solid ${accentColor}40`,
                  }}
                >
                  Soon
                </div>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium select-none">
                  Partnerships coming soon
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Search, Wishlist & USD Balance */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search the Shop"
            className="w-36 sm:w-56 h-8.5 pl-8 pr-8 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none transition-all duration-200"
            style={{
              borderColor: searchQuery ? `${accentColor}60` : undefined,
            }}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              title="Clear search"
            >
              <X size={12} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block absolute right-2.5 px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[9px] font-mono text-gray-400 pointer-events-none">
              Ctrl K
            </kbd>
          )}
        </div>

        {/* Wishlist Button (Heart) with Real Count */}
        <button
          type="button"
          onClick={onToggleWishlist}
          title={isWishlistActive ? 'Show all items' : 'View liked items'}
          className={`relative w-8.5 h-8.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            isWishlistActive
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/35 shadow-xs'
              : 'bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'
          }`}
        >
          <Heart size={16} className={isWishlistActive ? 'fill-rose-400' : ''} />
          {wishlistCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
              {wishlistCount > 99 ? '99+' : wishlistCount}
            </span>
          )}
        </button>

        {/* Realistic User Balance in USD ($0.00 default, clean status pill without modal) */}
        <div
          aria-label={`Your Eternal Wallet balance: $${currentBalance.toFixed(2)} USD`}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all shadow-xs select-none"
          style={{
            backgroundColor: `${accentColor}15`,
            borderColor: `${accentColor}35`,
            color: isLight ? '#111827' : '#ffffff',
          }}
          title={`Your Eternal Wallet balance: $${currentBalance.toFixed(2)} USD`}
        >
          <div
            className="w-4.5 h-4.5 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0"
            style={{
              backgroundColor: accentColor,
              color: textOnAccent,
            }}
          >
            $
          </div>
          <span className="text-xs font-black tracking-tight">${currentBalance.toFixed(2)}</span>
        </div>
      </div>
    </header>
  );
};

export default ShopHeader;
