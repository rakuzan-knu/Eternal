import { useState } from 'react';
import { Check, Heart, Gift } from 'lucide-react';
import type { AvatarDecorationDto } from '@social-network/shared-contracts';
import type { FeaturedShopItem } from '../data/featuredCatalog';
import type { UnifiedShopItem } from '../data/allShopItems';
import { AvatarWithDecoration } from '@/shared/ui/AvatarDecoration';
import Tooltip from '@/shared/ui/Tooltip';
import { ProfileFramePreview } from './ProfileFramePreview';
import { isCurrentThemeLight, useThemeStore } from '@/shared/model/useThemeStore';
import { useWishlistStore } from '../model/useWishlistStore';

export interface FeaturedCardProps {
  item: FeaturedShopItem | UnifiedShopItem;
  avatarUrl?: string | null | undefined;
  owned?: boolean;
  active?: boolean;
  isEquipping?: boolean;
  onClick: () => void;
  onEquip?: () => void;
  onSendGift?: () => void;
}

const COLOR_MAP: Record<string, string> = {
  purple: '#8b5cf6',
  blue: '#38bdf8',
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  pink: '#ec4899',
  white: '#ffffff',
  black: '#18181b',
};

export function FeaturedCard({
  item,
  avatarUrl,
  owned = false,
  active = false,
  isEquipping = false,
  onClick,
  onEquip,
  onSendGift,
}: FeaturedCardProps) {
  const isLight = useThemeStore(isCurrentThemeLight);
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(item.id, (item as any).slug));
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const [isHovered, setIsHovered] = useState(false);
  const isBundle = item.category === 'bundle';
  const priceFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(item.priceCents / 100);

  // Derive effective decoration for avatar preview
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
          slug: item.slug,
          name: item.name,
          description: (item as any).description || '',
          assetType: (isLottieDeco ? 'lottie' : 'animated_webp') as any,
          assetUrl: decoAsset || item.previewUrl,
          previewUrl: item.previewUrl,
          rarity: ((item as any).rarity as any) || 'epic',
          priceCents: item.priceCents,
          isAvailable: false,
        }
      : null);

  // Derive effective profile frame
  const effectiveFrame =
    (item as any).frame ||
    (item.category === 'frame'
      ? {
          id: item.id,
          slug: item.slug || item.id,
          name: item.name,
          description: (item as any).description || '',
          family: (item as any).family || 'celestial',
          variant: (item as any).variant || 'default',
          color: (item as any).color || '#8b5cf6',
          accent: (item as any).accent || '#c084fc',
          crownUrl:
            (item as any).crownUrl ||
            item.assetUrl ||
            item.previewUrl.replace('.preview.webp', '.webp'),
          crownPreviewUrl: (item as any).crownPreviewUrl || item.previewUrl,
          cornerUrl:
            (item as any).cornerUrl ||
            item.previewUrl.replace('.crown.preview.webp', '.corner.svg'),
          railUrl:
            (item as any).railUrl || item.previewUrl.replace('.crown.preview.webp', '.rail.svg'),
          footerUrl:
            (item as any).footerUrl ||
            item.previewUrl.replace('.crown.preview.webp', '.footer.svg'),
          animated: true,
          fps: 60,
          durationMs: 3000,
          rarity: (item as any).rarity || 'epic',
          priceCents: item.priceCents || 0,
          isAvailable: false,
        }
      : null);

  // Derive effective nameplate animated video / asset URL
  const nameplateAssetUrl =
    (item as any).assetUrl ||
    (item as any).nameplate?.assetUrl ||
    (item.category === 'nameplate' ? item.previewUrl.replace('.preview.webp', '.mp4') : null);

  // Derive effective profile effect animated asset URL
  const effectAssetUrl =
    (item as any).assetUrl ||
    (item as any).effect?.assetUrl ||
    (item.category === 'effect' ? item.previewUrl.replace('.preview.webp', '.webp') : null);

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

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(item.id, (item as any).slug);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={'Open ' + item.name}
      className="group relative flex flex-col rounded-2xl glass-card border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-gray-900 dark:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8b5cf6] transition-all duration-300 overflow-hidden text-left cursor-pointer select-none hover:shadow-2xl hover:-translate-y-0.5"
    >
      {/* 1. Top-Right "Add to Wishlist" Floating Button (Only visible on hover, HIDDEN if already owned) */}
      {!owned && (
        <Tooltip
          label={isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
          position="left"
          className="absolute top-3 right-3 z-30 opacity-0 -translate-y-1 scale-90 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-300 ease-out"
        >
          <button
            type="button"
            onClick={handleWishlistToggle}
            aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            className={
              'w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all ' +
              (isWishlisted
                ? 'bg-[#8b5cf6] text-white shadow-md shadow-purple-500/30'
                : 'bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 hover:text-gray-950 dark:text-white/80 dark:hover:text-white shadow-md border border-black/10 dark:border-white/15 backdrop-blur-xl')
            }
          >
            <Heart
              size={16}
              className={
                'transition-transform active:scale-90 ' +
                (isWishlisted ? 'fill-current text-white' : '')
              }
            />
          </button>
        </Tooltip>
      )}

      {/* 2. Media Preview Box (Seamless with card background, matching Discord) */}
      <div
        className="relative h-52 sm:h-56 w-full flex items-center justify-center p-4 overflow-hidden select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Subtle ambient glow on card hover */}
        <div className="absolute inset-0 bg-radial from-purple-500/0 group-hover:from-purple-500/10 transition-colors pointer-events-none" />

        {/* Big centered Checkmark badge when item is owned (matches Discord screenshot 1) */}
        {owned && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center border border-white/15 shadow-xl">
              <Check
                size={22}
                strokeWidth={3.5}
                className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              />
            </div>
          </div>
        )}

        {isBundle ? (
          /* Multi-item Bundle Showcase Preview */
          <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-4 w-full max-w-[260px]">
            {/* Decoration Avatar */}
            {bundleDecoration ? (
              <div className="shrink-0 flex items-center justify-center">
                <AvatarWithDecoration
                  avatarUrl={avatarUrl}
                  decoration={bundleDecoration}
                  size="lg"
                  motion={true}
                />
              </div>
            ) : null}

            {/* Profile Frame Preview Mini-Card */}
            {pieces[1]?.previewUrl && (
              <div className="relative w-24 h-32 sm:w-26 sm:h-36 shrink-0 rounded-xl border border-black/10 dark:border-white/10 bg-black/10 dark:bg-black/35 backdrop-blur-xs flex flex-col items-center justify-center p-2 shadow-lg overflow-hidden">
                <img
                  src={
                    isHovered
                      ? pieces[1].assetUrl || pieces[1].previewUrl.replace('.preview.webp', '.webp')
                      : pieces[1].previewUrl
                  }
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            )}
          </div>
        ) : item.category === 'avatar' && effectiveDecoration ? (
          /* Avatar Decoration on avatar (Screenshot 1 & 2) always animated */
          <div className="relative z-10 flex items-center justify-center">
            <AvatarWithDecoration
              avatarUrl={avatarUrl}
              decoration={effectiveDecoration}
              size="xl"
              motion={true}
            />
          </div>
        ) : item.category === 'frame' ? (
          /* Profile Frame Mini-Card Mockup with hover-activated priority animation */
          <div className="relative z-10 w-32 h-44 flex items-center justify-center">
            {effectiveFrame ? (
              <div className="w-full h-full scale-[0.82] origin-center pointer-events-none">
                <ProfileFramePreview
                  item={effectiveFrame}
                  avatarUrl={avatarUrl}
                  priority={isHovered}
                />
              </div>
            ) : (
              <div className="relative w-28 h-40 rounded-xl border border-black/10 dark:border-white/10 bg-black/10 dark:bg-black/35 backdrop-blur-xs flex flex-col items-center justify-center p-2 shadow-xl">
                <img
                  src={isHovered && item.assetUrl ? item.assetUrl : item.previewUrl}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-contain pointer-events-none scale-105"
                />
              </div>
            )}
          </div>
        ) : item.category === 'nameplate' ? (
          /* Nameplate Chat Message Mockup with hover-activated video / animation */
          <div className="relative z-10 w-full max-w-[240px] px-2.5 py-3 rounded-xl border border-black/10 dark:border-white/15 bg-black/15 dark:bg-black/40 backdrop-blur-xs shadow-lg flex flex-col gap-2">
            {/* Header row with mini avatar and Nameplate banner */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 shrink-0 overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/10" />
                )}
              </div>
              <div className="flex-1 h-7 rounded-md overflow-hidden relative border border-white/15 shadow-sm flex items-center px-2">
                <img
                  src={item.previewUrl}
                  alt=""
                  loading="lazy"
                  className={
                    'absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-200 ' +
                    (isHovered && nameplateAssetUrl ? 'opacity-0' : 'opacity-100')
                  }
                />
                {isHovered &&
                  nameplateAssetUrl &&
                  (nameplateAssetUrl.includes('.mp4') || nameplateAssetUrl.includes('.webm') ? (
                    <video
                      src={nameplateAssetUrl}
                      poster={item.previewUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <img
                      src={nameplateAssetUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />
                  ))}
                {/* Discord-style username placeholder bar (clean, no duplicate text clash) */}
                <div className="relative z-10 h-2.5 w-16 rounded-full bg-white/25 backdrop-blur-xs" />
              </div>
            </div>
            {/* Chat line placeholders */}
            <div className="ml-9 space-y-1" aria-hidden="true">
              <div
                className={
                  isLight
                    ? 'h-1.5 w-3/4 rounded-full bg-zinc-200'
                    : 'h-1.5 w-3/4 rounded-full bg-white/10'
                }
              />
              <div
                className={
                  isLight
                    ? 'h-1.5 w-1/2 rounded-full bg-zinc-100'
                    : 'h-1.5 w-1/2 rounded-full bg-white/5'
                }
              />
            </div>
          </div>
        ) : (
          /* Profile Effect Backdrop Mockup with hover-activated animated asset */
          <div className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden">
            <img
              src={item.previewUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-90 transition-transform duration-500 group-hover:scale-105"
            />
            {isHovered && effectAssetUrl && (
              <img
                src={effectAssetUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-1"
              />
            )}
            <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/60 pointer-events-none z-2" />
            <div className="relative z-10 w-16 h-16 rounded-full bg-black/40 border-2 border-white/15 shadow-2xl backdrop-blur-xs flex items-center justify-center overflow-hidden z-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover opacity-85" />
              ) : (
                <div className="w-full h-full bg-white/10" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Info Body: Seamless with Card, Item Name + Price vs Hover Action Buttons */}
      <div className="p-4 pt-1 flex flex-col justify-between flex-1 gap-2">
        {/* Title */}
        <h3
          className={
            'text-sm sm:text-base font-bold line-clamp-1 ' +
            (isLight ? 'text-zinc-900' : 'text-white')
          }
        >
          {item.name}
        </h3>

        {/* Dynamic Row: Default (Price) vs Hover Actions (PiP-like smooth animation) */}
        <div className="relative min-h-[38px] flex flex-col [@media(hover:hover)]:flex-row items-stretch [@media(hover:hover)]:items-center">
          {/* Default (non-hover): Price always visible for clarity */}
          <div
            className={
              'w-full flex items-center justify-between transition-all duration-300 ease-out ' +
              '[@media(hover:hover)]:group-hover:opacity-0 [@media(hover:hover)]:group-hover:-translate-y-1 [@media(hover:hover)]:group-hover:pointer-events-none [@media(hover:hover)]:group-focus-within:opacity-0 [@media(hover:hover)]:group-focus-within:pointer-events-none'
            }
          >
            <div className="flex items-center gap-2">
              <span
                className={
                  isLight
                    ? 'text-sm sm:text-base font-bold text-zinc-900 tracking-tight'
                    : 'text-sm sm:text-base font-bold text-white tracking-tight'
                }
              >
                {priceFormatted}
              </span>
              {isBundle && (item as any).discountPercent ? (
                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                  (-{(item as any).discountPercent}%)
                </span>
              ) : null}
            </div>

            {/* Genuine color variant dots */}
            {'colors' in item && item.colors && item.colors.length > 1 ? (
              <div className="flex items-center gap-1" aria-hidden="true">
                {item.colors.slice(0, 3).map((col) => (
                  <span
                    key={col}
                    style={{ backgroundColor: COLOR_MAP[col] || col }}
                    className="w-2.5 h-2.5 rounded-full border border-black/40 inline-block shadow-sm"
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* Hover state: Action buttons (PiP-like slide up & fade in) */}
          <div
            className={
              'relative mt-2 flex items-center gap-2 transition-all duration-300 ease-out ' +
              '[@media(hover:hover)]:absolute [@media(hover:hover)]:mt-0 [@media(hover:hover)]:inset-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:scale-[0.98] [@media(hover:hover)]:pointer-events-none ' +
              'group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:pointer-events-auto'
            }
          >
            {/* Primary button: Buy for / Use now (clean text, no star) / Equipped */}
            {!owned ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                className="flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#8b5cf6] hover:bg-[#7c3aed] active:scale-[0.98] shadow-md shadow-purple-500/25 transition-all text-center flex items-center justify-center truncate cursor-pointer"
              >
                Buy for {priceFormatted}
              </button>
            ) : !active ? (
              <button
                type="button"
                disabled={isEquipping}
                onClick={(e) => {
                  e.stopPropagation();
                  onEquip?.();
                }}
                className="flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#8b5cf6] hover:bg-[#7c3aed] active:scale-[0.98] shadow-md shadow-purple-500/25 transition-all text-center flex items-center justify-center truncate cursor-pointer"
              >
                <span>{isEquipping ? 'Applying…' : 'Use now'}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm text-white/50 bg-white/10 border border-white/5 cursor-not-allowed text-center flex items-center justify-center gap-1.5 truncate"
              >
                <Check size={16} strokeWidth={3} className="shrink-0 text-white/60" />
                <span>Equipped</span>
              </button>
            )}

            {/* Gift button: ALWAYS rendered beside action button as in Discord */}
            <Tooltip label="Send a gift" position="top">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSendGift) onSendGift();
                  else onClick();
                }}
                aria-label="Send a gift"
                className="p-2 rounded-xl text-white bg-[#8b5cf6] hover:bg-[#7c3aed] active:scale-[0.98] shadow-md shadow-purple-500/25 transition-all shrink-0 flex items-center justify-center cursor-pointer"
              >
                <Gift size={16} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
