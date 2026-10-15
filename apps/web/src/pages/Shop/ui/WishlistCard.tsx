import React from 'react';
import { Heart } from 'lucide-react';
import type { AvatarDecorationDto } from '@social-network/shared-contracts';
import type { UnifiedShopItem } from '../data/allShopItems';
import type { FeaturedShopItem } from '../data/featuredCatalog';
import { AvatarWithDecoration } from '@/shared/ui/AvatarDecoration';
import { DefaultAvatarSvg } from '@/shared/ui/Avatar';
import { ProfileFramePreview } from './ProfileFramePreview';
import Tooltip from '@/shared/ui/Tooltip';
import { isCurrentThemeLight, useThemeStore } from '@/shared/model/useThemeStore';
import { useWishlistStore } from '../model/useWishlistStore';

export interface WishlistCardProps {
  item: UnifiedShopItem | FeaturedShopItem;
  avatarUrl?: string | null | undefined;
  onClick: () => void;
}

export function WishlistCard({ item, avatarUrl, onClick }: WishlistCardProps) {
  const isLight = useThemeStore(isCurrentThemeLight);
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(item.id, (item as any).slug));

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(item.id, (item as any).slug);
  };

  // Derive decoration
  const decoAsset =
    (item as any).assetUrl || (item as any).previewUrl?.replace('.preview.webp', '.webp');
  const isLottieDeco =
    Boolean(decoAsset?.endsWith('.json')) ||
    Boolean((item as any).previewUrl?.endsWith('.json')) ||
    (item as any).serverDecoration?.assetType === 'lottie';

  const effectiveDecoration: AvatarDecorationDto | null =
    (item as any).serverDecoration ||
    (item as any).avatarDecoration ||
    (item.category === 'avatar'
      ? {
          id: item.id,
          slug: (item as any).slug || item.id,
          name: item.name,
          description: '',
          assetType: (isLottieDeco ? 'lottie' : 'animated_webp') as any,
          assetUrl: decoAsset || item.previewUrl,
          previewUrl: item.previewUrl,
          rarity: ((item as any).rarity as any) || 'epic',
          priceCents: (item as any).priceCents || 0,
          isAvailable: false,
        }
      : null);

  // Derive frame
  const effectiveFrame =
    (item as any).frame ||
    (item.category === 'frame'
      ? {
          id: item.id,
          slug: (item as any).slug || item.id,
          name: item.name,
          description: '',
          family: (item as any).family || 'celestial',
          variant: (item as any).variant || 'default',
          color: (item as any).color || '#8b5cf6',
          accent: (item as any).accent || '#c084fc',
          crownUrl:
            (item as any).crownUrl ||
            (item as any).assetUrl ||
            item.previewUrl.replace('.preview.webp', '.webp'),
          crownPreviewUrl: (item as any).crownPreviewUrl || item.previewUrl,
          cornerUrl: item.previewUrl.replace('.crown.preview.webp', '.corner.svg'),
          railUrl: item.previewUrl.replace('.crown.preview.webp', '.rail.svg'),
          footerUrl: item.previewUrl.replace('.crown.preview.webp', '.footer.svg'),
          animated: true,
          fps: 60,
          durationMs: 3000,
          rarity: (item as any).rarity || 'epic',
          priceCents: (item as any).priceCents || 0,
          isAvailable: false,
        }
      : null);

  const pieces = (item as any).pieces || (item as any).bundle?.pieces || [];
  const bundleDecoPiece = pieces.find((p: any) => p.type === 'decoration') || pieces[0];
  const bundleDecoAsset =
    bundleDecoPiece?.assetUrl || bundleDecoPiece?.previewUrl?.replace('.preview.webp', '.webp');
  const isBundleLottie =
    Boolean(bundleDecoAsset?.endsWith('.json')) ||
    Boolean(bundleDecoPiece?.previewUrl?.endsWith('.json'));

  const bundleDecoration: AvatarDecorationDto | null = bundleDecoPiece
    ? {
        id: bundleDecoPiece.id || bundleDecoPiece.slug || 'bundle-deco',
        slug: bundleDecoPiece.slug || 'bundle-deco',
        name: bundleDecoPiece.name || bundleDecoPiece.title || 'Decoration',
        description: '',
        assetType: (isBundleLottie ? 'lottie' : 'animated_webp') as any,
        assetUrl: bundleDecoAsset || bundleDecoPiece.previewUrl,
        previewUrl: bundleDecoPiece.previewUrl,
        rarity: 'epic',
        priceCents: 0,
        isAvailable: false,
      }
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={'View details for ' + item.name}
      className="group relative aspect-square rounded-2xl sm:rounded-3xl glass-card border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-gray-900 dark:text-white transition-all duration-300 overflow-hidden flex items-center justify-center text-left cursor-pointer shadow-md hover:shadow-2xl hover:-translate-y-0.5 select-none"
    >
      {/* Ambient gradient glow on hover */}
      <div className="absolute inset-0 bg-radial from-purple-500/0 group-hover:from-purple-500/15 transition-colors pointer-events-none" />

      {/* 1. Top-Right "Remove from Wishlist" Button (Smooth slide-in on hover) */}
      <div className="absolute top-3 right-3 z-30 opacity-0 -translate-y-1 scale-90 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-200 ease-out">
        <Tooltip label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'} position="top">
          <button
            type="button"
            onClick={handleToggle}
            aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            className="w-8.5 h-8.5 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-lg bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 text-rose-500 dark:text-rose-400 border border-black/10 dark:border-white/15 backdrop-blur-xl"
          >
            <Heart
              size={17}
              className={
                'transition-transform active:scale-90 ' +
                (isWishlisted ? 'fill-[#f43f5e] text-[#f43f5e]' : '')
              }
            />
          </button>
        </Tooltip>
      </div>

      {/* 2. Centered Discord-style Cosmetic Display (Minimalist, No Clutter) */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-3 pointer-events-none">
        {item.category === 'avatar' && effectiveDecoration ? (
          <div className="scale-110 sm:scale-125 flex items-center justify-center">
            <AvatarWithDecoration
              avatarUrl={avatarUrl}
              decoration={effectiveDecoration}
              size="lg"
              motion={true}
            />
          </div>
        ) : item.category === 'frame' ? (
          <div className="w-28 h-36 flex items-center justify-center scale-90 sm:scale-100">
            {effectiveFrame ? (
              <ProfileFramePreview item={effectiveFrame} avatarUrl={avatarUrl} priority={true} />
            ) : (
              <img
                src={item.previewUrl}
                alt=""
                className="w-full h-full object-contain pointer-events-none"
              />
            )}
          </div>
        ) : item.category === 'bundle' ? (
          <div className="flex items-center justify-center gap-2 scale-90 sm:scale-95">
            {bundleDecoration && (
              <AvatarWithDecoration
                avatarUrl={avatarUrl}
                decoration={bundleDecoration}
                size="md"
                motion={true}
              />
            )}
            {pieces[1]?.previewUrl && (
              <div className="w-16 h-24 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center bg-black/30">
                <img
                  src={pieces[1].previewUrl}
                  alt=""
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            )}
          </div>
        ) : item.category === 'effect' ? (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl">
            <img
              src={(item as any).assetUrl || item.previewUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
            <div className="relative z-10 w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-black/40 shadow-xl flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <DefaultAvatarSvg className="w-full h-full" />
              )}
            </div>
          </div>
        ) : (
          /* Nameplate / other item */
          <div className="w-full max-w-[200px] h-12 rounded-xl overflow-hidden relative border border-white/15 shadow-md flex items-center px-3">
            <img
              src={item.previewUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
            <span className="relative z-10 font-bold text-xs text-white drop-shadow truncate">
              {item.name}
            </span>
          </div>
        )}
      </div>

      {/* 3. Bottom "View Details" Discord Blurple Button (Smooth slide-up on hover) */}
      <div className="absolute inset-x-3 bottom-3 z-30 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="w-full py-2 px-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#5865f2] hover:bg-[#4752c4] active:scale-[0.98] shadow-lg shadow-indigo-500/30 transition-all text-center cursor-pointer"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
