import { useEffect, useRef, useState } from 'react';
import { Search, ChevronDown, Heart, X, Store } from 'lucide-react';
import Tooltip from '@/shared/ui/Tooltip';
import { isCurrentThemeLight, useThemeStore } from '@/shared/model/useThemeStore';
import { useWishlistStore } from '../model/useWishlistStore';

export type ShopCategoryTab =
  | 'featured'
  | 'avatars'
  | 'nameplates'
  | 'profile-effects'
  | 'profile-frames'
  | 'bundles'
  | 'all'
  | 'wishlist';

interface ShopNavbarProps {
  currentCategory: ShopCategoryTab;
  onSelectCategory: (tab: ShopCategoryTab) => void;
  search: string;
  onSearchChange: (query: string) => void;
}

export function ShopNavbar({
  currentCategory,
  onSelectCategory,
  search,
  onSearchChange,
}: ShopNavbarProps) {
  const isLight = useThemeStore(isCurrentThemeLight);
  const isGlass = useThemeStore((s) => s.isGlassmorphismEnabled);
  const glassOpacity = useThemeStore((s) => s.glassmorphismOpacity);

  const [browseOpen, setBrowseOpen] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const wishlistCount = useWishlistStore((s) => s.wishlistIds.length);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const balanceRef = useRef<HTMLDivElement>(null);
  const browseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBrowseOpen(false);
      }
      if (balanceRef.current && !balanceRef.current.contains(e.target as Node)) {
        setBalanceOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (browseTimeoutRef.current) clearTimeout(browseTimeoutRef.current);
    };
  }, []);

  // Smooth hover handlers for Browse button & dropdown
  const handleBrowseMouseEnter = () => {
    if (browseTimeoutRef.current) {
      clearTimeout(browseTimeoutRef.current);
      browseTimeoutRef.current = null;
    }
    setBrowseOpen(true);
  };

  const handleBrowseMouseLeave = () => {
    if (browseTimeoutRef.current) clearTimeout(browseTimeoutRef.current);
    browseTimeoutRef.current = setTimeout(() => {
      setBrowseOpen(false);
    }, 180);
  };

  const isBrowseActive = currentCategory !== 'featured';

  const browseOptions: { key: ShopCategoryTab; label: string }[] = [
    { key: 'avatars', label: 'Avatar Decorations' },
    { key: 'nameplates', label: 'Nameplates' },
    { key: 'profile-effects', label: 'Profile Effects' },
    { key: 'profile-frames', label: 'Profile Frames' },
    { key: 'bundles', label: 'Bundles' },
    { key: 'all', label: 'Shop All' },
  ];

  return (
    <header className="relative z-30 h-14 min-h-[56px] px-4 sm:px-6 flex items-center justify-between border-b border-black/10 dark:border-white/10 glass-panel select-none transition-colors duration-200">
      {/* Left: Discord Store icon + Navigation links */}
      <div className="flex items-center gap-2 sm:gap-6">
        <div
          className={'flex items-center ' + (isLight ? 'text-zinc-900' : 'text-white/90')}
          title="Shop"
        >
          <Store size={22} className="shrink-0" aria-hidden="true" />
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Featured tab */}
          <button
            type="button"
            onClick={() => {
              onSelectCategory('featured');
              setBrowseOpen(false);
            }}
            className={
              'relative px-3 py-3.5 text-sm font-semibold transition-colors cursor-pointer ' +
              (currentCategory === 'featured'
                ? isLight
                  ? 'text-zinc-900'
                  : 'text-white'
                : isLight
                  ? 'text-zinc-500 hover:text-zinc-900'
                  : 'text-white/70 hover:text-white')
            }
          >
            Featured
            {currentCategory === 'featured' && (
              <span
                className={
                  'absolute bottom-0 left-2 right-2 h-[2.5px] rounded-t ' +
                  (isLight ? 'bg-zinc-900' : 'bg-white')
                }
              />
            )}
          </button>

          {/* Browse dropdown with smooth hover and transition */}
          <div
            className="relative"
            ref={dropdownRef}
            onMouseEnter={handleBrowseMouseEnter}
            onMouseLeave={handleBrowseMouseLeave}
          >
            <button
              type="button"
              onClick={() => setBrowseOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={browseOpen}
              className={
                'relative flex items-center gap-1.5 px-3 py-3.5 text-sm font-semibold transition-colors cursor-pointer ' +
                (isBrowseActive
                  ? isLight
                    ? 'text-zinc-900'
                    : 'text-white'
                  : isLight
                    ? 'text-zinc-500 hover:text-zinc-900'
                    : 'text-white/70 hover:text-white')
              }
            >
              <span>Browse</span>
              <ChevronDown
                size={14}
                className={
                  'transition-transform duration-200 ease-out ' +
                  (browseOpen ? 'rotate-180' : 'rotate-0')
                }
              />
              {isBrowseActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-[#8b5cf6] rounded-t" />
              )}
            </button>

            {/* Smooth animated dropdown container */}
            <div
              role="menu"
              className={
                'absolute top-full left-0 mt-1 min-w-[210px] rounded-xl glass-menu border border-black/10 dark:border-white/15 shadow-2xl p-1.5 z-50 transform transition-all duration-200 ease-out origin-top text-gray-900 dark:text-white ' +
                (browseOpen
                  ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                  : 'opacity-0 -translate-y-2 scale-95 pointer-events-none')
              }
            >
              {browseOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onSelectCategory(opt.key);
                    setBrowseOpen(false);
                  }}
                  className={
                    'w-full text-left px-3.5 py-2 text-sm rounded-lg font-medium transition-colors cursor-pointer ' +
                    (currentCategory === opt.key
                      ? isLight
                        ? 'bg-black/10 text-zinc-900 font-bold'
                        : 'bg-white/15 text-white font-semibold'
                      : isLight
                        ? 'text-zinc-700 hover:bg-black/5 hover:text-zinc-900'
                        : 'text-white/80 hover:bg-white/10 hover:text-white')
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </div>

      {/* Right: Search + Wishlist + Balance badge (aligned with h-9) */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Input */}
        <label className="h-9 box-border flex items-center gap-2 rounded-md border border-black/10 dark:border-white/15 bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.10] px-2.5 transition-colors backdrop-blur-xl focus-within:border-purple-500/50 shadow-xs">
          <Search
            size={15}
            className={'shrink-0 ' + (isLight ? 'text-zinc-400' : 'text-white/50')}
            aria-hidden="true"
          />
          <input
            aria-label="Поиск рамок"
            placeholder="Search the Shop"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-transparent text-sm outline-none w-28 sm:w-48 lg:w-56 text-gray-900 placeholder-zinc-400 dark:text-white dark:placeholder-white/40"
          />
          {search && (
            <Tooltip label="Clear search" position="bottom">
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchChange('')}
                className={
                  'p-0.5 cursor-pointer ' +
                  (isLight ? 'text-zinc-400 hover:text-zinc-900' : 'text-white/40 hover:text-white')
                }
              >
                <X size={13} />
              </button>
            </Tooltip>
          )}
        </label>

        {/* Wishlist Button - Perfectly aligned with h-9 */}
        <div className="relative">
          <Tooltip
            label={currentCategory === 'wishlist' ? 'Exit Wishlist' : 'Wishlist'}
            position="bottom"
          >
            <button
              type="button"
              aria-label={currentCategory === 'wishlist' ? 'Exit Wishlist' : 'Wishlist'}
              aria-pressed={currentCategory === 'wishlist'}
              onClick={() =>
                onSelectCategory(currentCategory === 'wishlist' ? 'featured' : 'wishlist')
              }
              className={
                'relative h-9 w-9 box-border flex items-center justify-center rounded-md border transition-all cursor-pointer backdrop-blur-xl shadow-xs ' +
                (currentCategory === 'wishlist'
                  ? 'bg-[#8b5cf6] text-white border-purple-400/50 shadow-md shadow-purple-500/25'
                  : isLight
                    ? 'bg-black/[0.04] hover:bg-black/[0.08] border-black/10 text-zinc-700 hover:text-zinc-900'
                    : 'bg-white/[0.06] hover:bg-white/[0.14] border-white/15 text-white/80 hover:text-white')
              }
            >
              <Heart
                size={16}
                className={
                  currentCategory === 'wishlist' || wishlistCount > 0 ? 'fill-current' : ''
                }
              />
              {wishlistCount > 0 && currentCategory !== 'wishlist' && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#8b5cf6] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white/20 shadow-sm">
                  {wishlistCount}
                </span>
              )}
            </button>
          </Tooltip>
        </div>

        {/* Currency balance pill - Perfectly aligned with h-9 */}
        <div className="relative" ref={balanceRef}>
          <Tooltip label="Shop Balance" position="bottom">
            <button
              type="button"
              onClick={() => setBalanceOpen((prev) => !prev)}
              aria-label="Shop Balance: $0.00"
              className={
                'h-9 box-border flex items-center gap-1.5 px-3 rounded-md border text-sm font-semibold select-none cursor-pointer transition-colors backdrop-blur-xl shadow-xs ' +
                (isLight
                  ? 'bg-black/[0.04] hover:bg-black/[0.08] border-black/10 text-zinc-900'
                  : 'bg-white/[0.06] hover:bg-white/[0.14] border-white/15 text-white')
              }
            >
              {/* Bold, clean '$' symbol without circle/bg, adapts to light/dark contrast */}
              <span
                className={
                  'text-base font-extrabold leading-none tracking-tight ' +
                  (isLight ? 'text-zinc-900' : 'text-white')
                }
                aria-hidden="true"
              >
                $
              </span>
              <span className="tabular-nums font-bold">0.00</span>
            </button>
          </Tooltip>

          {/* Dollar balance dropdown modal */}
          {balanceOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 p-4 rounded-xl glass-menu border border-black/10 dark:border-white/15 shadow-2xl text-xs z-50 text-gray-900 dark:text-white animate-in fade-in">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={
                    'text-lg font-black leading-none ' + (isLight ? 'text-zinc-900' : 'text-white')
                  }
                >
                  $
                </span>
                <span className="font-bold text-sm">Shop Balance: $0.00</span>
              </div>
              <p
                className={'leading-relaxed mb-4 ' + (isLight ? 'text-zinc-600' : 'text-white/60')}
              >
                Your internal store wallet balance. Adding funds and direct purchases with dollars
                will be available in an upcoming release.
              </p>
              {/* Action button in brand purple as requested */}
              <button
                type="button"
                onClick={() => setBalanceOpen(false)}
                className="w-full py-2 rounded-lg font-semibold text-white bg-[#8b5cf6] hover:bg-[#7c3aed] active:scale-[0.98] transition-all shadow-md shadow-purple-500/20 text-center cursor-pointer"
              >
                Got it
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
