import React, { useState, useMemo, useRef, useEffect } from 'react';
import MessengerSidebar from '@/widgets/sidebar/ui/RailwaySidebar';
import { useUIStore } from '@/shared/model/useUIStore';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { SEOHead } from '@/shared/seo';
import {
  ChevronRight,
  Filter,
  Sparkles,
  ShoppingBag,
  SlidersHorizontal,
  X,
  Heart,
} from 'lucide-react';
import type { ShopTab, ShopCategory, ShopItem } from './types';
import { SHOP_ITEMS } from './data/shopItems';
import { ShopHeader } from './ui/ShopHeader';
import { ShopHeroBanner } from './ui/ShopHeroBanner';
import { ShopItemCard } from './ui/ShopItemCard';
import { ShopItemModal } from './ui/ShopItemModal';
import { useShopWalletStore } from './model/useShopWalletStore';

export default function ShopPage() {
  const isSidebarExpanded = useUIStore((s) => s.isSidebarExpanded);
  const solidTheme = useThemeStore((s) => s.solidTheme);
  const accentColor = useThemeStore((s) => s.accentColor);
  const walletBalance = useShopWalletStore((s) => s.balance);

  // Shop State
  const [activeTab, setActiveTab] = useState<ShopTab>('Featured');
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Wishlist: Real user items with local storage persistence
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('eternal_shop_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('eternal_shop_wishlist', JSON.stringify(wishlistIds));
    } catch (e) {
      console.error('Failed to save wishlist', e);
    }
  }, [wishlistIds]);

  const [isWishlistActive, setIsWishlistActive] = useState(false);
  const [activeModalItem, setActiveModalItem] = useState<ShopItem | null>(null);
  const [sortOption, setSortOption] = useState<
    'featured' | 'price-asc' | 'price-desc' | 'discount'
  >('featured');

  const eligibleScrollRef = useRef<HTMLDivElement>(null);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = [...SHOP_ITEMS];

    // Wishlist filter
    if (isWishlistActive) {
      items = items.filter((item) => wishlistIds.includes(item.id));
    }

    // Tab-level filter
    if (activeTab === 'Browse' && selectedCategory && selectedCategory !== 'Shop All') {
      items = items.filter((item) => item.category === selectedCategory);
    } else if (activeTab === 'Game Shops' && !searchQuery) {
      items = items.filter((item) => Boolean(item.gameShopName));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.collection.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.gameShopName && item.gameShopName.toLowerCase().includes(q)) ||
          item.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Sorting
    if (sortOption === 'price-asc') {
      items.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-desc') {
      items.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'discount') {
      items.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
    }

    return items;
  }, [activeTab, selectedCategory, searchQuery, isWishlistActive, wishlistIds, sortOption]);

  // Specific Cauldron Chaos eligible items for the Featured row
  const eligibleItems = useMemo(() => {
    return SHOP_ITEMS.filter((item) => item.isQuestEligible);
  }, []);

  const toggleWishlist = (id: string) => {
    setWishlistIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const scrollEligibleRight = () => {
    if (eligibleScrollRef.current) {
      eligibleScrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 flex bg-transparent overflow-hidden text-white select-none">
      <SEOHead
        title="Shop • Profile Decorations & Cosmetics • Eternal"
        description="Customize your profile with exclusive avatar decorations, animated profile effects, frames, and badges."
      />

      {/* RailwaySidebar on the left */}
      <MessengerSidebar />

      {/* Main Shop Viewport flush adjacent to RailwaySidebar */}
      <div
        className={`flex-1 min-w-0 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out ${
          isSidebarExpanded ? 'ml-[200px]' : 'ml-16'
        }`}
      >
        {/* Top Shop Header */}
        <ShopHeader
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab === 'Featured') {
              setSelectedCategory(null);
              setSearchQuery('');
              setIsWishlistActive(false);
            } else if (tab === 'Browse') {
              setSearchQuery('');
              setIsWishlistActive(false);
            } else if (tab === 'Game Shops') {
              setSelectedCategory(null);
              setSearchQuery('');
              setIsWishlistActive(false);
            }
          }}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setActiveTab('Browse');
            setSearchQuery('');
            setIsWishlistActive(false);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          wishlistCount={wishlistIds.length}
          isWishlistActive={isWishlistActive}
          onToggleWishlist={() => setIsWishlistActive((v) => !v)}
          userBalance={walletBalance}
        />

        {/* Scrollable Shop Content Container */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 sm:px-8 py-6 pb-24">
          <div className="max-w-6xl mx-auto flex flex-col gap-8">
            {/* If in Featured mode and no search/wishlist active: Render Hero Banner & Eligible Row */}
            {activeTab === 'Featured' && !searchQuery && !isWishlistActive && (
              <>
                {/* Hero Campaign Banner */}
                <ShopHeroBanner
                  collectedCount={1}
                  totalQuestItems={4}
                  daysRemaining={12}
                  onShopCollection={() => {
                    setSearchQuery('Cauldron Chaos');
                  }}
                />

                {/* Section: Eligible Items */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                      Eligible items
                    </h2>

                    {/* Carousel Next Arrow Button */}
                    <button
                      type="button"
                      onClick={scrollEligibleRight}
                      aria-label="Scroll eligible items right"
                      className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-gray-900 dark:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div
                    ref={eligibleScrollRef}
                    className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth py-1"
                  >
                    {eligibleItems.map((item) => (
                      <div key={item.id} className="w-56 shrink-0">
                        <ShopItemCard
                          item={item}
                          isWishlisted={wishlistIds.includes(item.id)}
                          onToggleWishlist={() => toggleWishlist(item.id)}
                          onClick={() => setActiveModalItem(item)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Catalog Grid View or Wishlist View */}
            {isWishlistActive ? (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                      <Heart size={20} className="fill-rose-400" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                        Your Liked Items
                      </h1>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {wishlistIds.length} {wishlistIds.length === 1 ? 'cosmetic' : 'cosmetics'}{' '}
                        saved to your wishlist
                      </p>
                    </div>
                  </div>

                  {wishlistIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsWishlistActive(false)}
                      className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors cursor-pointer"
                    >
                      Back to Shop
                    </button>
                  )}
                </div>

                {filteredItems.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                    {filteredItems.map((item) => (
                      <ShopItemCard
                        key={item.id}
                        item={item}
                        isWishlisted={wishlistIds.includes(item.id)}
                        onToggleWishlist={() => toggleWishlist(item.id)}
                        onClick={() => setActiveModalItem(item)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-3xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                      <Heart size={26} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Your wishlist is empty
                    </h3>
                    <p className="text-xs text-gray-500 max-w-sm">
                      Tap the heart icon on any avatar decoration, effect, or bundle in the shop to
                      save your favorites here.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsWishlistActive(false)}
                      className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
                      style={{ backgroundColor: accentColor }}
                    >
                      Explore Featured Items
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Catalog Bar: Title + Filter / Sort Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/8 dark:border-white/8 pb-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                      {searchQuery
                        ? `Search results for "${searchQuery}"`
                        : selectedCategory
                          ? selectedCategory
                          : activeTab === 'Game Shops'
                            ? 'Game Partnerships & Collabs'
                            : 'Featured Cosmetics'}
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Showing {filteredItems.length} available items
                    </p>
                  </div>

                  {/* Filter & Sort Controls */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <SlidersHorizontal
                        size={14}
                        className="absolute left-3 text-gray-400 pointer-events-none"
                      />
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as any)}
                        aria-label="Sort cosmetics"
                        className="pl-8 pr-6 h-8 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-medium text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none"
                      >
                        <option value="featured" className="bg-[#12111d] text-white">
                          Featured
                        </option>
                        <option value="discount" className="bg-[#12111d] text-white">
                          Biggest Discount
                        </option>
                        <option value="price-asc" className="bg-[#12111d] text-white">
                          Price: Low to High
                        </option>
                        <option value="price-desc" className="bg-[#12111d] text-white">
                          Price: High to Low
                        </option>
                      </select>
                    </div>

                    {(searchQuery || selectedCategory) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory(null);
                        }}
                        className="h-8 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-gray-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                        title="Clear filters"
                      >
                        <X size={12} />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Items Grid */}
                {filteredItems.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                    {filteredItems.map((item) => (
                      <ShopItemCard
                        key={item.id}
                        item={item}
                        isWishlisted={wishlistIds.includes(item.id)}
                        onToggleWishlist={() => toggleWishlist(item.id)}
                        onClick={() => setActiveModalItem(item)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400">
                      <ShoppingBag size={24} />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      No cosmetics found
                    </h3>
                    <p className="text-xs text-gray-500 max-w-sm">
                      We couldn't find any items matching your current filters or search term. Try
                      clearing the search or selecting a different category.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory(null);
                        setIsWishlistActive(false);
                      }}
                      className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
                      style={{ backgroundColor: accentColor }}
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Try-On Item Preview Modal */}
      <ShopItemModal
        item={activeModalItem}
        isOpen={Boolean(activeModalItem)}
        onClose={() => setActiveModalItem(null)}
        isWishlisted={activeModalItem ? wishlistIds.includes(activeModalItem.id) : false}
        onToggleWishlist={() => activeModalItem && toggleWishlist(activeModalItem.id)}
      />
    </div>
  );
}
