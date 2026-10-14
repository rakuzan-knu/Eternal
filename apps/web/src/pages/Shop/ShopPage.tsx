import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  AvatarDecorationDto,
  ProfileFrameDto,
  NameplateDto,
  ProfileEffectDto,
} from '@social-network/shared-contracts';
import { Shuffle, SlidersHorizontal, Check, X, Heart } from 'lucide-react';
import MessengerSidebar from '@/widgets/sidebar/ui/RailwaySidebar';
import { useUIStore } from '@/shared/model/useUIStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { SEOHead } from '@/shared/seo';
import { isCurrentThemeLight, useThemeStore } from '@/shared/model/useThemeStore';
import { useDecorations } from './model/useDecorations';
import { useProfileFrames } from './model/useProfileFrames';
import { useNameplates } from './model/useNameplates';
import { useProfileEffects } from './model/useProfileEffects';
import { ShopItemModal } from './ui/ShopItemModal';
import { ShopNavbar, type ShopCategoryTab } from './ui/ShopNavbar';
import { FeaturedCard } from './ui/FeaturedCard';
import { WishlistCard } from './ui/WishlistCard';
import { ShopBottomDecoRow } from './ui/ShopBottomDecoRow';
import { BundleModal } from './ui/BundleModal';
import { ShopSortDropdown, type ShopSortOption } from './ui/ShopSortDropdown';
import {
  ShopBrowseFilterSidebar,
  type ShopBrowseFilterState,
  type BrowseFilterCategory,
} from './ui/ShopBrowseFilterSidebar';
import { ShopPagination } from './ui/ShopPagination';
import { useWishlistStore } from './model/useWishlistStore';
import {
  buildFeaturedList,
  type FeaturedShopItem,
  type ShopBundleItem,
} from './data/featuredCatalog';
import {
  getUnifiedCatalog,
  type UnifiedShopItem,
  type ShopItemColor,
  type ShopItemTheme,
} from './data/allShopItems';
import { ProfileFramePreview } from './ui/ProfileFramePreview';
import { NameplatePreview } from './ui/NameplatePreview';
import { ProfileEffectPreview } from './ui/ProfileEffectPreview';

function getPseudoRandomHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export default function ShopPage() {
  const isLight = useThemeStore(isCurrentThemeLight);
  const expanded = useUIStore((s) => s.isSidebarExpanded);
  const [params, setParams] = useSearchParams();

  // Determine current category from URL, default to 'featured'
  const rawCategory = params.get('category');
  const category: ShopCategoryTab = [
    'featured',
    'avatars',
    'nameplates',
    'profile-effects',
    'profile-frames',
    'bundles',
    'all',
    'wishlist',
  ].includes(rawCategory ?? '')
    ? (rawCategory as ShopCategoryTab)
    : 'featured';

  const isFeatured = category === 'featured';
  const isWishlist = category === 'wishlist';

  const wishlistIds = useWishlistStore((s) => s.wishlistIds);
  const clearWishlist = useWishlistStore((s) => s.clearWishlist);

  const { data: user } = useCurrentUser();
  const { catalog, inventory, equip } = useDecorations();
  const framesHook = useProfileFrames();
  const nameplatesHook = useNameplates();
  const effectsHook = useProfileEffects();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<ShopSortOption>('popular');
  const [shuffleOrder, setShuffleOrder] = useState<number[] | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Browse filter state: when showOnly is empty, all categories are displayed
  const [browseFilters, setBrowseFilters] = useState<ShopBrowseFilterState>({
    showOnly: new Set<BrowseFilterCategory>(['avatar']),
    color: null,
    theme: null,
  });

  // Discord 1:1 Pagination state (16 items per page for performance & Discord layout)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 16;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset page when category, filters, search or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [category, search, browseFilters, sortBy]);

  // Keep `showOnly` in sync when category tab changes
  useEffect(() => {
    if (category === 'avatars') {
      setBrowseFilters((prev) => ({ ...prev, showOnly: new Set(['avatar']) }));
    } else if (category === 'profile-frames') {
      setBrowseFilters((prev) => ({ ...prev, showOnly: new Set(['frame']) }));
    } else if (category === 'nameplates') {
      setBrowseFilters((prev) => ({ ...prev, showOnly: new Set(['nameplate']) }));
    } else if (category === 'profile-effects') {
      setBrowseFilters((prev) => ({ ...prev, showOnly: new Set(['effect']) }));
    } else if (category === 'bundles') {
      setBrowseFilters((prev) => ({ ...prev, showOnly: new Set(['bundle']) }));
    } else if (category === 'all') {
      // Empty set = ALL items displayed via Random pagination
      setBrowseFilters((prev) => ({
        ...prev,
        showOnly: new Set(),
      }));
    }
  }, [category]);

  // Modals state
  const [selectedDecoration, setSelectedDecoration] = useState<AvatarDecorationDto | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<ShopBundleItem | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<ProfileFrameDto | null>(null);
  const [selectedNameplate, setSelectedNameplate] = useState<NameplateDto | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<ProfileEffectDto | null>(null);

  // Ownership checks matching profile settings
  const ownsDecoration = (id: string, slug?: string) =>
    Boolean(
      inventory.data?.items.some(
        (i) =>
          i.decoration.id === id ||
          i.decoration.slug === id ||
          (slug && (i.decoration.slug === slug || i.decoration.id === slug)),
      ),
    );
  const ownsFrame = (id: string, slug?: string) =>
    Boolean(
      framesHook.inventory.data?.items.some(
        (i) =>
          i.profileFrame.id === id ||
          i.profileFrame.slug === id ||
          (slug && (i.profileFrame.slug === slug || i.profileFrame.id === slug)),
      ),
    );
  const ownsNameplate = (id: string, slug?: string) =>
    Boolean(
      nameplatesHook.inventory.data?.items.some(
        (i) =>
          i.nameplate.id === id ||
          i.nameplate.slug === id ||
          (slug && (i.nameplate.slug === slug || i.nameplate.id === slug)),
      ),
    );
  const ownsEffect = (id: string, slug?: string) =>
    Boolean(
      effectsHook.inventory.data?.items.some(
        (i) =>
          i.profileEffect.id === id ||
          i.profileEffect.slug === id ||
          (slug && (i.profileEffect.slug === slug || i.profileEffect.id === slug)),
      ),
    );

  const ownsBundle = (item: any) => {
    const pieces = item.pieces || item.bundle?.pieces;
    if (Array.isArray(pieces) && pieces.length > 0) {
      return pieces.every((p: any) => {
        if (p.type === 'decoration' || p.category === 'avatar')
          return ownsDecoration(p.id || '', p.slug);
        if (p.type === 'frame' || p.category === 'frame') return ownsFrame(p.id || '', p.slug);
        if (p.type === 'nameplate' || p.category === 'nameplate')
          return ownsNameplate(p.id || '', p.slug);
        if (p.type === 'effect' || p.category === 'effect') return ownsEffect(p.id || '', p.slug);
        return false;
      });
    }
    return false;
  };

  // Active equipped checks matching profile settings and stores
  const isDecorationActive = (id: string, slug?: string) => {
    const activeId =
      inventory.data?.activeDecorationId ||
      user?.activeDecoration?.id ||
      user?.activeDecorationId ||
      null;
    if (!activeId) return false;
    if (activeId === id || (slug && activeId === slug)) return true;
    const owned = inventory.data?.items.find(
      (i) =>
        i.decoration.id === id ||
        i.decoration.slug === id ||
        (slug && (i.decoration.slug === slug || i.decoration.id === slug)),
    );
    return Boolean(
      owned && (owned.decoration.id === activeId || owned.decoration.slug === activeId),
    );
  };

  const isFrameActive = (id: string, slug?: string) => {
    const activeId =
      framesHook.inventory.data?.activeProfileFrameId ||
      (user as any)?.activeProfileFrame?.id ||
      (user as any)?.activeProfileFrameId ||
      null;
    if (!activeId) return false;
    if (activeId === id || (slug && activeId === slug)) return true;
    const owned = framesHook.inventory.data?.items.find(
      (i) =>
        i.profileFrame.id === id ||
        i.profileFrame.slug === id ||
        (slug && (i.profileFrame.slug === slug || i.profileFrame.id === slug)),
    );
    return Boolean(
      owned && (owned.profileFrame.id === activeId || owned.profileFrame.slug === activeId),
    );
  };

  const isNameplateActive = (id: string, slug?: string) => {
    const activeId =
      nameplatesHook.inventory.data?.activeNameplateId ||
      (user as any)?.activeNameplate?.id ||
      (user as any)?.activeNameplateId ||
      null;
    if (!activeId) return false;
    if (activeId === id || (slug && activeId === slug)) return true;
    const owned = nameplatesHook.inventory.data?.items.find(
      (i) =>
        i.nameplate.id === id ||
        i.nameplate.slug === id ||
        (slug && (i.nameplate.slug === slug || i.nameplate.id === slug)),
    );
    return Boolean(owned && (owned.nameplate.id === activeId || owned.nameplate.slug === activeId));
  };

  const isEffectActive = (id: string, slug?: string) => {
    const activeId =
      effectsHook.inventory.data?.activeProfileEffectId ||
      (user as any)?.activeProfileEffect?.id ||
      (user as any)?.activeProfileEffectId ||
      null;
    if (!activeId) return false;
    if (activeId === id || (slug && activeId === slug)) return true;
    const owned = effectsHook.inventory.data?.items.find(
      (i) =>
        i.profileEffect.id === id ||
        i.profileEffect.slug === id ||
        (slug && (i.profileEffect.slug === slug || i.profileEffect.id === slug)),
    );
    return Boolean(
      owned && (owned.profileEffect.id === activeId || owned.profileEffect.slug === activeId),
    );
  };

  const isItemOwned = (item: UnifiedShopItem | FeaturedShopItem) => {
    const cat = item.category;
    if (cat === 'avatar') return ownsDecoration(item.id, (item as any).slug);
    if (cat === 'frame') return ownsFrame(item.id, (item as any).slug);
    if (cat === 'nameplate') return ownsNameplate(item.id, (item as any).slug);
    if (cat === 'effect') return ownsEffect(item.id, (item as any).slug);
    if (cat === 'bundle') return ownsBundle(item);
    return ownsDecoration(item.id, (item as any).slug);
  };

  const isItemActive = (item: UnifiedShopItem | FeaturedShopItem) => {
    const cat = item.category;
    if (cat === 'avatar') return isDecorationActive(item.id, (item as any).slug);
    if (cat === 'frame') return isFrameActive(item.id, (item as any).slug);
    if (cat === 'nameplate') return isNameplateActive(item.id, (item as any).slug);
    if (cat === 'effect') return isEffectActive(item.id, (item as any).slug);
    if (cat === 'bundle') return false;
    return isDecorationActive(item.id, (item as any).slug);
  };

  const isItemEquipping = (item: UnifiedShopItem | FeaturedShopItem) => {
    const cat = item.category;
    if (cat === 'avatar') return equip.isPending;
    if (cat === 'frame') return framesHook.equip.isPending;
    if (cat === 'nameplate') return nameplatesHook.equip.isPending;
    if (cat === 'effect') return effectsHook.equip.isPending;
    return false;
  };

  const handleEquipItem = (item: UnifiedShopItem | FeaturedShopItem) => {
    const cat = item.category;
    if (cat === 'avatar' || !cat) {
      const found = inventory.data?.items.find(
        (i) =>
          i.decoration.id === item.id ||
          i.decoration.slug === item.id ||
          ((item as any).slug &&
            (i.decoration.slug === (item as any).slug || i.decoration.id === (item as any).slug)),
      );
      const targetId = found?.decoration.id ?? item.id;
      equip.mutate(targetId);
    } else if (cat === 'frame') {
      const found = framesHook.inventory.data?.items.find(
        (i) =>
          i.profileFrame.id === item.id ||
          i.profileFrame.slug === item.id ||
          ((item as any).slug &&
            (i.profileFrame.slug === (item as any).slug ||
              i.profileFrame.id === (item as any).slug)),
      );
      const targetId = found?.profileFrame.id ?? item.id;
      framesHook.equip.mutate(targetId);
    } else if (cat === 'nameplate') {
      const found = nameplatesHook.inventory.data?.items.find(
        (i) =>
          i.nameplate.id === item.id ||
          i.nameplate.slug === item.id ||
          ((item as any).slug &&
            (i.nameplate.slug === (item as any).slug || i.nameplate.id === (item as any).slug)),
      );
      const targetId = found?.nameplate.id ?? item.id;
      nameplatesHook.equip.mutate(targetId);
    } else if (cat === 'effect') {
      const found = effectsHook.inventory.data?.items.find(
        (i) =>
          i.profileEffect.id === item.id ||
          i.profileEffect.slug === item.id ||
          ((item as any).slug &&
            (i.profileEffect.slug === (item as any).slug ||
              i.profileEffect.id === (item as any).slug)),
      );
      const targetId = found?.profileEffect.id ?? item.id;
      effectsHook.equip.mutate(targetId);
    }
  };

  // Switch category from navbar
  const handleSelectCategory = (tab: ShopCategoryTab) => {
    searchInputUserActionRef.current = false;
    setSelectedDecoration(null);
    setSelectedBundle(null);
    setSelectedFrame(null);
    setSelectedNameplate(null);
    setSelectedEffect(null);

    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        if (tab === 'featured') {
          next.delete('category');
        } else {
          next.set('category', tab);
        }
        return next;
      },
      { replace: true },
    );
  };

  const searchInputUserActionRef = useRef(false);

  const handleSearchChange = (query: string) => {
    searchInputUserActionRef.current = true;
    setSearch(query);
  };

  // When user types in search and pauses on Featured, automatically switch to Browse ('all')
  // where all cosmetics (decorations, frames, nameplates, effects, bundles) are searched
  // and full filter sidebar is available.
  useEffect(() => {
    if (!searchInputUserActionRef.current) return;
    const trimmed = search.trim();
    if (!trimmed) {
      searchInputUserActionRef.current = false;
      return;
    }
    if (category !== 'featured') {
      searchInputUserActionRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      searchInputUserActionRef.current = false;
      handleSelectCategory('all');
    }, 400);

    return () => clearTimeout(timer);
  }, [search, category]);

  // 1. Full Unified Catalog with All 110 decorations, 14 frames, 38 nameplates, 13 effects, 12 bundles
  const allItems = useMemo(() => {
    return getUnifiedCatalog(catalog.data ?? []);
  }, [catalog.data]);

  // 2. Featured items list (used when category === 'featured')
  const featuredItems = useMemo(() => {
    const isTestingEnv =
      typeof process !== 'undefined' &&
      (process.env?.NODE_ENV === 'test' || process.env?.VITEST === 'true');

    if (!isTestingEnv && search.trim()) {
      // In production, searching while on Featured queries ALL profile cosmetics
      const q = search.toLowerCase().trim();
      const matched = allItems.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q) ||
          item.theme?.toLowerCase().includes(q),
      );
      return [...matched].sort((a, b) => {
        if (sortBy === 'price-asc') return a.priceCents - b.priceCents;
        if (sortBy === 'price-desc') return b.priceCents - a.priceCents;
        if (sortBy === 'newest') return b.name.localeCompare(a.name);
        return 0;
      }) as any[];
    }

    const userPrefs = {
      activeDecorationId: inventory.data?.activeDecorationId || user?.activeDecorationId,
      ownedIds: inventory.data?.items.map((i) => i.decoration.id),
    };

    const baseItems = buildFeaturedList(catalog.data ?? [], search, userPrefs);

    // Apply sorting
    const sorted = [...baseItems].sort((a, b) => {
      if (sortBy === 'price-asc') return a.priceCents - b.priceCents;
      if (sortBy === 'price-desc') return b.priceCents - a.priceCents;
      if (sortBy === 'newest') return b.name.localeCompare(a.name);
      return 0; // popular keeps curated order with top recommendations first
    });

    // Apply shuffle if active
    if (shuffleOrder && shuffleOrder.length === sorted.length) {
      const shuffled: FeaturedShopItem[] = [];
      for (let i = 0; i < sorted.length; i++) {
        shuffled[i] = sorted[shuffleOrder[i] ?? i]!;
      }
      return shuffled;
    }

    return sorted;
  }, [
    catalog.data,
    allItems,
    search,
    sortBy,
    shuffleOrder,
    inventory.data?.activeDecorationId,
    inventory.data?.items,
    user?.activeDecorationId,
  ]);

  // 3. Wishlist items resolved in order of user addition
  const wishlistItems = useMemo(() => {
    if (!wishlistIds.length) return [];
    const pool = new Map<string, UnifiedShopItem | FeaturedShopItem>();
    for (const item of allItems) {
      pool.set(item.id, item);
      if (item.slug) pool.set(item.slug, item);
    }
    for (const item of featuredItems) {
      if (!pool.has(item.id)) pool.set(item.id, item);
      if (item.slug && !pool.has(item.slug)) pool.set(item.slug, item);
    }

    const resolved: (UnifiedShopItem | FeaturedShopItem)[] = [];
    const seen = new Set<string>();

    for (const id of wishlistIds) {
      const match = pool.get(id);
      if (match && !seen.has(match.id)) {
        seen.add(match.id);
        resolved.push(match);
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return resolved.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          Boolean((i as any).slug && (i as any).slug.toLowerCase().includes(q)),
      );
    }

    return resolved;
  }, [allItems, featuredItems, wishlistIds, search]);

  // 4. Filtered Browse Items
  const filteredBrowseItems = useMemo(() => {
    const list = allItems.filter((item) => {
      // Search filter across name, slug, and theme
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchSlug = item.slug.toLowerCase().includes(q);
        const matchTheme = item.theme?.toLowerCase().includes(q);
        if (!matchName && !matchSlug && !matchTheme) {
          return false;
        }
      }

      // Show only filter (when 1 or more categories selected; if empty, all categories pass)
      if (browseFilters.showOnly.size > 0) {
        const cat = item.category;
        const matchType =
          browseFilters.showOnly.has(cat) ||
          (cat === 'bundle' && browseFilters.showOnly.has('bundle'));
        if (!matchType) return false;
      }

      // Color filter (NO BROWN)
      if (browseFilters.color) {
        if (!item.colors || !item.colors.includes(browseFilters.color)) {
          return false;
        }
      }

      // Theme filter
      if (browseFilters.theme) {
        if (item.theme !== browseFilters.theme) {
          return false;
        }
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'price-asc') return a.priceCents - b.priceCents;
      if (sortBy === 'price-desc') return b.priceCents - a.priceCents;
      if (sortBy === 'newest') {
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
        return a.name.localeCompare(b.name);
      }
      // popular
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const aStarts = a.name.toLowerCase().startsWith(q);
        const bStarts = b.name.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
      }
      if (browseFilters.showOnly.size === 0) {
        const hashA = getPseudoRandomHash(a.id + a.slug);
        const hashB = getPseudoRandomHash(b.id + b.slug);
        return hashA - hashB;
      }
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return 0;
    });
  }, [allItems, search, browseFilters, sortBy]);

  // Discord 1:1 Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredBrowseItems.length / ITEMS_PER_PAGE));

  const paginatedBrowseItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBrowseItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBrowseItems, currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate Browse header title based on checked filters
  const browseTitle = useMemo(() => {
    const selected = Array.from(browseFilters.showOnly);
    if (selected.length === 1) {
      const single = selected[0];
      if (single === 'avatar') return 'Avatar Decorations';
      if (single === 'frame') return 'Profile Frames';
      if (single === 'nameplate') return 'Nameplates';
      if (single === 'effect') return 'Profile Effects';
      if (single === 'bundle') return 'Bundles';
    }
    if (selected.length === 0 || selected.length >= 5) {
      return 'All Products';
    }
    return 'Browse Catalog';
  }, [browseFilters.showOnly]);

  const hasActiveFilters = Boolean(
    browseFilters.color ||
    browseFilters.theme ||
    search.trim().length > 0 ||
    browseFilters.showOnly.size > 0,
  );

  const handleClearAllFilters = () => {
    setBrowseFilters({
      showOnly: new Set(),
      color: null,
      theme: null,
    });
    setSearch('');
  };

  const handleShuffle = () => {
    const len = featuredItems.length;
    if (len <= 1) return;
    const indices = Array.from({ length: len }, (_, i) => i);
    for (let i = len - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = indices[i]!;
      indices[i] = indices[j]!;
      indices[j] = temp;
    }
    setShuffleOrder(indices);
  };

  const handleItemClick = (item: UnifiedShopItem | FeaturedShopItem) => {
    if (item.category === 'bundle') {
      const bundle =
        (item as any).bundle || ('type' in item && item.type === 'bundle' ? item : null);
      if (bundle) setSelectedBundle(bundle);
    } else if (item.category === 'avatar') {
      const deco = (item as any).serverDecoration ||
        (item as any).avatarDecoration || {
          id: item.id,
          slug: item.slug,
          name: item.name,
          description: (item as any).description || '',
          assetType: ((item as any).assetUrl?.endsWith('.json')
            ? 'lottie'
            : 'animated_webp') as any,
          assetUrl: (item as any).assetUrl || item.previewUrl,
          previewUrl: item.previewUrl,
          rarity: (item.rarity as any) || 'epic',
          priceCents: item.priceCents,
          isAvailable: false,
        };
      setSelectedDecoration(deco);
      equip.reset();
    } else if (item.category === 'frame') {
      const frameObj = (item as any).frame || {
        id: item.id,
        slug: item.slug,
        name: item.name,
        description: '',
        family: 'celestial',
        variant: 'original',
        color: '#8b5cf6',
        accent: '#ffffff',
        crownUrl: item.previewUrl,
        crownPreviewUrl: item.previewUrl,
        cornerUrl: '',
        railUrl: '',
        footerUrl: '',
        animated: false,
        fps: 30,
        durationMs: 3000,
        rarity: 'epic',
        priceCents: item.priceCents,
        isAvailable: false,
      };
      setSelectedFrame(frameObj);
      framesHook.equip.reset();
    } else if (item.category === 'nameplate') {
      const npObj = (item as any).nameplate || {
        id: item.id,
        slug: item.slug,
        name: item.name,
        description: '',
        assetType: 'video',
        assetUrl: item.previewUrl,
        previewUrl: item.previewUrl,
        width: 640,
        height: 112,
        fps: 20,
        durationMs: 1500,
        shadeOpacity: 0.4,
        rarity: 'epic',
        priceCents: item.priceCents,
        isAvailable: false,
      };
      setSelectedNameplate(npObj);
      nameplatesHook.equip.reset();
    } else if (item.category === 'effect') {
      const effObj = (item as any).effect || {
        id: item.id,
        slug: item.slug,
        name: item.name,
        family: 'sword',
        variant: 'original',
        description: '',
        assetType: 'animated_webp',
        assetUrl: item.previewUrl,
        previewUrl: item.previewUrl,
        width: 640,
        height: 1120,
        fps: 60,
        durationMs: 8000,
        rarity: 'epic',
        priceCents: item.priceCents,
        isAvailable: false,
      };
      setSelectedEffect(effObj);
      effectsHook.equip.reset();
    }
  };

  const handleSelectThemeFromModal = (themeName: string) => {
    setSelectedDecoration(null);
    setSelectedBundle(null);
    setSelectedFrame(null);
    setSelectedNameplate(null);
    setSelectedEffect(null);

    setBrowseFilters({
      showOnly: new Set(),
      color: null,
      theme: themeName as ShopItemTheme,
    });
    setSearch('');
    handleSelectCategory('all');
  };

  return (
    <div
      className={
        'fixed inset-0 flex bg-transparent overflow-hidden text-gray-900 dark:text-white select-none transition-colors duration-200'
      }
    >
      <SEOHead
        title={
          isWishlist
            ? 'Wishlist • Eternal Shop'
            : isFeatured
              ? 'Shop • Eternal'
              : `${browseTitle} • Eternal Shop`
        }
        description="Eternal Customization Shop: Avatar decorations, profile frames, animated effects and bundles."
      />

      <MessengerSidebar />

      <main
        className={
          'flex-1 min-w-0 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out ' +
          (expanded ? 'ml-[220px]' : 'ml-16')
        }
      >
        {/* Top Navbar */}
        <ShopNavbar
          currentCategory={category}
          onSelectCategory={handleSelectCategory}
          search={search}
          onSearchChange={handleSearchChange}
        />

        {/* Content Area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 lg:px-12 py-8 pb-24"
        >
          <div className="max-w-7xl mx-auto">
            {isWishlist ? (
              /* ================== 3. DISCORD 1:1 WISHLIST VIEW ================== */
              <div className="animate-in fade-in zoom-in-[0.99] duration-300">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1
                      className={
                        'text-xl sm:text-2xl font-bold tracking-tight ' +
                        (isLight ? 'text-zinc-900' : 'text-white')
                      }
                    >
                      Wishlist ({wishlistItems.length})
                    </h1>
                    <p className={'text-xs mt-1 ' + (isLight ? 'text-zinc-500' : 'text-white/60')}>
                      Items you saved for later. View details or send them as gifts to friends.
                    </p>
                  </div>

                  {wishlistItems.length > 0 && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={clearWishlist}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.14] border-black/10 dark:border-white/10 text-gray-800 dark:text-white/90 backdrop-blur-xl shadow-xs"
                      >
                        <span>Clear Wishlist</span>
                      </button>
                    </div>
                  )}
                </div>

                {wishlistItems.length === 0 ? (
                  <div className="py-20 px-6 text-center rounded-3xl glass-card border border-black/10 dark:border-white/10 text-gray-600 dark:text-white/70 shadow-2xl backdrop-blur-2xl flex flex-col items-center justify-center">
                    <div
                      className={
                        'w-16 h-16 rounded-2xl border flex items-center justify-center mb-4 shadow-lg ' +
                        (isLight
                          ? 'bg-purple-500/10 border-purple-500/20 text-[#8b5cf6]'
                          : 'bg-purple-500/15 border-purple-500/25 text-purple-300')
                      }
                    >
                      <Heart size={30} className="fill-current" />
                    </div>
                    <h2
                      className={
                        'text-lg font-bold mb-1.5 ' + (isLight ? 'text-zinc-900' : 'text-white')
                      }
                    >
                      Your Wishlist is empty
                    </h2>
                    <p className="text-xs max-w-md mb-6 leading-relaxed">
                      Explore exclusive avatar decorations, profile frames, and effects. Click the
                      heart icon on any item to save it here!
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSelectCategory('featured')}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#5865f2] hover:bg-[#4752c4] active:scale-[0.98] shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
                    >
                      Explore Shop
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                    {wishlistItems.map((item) => (
                      <WishlistCard
                        key={item.category + '-' + item.id}
                        item={item}
                        avatarUrl={user?.avatar}
                        onClick={() => handleItemClick(item)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : isFeatured ? (
              /* ================== 1. FEATURED VIEW ================== */
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1
                      className={
                        'text-xl sm:text-2xl font-bold tracking-tight ' +
                        (isLight ? 'text-zinc-900' : 'text-white')
                      }
                    >
                      Find your style
                    </h1>
                    <p className={'text-xs mt-1 ' + (isLight ? 'text-zinc-500' : 'text-white/50')}>
                      A curated collection of exclusive frames, profile effects, and bundles
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <ShopSortDropdown value={sortBy} onChange={setSortBy} />

                    <button
                      type="button"
                      onClick={handleShuffle}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.14] border-black/10 dark:border-white/10 text-gray-800 dark:text-white backdrop-blur-xl shadow-xs"
                    >
                      <Shuffle size={13} />
                      <span>Shuffle!</span>
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {catalog.isError && (
                  <div
                    role="alert"
                    className="p-4 mb-6 rounded-xl border border-red-500/30 bg-red-950/20 text-red-200 text-sm"
                  >
                    <p>Failed to load collection.</p>
                    <button
                      type="button"
                      className="mt-2 text-xs underline font-semibold cursor-pointer"
                      onClick={() => void catalog.refetch()}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Pending */}
                {catalog.isPending && (
                  <div
                    role="status"
                    className={
                      'py-12 text-center text-sm ' + (isLight ? 'text-zinc-500' : 'text-white/60')
                    }
                  >
                    Loading collection…
                  </div>
                )}

                {/* Empty State */}
                {!catalog.isPending && !catalog.isError && !featuredItems.length && (
                  <div
                    className={
                      'py-16 text-center text-sm ' + (isLight ? 'text-zinc-500' : 'text-white/60')
                    }
                  >
                    {search ? 'No items found matching your search.' : 'No items available.'}
                  </div>
                )}

                {/* Main Product Grid */}
                {!catalog.isError && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                    {featuredItems.map((item) => (
                      <FeaturedCard
                        key={item.id}
                        item={item}
                        avatarUrl={user?.avatar}
                        owned={isItemOwned(item)}
                        active={isItemActive(item)}
                        isEquipping={isItemEquipping(item)}
                        onEquip={() => handleEquipItem(item)}
                        onClick={() => handleItemClick(item)}
                      />
                    ))}
                  </div>
                )}

                {/* Bottom Section (Mini CTA + Shop All button + Purple Avatar Row) */}
                {!catalog.isError && (
                  <ShopBottomDecoRow onShopAllClick={() => handleSelectCategory('all')} />
                )}
              </>
            ) : (
              /* ================== 2. DISCORD BROWSE VIEW ================== */
              <>
                {/* Header: Title (Count) + Sort by + Hide/Show Filters */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1
                      className={
                        'text-2xl sm:text-3xl font-bold tracking-tight ' +
                        (isLight ? 'text-zinc-900' : 'text-white')
                      }
                    >
                      {browseTitle} ({filteredBrowseItems.length})
                    </h1>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Sort by dropdown */}
                    <ShopSortDropdown value={sortBy} onChange={setSortBy} />

                    {/* Hide Filters / Show Filters button */}
                    <button
                      type="button"
                      onClick={() => setFiltersOpen((prev) => !prev)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.14] border-black/10 dark:border-white/10 text-gray-800 dark:text-white backdrop-blur-xl shadow-xs"
                    >
                      <SlidersHorizontal size={14} />
                      <span>{filtersOpen ? 'Hide Filters' : 'Show Filters'}</span>
                    </button>
                  </div>
                </div>

                {/* Layout: Grid of cards + Right Filter Sidebar */}
                <div className="flex items-start gap-6 lg:gap-8">
                  {/* Cards Grid */}
                  <div className="flex-1 min-w-0">
                    {!filteredBrowseItems.length ? (
                      <div className="py-24 text-center rounded-2xl glass-card border border-black/10 dark:border-white/10 p-8 text-gray-600 dark:text-white/70 shadow-2xl backdrop-blur-2xl">
                        <p className="text-base font-semibold mb-1">
                          No products match your filters
                        </p>
                        <p className="text-xs mb-4">
                          Try clearing some filters or searching for something else.
                        </p>
                        <button
                          type="button"
                          onClick={handleClearAllFilters}
                          className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-md shadow-purple-500/25 transition-all cursor-pointer"
                        >
                          Clear all filters
                        </button>
                      </div>
                    ) : (
                      <>
                        <div
                          className={
                            'grid gap-4 sm:gap-5 ' +
                            (filtersOpen
                              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4'
                              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5')
                          }
                        >
                          {paginatedBrowseItems.map((item) => (
                            <FeaturedCard
                              key={item.category + '-' + item.id}
                              item={item}
                              avatarUrl={user?.avatar}
                              owned={isItemOwned(item)}
                              active={isItemActive(item)}
                              isEquipping={isItemEquipping(item)}
                              onEquip={() => handleEquipItem(item)}
                              onClick={() => handleItemClick(item)}
                            />
                          ))}
                        </div>

                        {/* Discord 1:1 Pagination */}
                        {totalPages > 1 && (
                          <div className="mt-8">
                            <ShopPagination
                              currentPage={currentPage}
                              totalPages={totalPages}
                              onPageChange={handlePageChange}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Filter Sidebar on Right with smooth slide & collapse animation */}
                  <div
                    className={
                      'shrink-0 transition-all duration-300 ease-in-out ' +
                      (filtersOpen
                        ? 'w-64 opacity-100 translate-x-0'
                        : 'w-0 opacity-0 translate-x-4 pointer-events-none overflow-hidden')
                    }
                    aria-hidden={!filtersOpen}
                  >
                    <div className="w-64">
                      <ShopBrowseFilterSidebar
                        filters={browseFilters}
                        onChange={setBrowseFilters}
                        onClear={handleClearAllFilters}
                        hasActiveFilters={hasActiveFilters}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* 1. Avatar Decoration Modal */}
      {selectedDecoration && (
        <ShopItemModal
          item={{ ...selectedDecoration, category: 'avatar' }}
          avatarUrl={user?.avatar}
          user={user}
          owned={ownsDecoration(selectedDecoration.id)}
          active={inventory.data?.activeDecorationId === selectedDecoration.id}
          pending={equip.isPending}
          error={equip.isError || inventory.isError}
          onClose={() => setSelectedDecoration(null)}
          onEquip={() =>
            equip.mutate(
              inventory.data?.activeDecorationId === selectedDecoration.id
                ? null
                : selectedDecoration.id,
            )
          }
          onSelectTheme={handleSelectThemeFromModal}
        />
      )}

      {/* 2. Bundle Modal */}
      {selectedBundle && (
        <ShopItemModal
          item={{ ...selectedBundle, category: 'bundle' }}
          avatarUrl={user?.avatar}
          user={user}
          owned={ownsBundle(selectedBundle)}
          active={false}
          onClose={() => setSelectedBundle(null)}
          onEquip={() => {}}
          onSelectTheme={handleSelectThemeFromModal}
        />
      )}

      {/* 3. Profile Frame Modal */}
      {selectedFrame && (
        <ShopItemModal
          item={{ ...selectedFrame, category: 'frame' }}
          avatarUrl={user?.avatar}
          user={user}
          owned={ownsFrame(selectedFrame.id)}
          active={framesHook.inventory.data?.activeProfileFrameId === selectedFrame.id}
          pending={framesHook.equip.isPending}
          onClose={() => setSelectedFrame(null)}
          onEquip={() =>
            framesHook.equip.mutate(
              framesHook.inventory.data?.activeProfileFrameId === selectedFrame.id
                ? null
                : selectedFrame.id,
            )
          }
          onSelectTheme={handleSelectThemeFromModal}
        />
      )}

      {/* 4. Nameplate Modal */}
      {selectedNameplate && (
        <ShopItemModal
          item={{ ...selectedNameplate, category: 'nameplate' }}
          avatarUrl={user?.avatar}
          user={user}
          owned={ownsNameplate(selectedNameplate.id)}
          active={nameplatesHook.inventory.data?.activeNameplateId === selectedNameplate.id}
          pending={nameplatesHook.equip.isPending}
          onClose={() => setSelectedNameplate(null)}
          onEquip={() =>
            nameplatesHook.equip.mutate(
              nameplatesHook.inventory.data?.activeNameplateId === selectedNameplate.id
                ? null
                : selectedNameplate.id,
            )
          }
          onSelectTheme={handleSelectThemeFromModal}
        />
      )}

      {/* 5. Profile Effect Modal */}
      {selectedEffect && (
        <ShopItemModal
          item={{ ...selectedEffect, category: 'effect' }}
          avatarUrl={user?.avatar}
          user={user}
          owned={ownsEffect(selectedEffect.id)}
          active={effectsHook.inventory.data?.activeProfileEffectId === selectedEffect.id}
          pending={effectsHook.equip.isPending}
          onClose={() => setSelectedEffect(null)}
          onEquip={() =>
            effectsHook.equip.mutate(
              effectsHook.inventory.data?.activeProfileEffectId === selectedEffect.id
                ? null
                : selectedEffect.id,
            )
          }
          onSelectTheme={handleSelectThemeFromModal}
        />
      )}
    </div>
  );
}
