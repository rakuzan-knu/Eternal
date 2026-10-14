import { useEffect, useState } from 'react';
import {
  Check,
  CheckCheck,
  Heart,
  Share2,
  X,
  Gift,
  Sparkles,
  Smile,
  Plus,
  Send,
  PawPrint,
  Swords,
  Gamepad2,
  Orbit,
  Wand2,
  Moon,
  Leaf,
  Ghost,
  Snowflake,
} from 'lucide-react';
import type {
  AvatarDecorationDto,
  ProfileEffectDto,
  ProfileFrameDto,
  NameplateDto,
} from '@social-network/shared-contracts';
import { AvatarWithDecoration } from '@/shared/ui/AvatarDecoration';
import { Nameplate } from '@/shared/ui/Nameplate';
import { ProfileFrameSurface } from '@/shared/ui/ProfileFrame';
import Tooltip from '@/shared/ui/Tooltip';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { isCurrentThemeLight, useThemeStore } from '@/shared/model/useThemeStore';
import { useWishlistStore } from '../model/useWishlistStore';
import type { ShopItemTheme } from '../data/allShopItems';

export interface ShopItemModalProps {
  item: any;
  avatarUrl?: string | null | undefined;
  user?: any;
  owned: boolean;
  active: boolean;
  pending?: boolean;
  error?: boolean;
  onClose: () => void;
  onEquip: () => void;
  onSendGift?: () => void;
  onSelectTheme?: (theme: string) => void;
}

function renderThemeIcon(theme: string) {
  switch (theme) {
    case 'Animals & Pets':
      return <PawPrint size={13} className="text-amber-300" />;
    case 'Anime':
      return <Swords size={13} className="text-pink-300" />;
    case 'Gaming':
      return <Gamepad2 size={13} className="text-emerald-300" />;
    case 'Cute & Cozy':
      return <Heart size={13} className="text-rose-300" />;
    case 'Sci-Fi':
      return <Orbit size={13} className="text-cyan-300" />;
    case 'Fantasy':
      return <Wand2 size={13} className="text-purple-300" />;
    case 'Dark & Moody':
      return <Moon size={13} className="text-indigo-300" />;
    case 'Nature':
      return <Leaf size={13} className="text-green-300" />;
    case 'Halloween':
      return <Ghost size={13} className="text-orange-400" />;
    case 'Winter':
      return <Snowflake size={13} className="text-sky-300" />;
    default:
      return <Sparkles size={13} className="text-purple-300" />;
  }
}

export function ShopItemModal({
  item,
  avatarUrl,
  user,
  owned,
  active,
  pending = false,
  error = false,
  onClose,
  onEquip,
  onSendGift,
  onSelectTheme,
}: ShopItemModalProps) {
  const isLight = useThemeStore(isCurrentThemeLight);
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(item?.id, item?.slug));
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const [copied, setCopied] = useState(false);

  const { data: currentUser } = useCurrentUser();
  const effectiveUser = user || currentUser;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle Share link copy
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (typeof window !== 'undefined' && navigator.clipboard) {
        const url = `${window.location.origin}/shop?item=${encodeURIComponent(item.slug || item.id)}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  const category = item.category || (item.pieces ? 'bundle' : 'avatar');
  const priceFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format((item.priceCents || 0) / 100);

  // Resolve theme
  const itemTheme: ShopItemTheme =
    item.theme ||
    (item.slug?.includes('anime')
      ? 'Anime'
      : item.slug?.includes('dark') || item.slug?.includes('soul') || item.slug?.includes('night')
        ? 'Dark & Moody'
        : item.slug?.includes('cyber') || item.slug?.includes('orbit')
          ? 'Sci-Fi'
          : item.slug?.includes('rose') || item.slug?.includes('butterfly')
            ? 'Nature'
            : item.slug?.includes('cat') ||
                item.slug?.includes('dog') ||
                item.slug?.includes('bear')
              ? 'Animals & Pets'
              : 'Fantasy');

  // Concise 1-liner English description matching Discord 1:1
  const itemDescription =
    category === 'avatar'
      ? 'Give your avatar a new look.'
      : category === 'nameplate'
        ? 'Make your name stand out in servers and chats.'
        : category === 'frame'
          ? 'Elevate and wrap your profile with a frame.'
          : category === 'effect'
            ? 'Show this effect when others view your profile.'
            : 'A curated collection of profile cosmetics.';

  // Real user data
  const userName = effectiveUser?.displayName || effectiveUser?.username || 'Ayate';
  const userHandle = effectiveUser?.username || 'ayate';
  const userAvatar = avatarUrl || effectiveUser?.avatar || null;
  const userBanner = effectiveUser?.banner || null;
  const userBio = effectiveUser?.bio || 'Exploring new realms and customizing my profile.';

  const decoAsset = item.assetUrl || item.previewUrl?.replace('.preview.webp', '.webp');
  const isLottieDeco =
    Boolean(decoAsset?.endsWith('.json')) ||
    Boolean(item.previewUrl?.endsWith('.json')) ||
    item.serverDecoration?.assetType === 'lottie';

  // Effective decoration
  const effectiveDecoration: AvatarDecorationDto =
    item.serverDecoration ||
    item.avatarDecoration ||
    (category === 'avatar'
      ? {
          id: item.id,
          slug: item.slug || item.id,
          name: item.name,
          description: '',
          assetType: isLottieDeco ? 'lottie' : 'animated_webp',
          assetUrl: decoAsset || item.previewUrl,
          previewUrl: item.previewUrl,
          rarity: item.rarity || 'epic',
          priceCents: item.priceCents || 0,
          isAvailable: false,
        }
      : {
          id: 'mock',
          slug: 'mock',
          name: '',
          description: '',
          assetType: 'animated_webp',
          assetUrl: item.previewUrl,
          previewUrl: item.previewUrl,
          rarity: 'epic',
          priceCents: 0,
          isAvailable: false,
        });

  // Effective nameplate
  const effectiveNameplate: NameplateDto =
    item.nameplate ||
    (category === 'nameplate'
      ? {
          id: item.id,
          slug: item.slug || item.id,
          name: item.name,
          description: '',
          assetType: item.assetUrl?.endsWith('.webm') ? 'video' : 'animated_webp',
          assetUrl: item.assetUrl || item.previewUrl,
          previewUrl: item.previewUrl,
          rarity: item.rarity || 'epic',
          priceCents: item.priceCents || 0,
          isAvailable: false,
        }
      : null);

  // Effective frame
  const effectiveFrame: ProfileFrameDto =
    item.frame ||
    (category === 'frame'
      ? {
          id: item.id,
          slug: item.slug || item.id,
          name: item.name,
          description: '',
          family: item.family || 'celestial',
          variant: item.variant || 'default',
          color: item.color || '#9333ea',
          accent: item.accent || '#c084fc',
          crownUrl: item.crownUrl || item.previewUrl,
          crownPreviewUrl: item.crownPreviewUrl || item.previewUrl,
          cornerUrl: item.cornerUrl || item.previewUrl,
          railUrl: item.railUrl || item.previewUrl,
          footerUrl: item.footerUrl || item.previewUrl,
          animated: Boolean(item.animated),
          fps: item.fps || 30,
          durationMs: item.durationMs || 3000,
          rarity: item.rarity || 'epic',
          priceCents: item.priceCents || 0,
          isAvailable: false,
        }
      : null);

  // Effective effect
  const effectiveEffect: ProfileEffectDto =
    item.effect ||
    (category === 'effect'
      ? {
          id: item.id,
          slug: item.slug || item.id,
          name: item.name,
          description: '',
          variant: item.variant || 'default',
          family: item.family || 'sparkle',
          assetType: 'animated_webp',
          assetUrl: item.assetUrl || item.previewUrl,
          previewUrl: item.previewUrl,
          width: item.width || 640,
          height: item.height || 1120,
          fps: item.fps || 60,
          durationMs: item.durationMs || 8000,
          avatarAnchorX: item.avatarAnchorX ?? 0.16,
          avatarAnchorY: item.avatarAnchorY ?? 0.22,
          rarity: item.rarity || 'epic',
          priceCents: item.priceCents || 0,
          isAvailable: false,
        }
      : null);

  const bundlePieces = item.pieces || item.bundle?.pieces || [];
  const bundleDecoPiece = bundlePieces.find((p: any) => p.type === 'decoration') || bundlePieces[0];
  const bundleFramePiece = bundlePieces.find((p: any) => p.type === 'frame') || bundlePieces[1];
  const bundleNameplatePiece =
    bundlePieces.find((p: any) => p.type === 'nameplate') || bundlePieces[2];

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

  const bundleFrame: ProfileFrameDto | null = bundleFramePiece
    ? {
        id: bundleFramePiece.id || 'bundle-frame',
        slug: bundleFramePiece.slug || 'bundle-frame',
        name: bundleFramePiece.name || bundleFramePiece.title || 'Profile Frame',
        description: '',
        family: 'celestial',
        variant: 'default',
        color: '#8b5cf6',
        accent: '#c084fc',
        crownUrl:
          bundleFramePiece.assetUrl ||
          bundleFramePiece.previewUrl.replace('.crown.preview.webp', '.crown.webp'),
        crownPreviewUrl: bundleFramePiece.previewUrl,
        cornerUrl: bundleFramePiece.previewUrl.replace('.crown.preview.webp', '.corner.svg'),
        railUrl: bundleFramePiece.previewUrl.replace('.crown.preview.webp', '.rail.svg'),
        footerUrl: bundleFramePiece.previewUrl.replace('.crown.preview.webp', '.footer.svg'),
        animated: true,
        fps: 60,
        durationMs: 3000,
        rarity: 'epic',
        priceCents: 0,
        isAvailable: false,
      }
    : null;

  const bundleNameplate: NameplateDto | null = bundleNameplatePiece
    ? {
        id: bundleNameplatePiece.id || 'bundle-nameplate',
        slug: bundleNameplatePiece.slug || 'bundle-nameplate',
        name: bundleNameplatePiece.name || bundleNameplatePiece.title || 'Nameplate',
        description: '',
        assetType: 'video',
        assetUrl:
          bundleNameplatePiece.assetUrl ||
          bundleNameplatePiece.previewUrl.replace('.preview.webp', '.mp4'),
        previewUrl: bundleNameplatePiece.previewUrl,
        width: 640,
        height: 160,
        fps: 30,
        durationMs: 3000,
        shadeOpacity: 0.35,
        rarity: 'epic',
        priceCents: 0,
        isAvailable: false,
      }
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="decoration-name"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-4xl lg:max-w-5xl h-[560px] sm:h-[600px] max-h-[92vh] flex flex-col md:flex-row rounded-3xl glass-panel border border-black/10 dark:border-white/15 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 select-none text-gray-900 dark:text-white"
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= 1. LEFT PANEL: Overview & Action Buttons ================= */}
        <div
          className="w-full md:w-[340px] lg:w-[380px] shrink-0 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-black/25 backdrop-blur-md transition-colors overflow-hidden select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Top Preview */}
          <div
            className="flex flex-col items-center justify-center min-h-[190px] select-none"
            onContextMenu={(e) => e.preventDefault()}
          >
            {category === 'avatar' ? (
              <div className="relative w-36 h-36 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-purple-500/10 blur-xl pointer-events-none" />
                <AvatarWithDecoration
                  avatarUrl={userAvatar}
                  decoration={effectiveDecoration}
                  size="xl"
                  status="online"
                />
              </div>
            ) : category === 'frame' ? (
              <div className="w-32 h-44 flex items-center justify-center">
                <ProfileFrameSurface frame={effectiveFrame} radius={14} priority={true}>
                  <div className="w-24 h-36 rounded-[14px] bg-black/30 backdrop-blur-xs border border-white/10 overflow-hidden relative p-2.5 flex flex-col justify-between">
                    <div className="w-8 h-8 rounded-full bg-white/15 overflow-hidden">
                      {userAvatar ? (
                        <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="space-y-1.5" aria-hidden="true">
                      <div className="h-1.5 w-12 rounded bg-white/20" />
                      <div className="h-1 w-14 rounded bg-white/10" />
                    </div>
                  </div>
                </ProfileFrameSurface>
              </div>
            ) : category === 'nameplate' ? (
              <div className="w-full max-w-[270px]">
                <div className="nameplate-row relative flex items-center gap-3 p-3 rounded-2xl overflow-hidden border border-white/20 bg-black/40 shadow-xl">
                  <Nameplate nameplate={effectiveNameplate} alwaysPlay={true} />
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/20">
                    {userAvatar ? (
                      <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div data-nameplate-text className="flex flex-col min-w-0 flex-1 z-10">
                    <span
                      data-nameplate-label
                      className="font-bold text-sm text-white drop-shadow truncate"
                    >
                      {userName}
                    </span>
                    <span className="text-xs text-white/70 truncate">@{userHandle}</span>
                  </div>
                </div>
              </div>
            ) : category === 'effect' ? (
              /* Mini Profile Card Silhouette with Always-Animated Effect */
              <div className="relative w-28 h-44 rounded-2xl bg-white/[0.04] border border-white/15 overflow-hidden flex flex-col p-3 shadow-lg select-none">
                <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden shrink-0 border border-white/20">
                  {userAvatar ? (
                    <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="mt-3 space-y-1.5" aria-hidden="true">
                  <div className="h-1.5 w-12 rounded bg-white/25" />
                  <div className="h-1.5 w-16 rounded bg-white/10" />
                  <div className="h-1.5 w-10 rounded bg-white/10" />
                </div>
                <img
                  src={effectiveEffect?.assetUrl || item.assetUrl || item.previewUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-10"
                />
              </div>
            ) : (
              /* Assembled Bundle Avatar with Decoration */
              <div className="relative w-36 h-36 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-purple-500/10 blur-xl pointer-events-none" />
                <AvatarWithDecoration
                  avatarUrl={userAvatar}
                  decoration={bundleDecoration}
                  size="xl"
                  status="online"
                />
              </div>
            )}
          </div>

          {/* Middle Details */}
          <div className="my-auto py-2">
            <h2
              id="decoration-name"
              className={
                'text-2xl font-bold tracking-tight line-clamp-1 ' +
                (isLight ? 'text-zinc-900' : 'text-white')
              }
            >
              {item.name}
            </h2>
            <p
              className={
                'mt-2 text-sm leading-relaxed ' + (isLight ? 'text-zinc-500' : 'text-white/60')
              }
            >
              {itemDescription}
            </p>
          </div>

          {/* Bottom Actions Row */}
          <div>
            {!owned ? (
              /* Unowned: "Buy for $X.XX" button + Gift button */
              <div className="flex items-center gap-2.5 pt-3">
                <button
                  type="button"
                  disabled={!owned || pending}
                  onClick={onEquip}
                  aria-label="Sales closed for now"
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#8b5cf6] hover:bg-[#7c3aed] active:scale-[0.98] shadow-lg shadow-purple-500/25 transition-all text-center truncate cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {pending ? 'Saving…' : `Buy for ${priceFormatted}`}
                </button>
                <Tooltip label="Send a gift" position="top">
                  <button
                    type="button"
                    onClick={onSendGift ? onSendGift : onClose}
                    aria-label="Send a gift"
                    className="p-3 rounded-xl text-white bg-[#8b5cf6] hover:bg-[#7c3aed] active:scale-[0.98] shadow-lg shadow-purple-500/25 transition-all shrink-0 flex items-center justify-center cursor-pointer"
                  >
                    <Gift size={18} />
                  </button>
                </Tooltip>
              </div>
            ) : (
              /* Owned: No price, clean "Use now" / "Equipped" button + Gift button */
              <div className="flex items-center gap-2.5 pt-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={onEquip}
                  aria-label={active ? 'Unequip frame' : 'Equip frame'}
                  className={
                    'flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all text-center flex items-center justify-center gap-2 cursor-pointer ' +
                    (active
                      ? isLight
                        ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800 border border-black/10'
                        : 'bg-white/10 hover:bg-white/15 text-white/90 border border-white/10'
                      : 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-lg shadow-purple-500/25')
                  }
                >
                  {pending ? (
                    <span>Saving…</span>
                  ) : active ? (
                    <>
                      <Check
                        size={18}
                        strokeWidth={3}
                        className={isLight ? 'text-zinc-700' : 'text-white/80'}
                      />
                      <span>Equipped</span>
                    </>
                  ) : (
                    <span>Use now</span>
                  )}
                </button>
                <Tooltip label="Send a gift" position="top">
                  <button
                    type="button"
                    onClick={onSendGift ? onSendGift : onClose}
                    aria-label="Send a gift"
                    className="p-3 rounded-xl text-white bg-[#8b5cf6] hover:bg-[#7c3aed] active:scale-[0.98] shadow-lg shadow-purple-500/25 transition-all shrink-0 flex items-center justify-center cursor-pointer"
                  >
                    <Gift size={18} />
                  </button>
                </Tooltip>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-2 text-xs text-rose-400">
                Failed to update decoration. Please try again.
              </p>
            )}
          </div>
        </div>

        {/* ================= 2. RIGHT PANEL: Atmospheric Liquid Glass Backdrop with Live Platform Preview ================= */}
        <div
          className="flex-1 relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#240a45] via-[#4a1575] to-[#120b24] select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Ambient luminous glow blobs */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-fuchsia-600/25 rounded-full blur-3xl pointer-events-none" />

          {/* Top-Left: Collection Tag Button pinned to the corner */}
          <Tooltip
            label={`Show more in ${itemTheme}`}
            position="bottom"
            className="absolute top-4 left-4 z-20"
          >
            <button
              type="button"
              onClick={() => onSelectTheme?.(itemTheme)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-md shadow-lg flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              {renderThemeIcon(itemTheme)}
              <span>{itemTheme}</span>
            </button>
          </Tooltip>

          {/* Top-Right: Liquid Glass Buttons pinned to the corner */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            {!owned && (
              <Tooltip label={isWishlisted ? 'In Wishlist' : 'Add to Wishlist'} position="bottom">
                <button
                  type="button"
                  onClick={() => toggleWishlist(item?.id, item?.slug)}
                  aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  className={
                    'w-9 h-9 rounded-full border backdrop-blur-md flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer ' +
                    (isWishlisted
                      ? 'bg-[#8b5cf6] text-white border-purple-400/50 shadow-purple-500/30'
                      : 'bg-black/40 hover:bg-black/60 text-white/90 hover:text-white border-white/20')
                  }
                >
                  <Heart size={16} className={isWishlisted ? 'fill-current' : ''} />
                </button>
              </Tooltip>
            )}

            <Tooltip label={copied ? 'Link copied!' : 'Share'} position="bottom">
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share"
                className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-white/90 hover:text-white backdrop-blur-md flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
              >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
              </button>
            </Tooltip>

            <Tooltip label="Close" position="bottom">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-white/90 hover:text-white backdrop-blur-md flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
              >
                <X size={18} />
              </button>
            </Tooltip>
          </div>

          {/* Center: Live Platform Mockup (Centered, No Scrollbar) */}
          <div className="flex-1 flex items-center justify-center relative my-auto p-4 sm:p-6">
            {category === 'avatar' ? (
              /* Avatar Decoration: Real Profile Card + Live Messenger Message & Input Composer */
              <div className="relative w-[340px] sm:w-[380px] h-[360px] flex items-center justify-center select-none">
                {/* Back Layer: Real User Profile Card */}
                <div className="absolute top-2 left-2 w-[280px] sm:w-[300px] rounded-2xl bg-[#111214]/95 backdrop-blur-2xl border border-white/15 shadow-2xl overflow-hidden">
                  {/* Banner */}
                  <div className="h-20 w-full overflow-hidden bg-gradient-to-r from-violet-600/80 via-purple-700/80 to-indigo-800/80 relative">
                    {userBanner ? (
                      <img src={userBanner} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  {/* Profile Info */}
                  <div className="px-4 pb-3">
                    <div className="relative -mt-7 mb-1.5 inline-block">
                      <AvatarWithDecoration
                        avatarUrl={userAvatar}
                        decoration={effectiveDecoration}
                        size="lg"
                        status="online"
                      />
                    </div>
                    <div className="font-bold text-sm text-white truncate">{userName}</div>
                    <div className="text-[11px] text-white/50 truncate">@{userHandle}</div>
                    <div className="mt-2 pt-2 border-t border-white/10 text-xs">
                      <div className="text-[9px] uppercase font-bold text-white/40 tracking-wider mb-0.5">
                        About Me
                      </div>
                      <p className="text-[11px] text-white/70 line-clamp-2 leading-relaxed">
                        {userBio}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Front Layer: Platform's 1:1 Messenger Bubble & Composer */}
                <div className="absolute bottom-2 right-2 w-[270px] sm:w-[290px] rounded-2xl bg-[#14151e]/98 backdrop-blur-2xl border border-white/20 p-3 shadow-[0_25px_60px_rgba(0,0,0,0.85)] z-10 space-y-2.5">
                  {/* Real Message Bubble with Sender Avatar */}
                  <div className="flex items-start gap-2.5">
                    <div className="shrink-0 relative">
                      <AvatarWithDecoration
                        avatarUrl={userAvatar}
                        decoration={effectiveDecoration}
                        size="sm"
                      />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-semibold text-xs text-purple-300 truncate">
                          {userName}
                        </span>
                        <span className="text-[10px] text-white/40">5:47 PM</span>
                      </div>
                      <div className="relative px-3 py-1.5 rounded-2xl rounded-tl-sm bg-[#1e202f]/90 border border-white/10 text-xs text-white/95 leading-relaxed shadow-md flex items-end justify-between gap-2">
                        <span>Look at my beautiful decoration</span>
                        <CheckCheck size={13} className="text-purple-400 shrink-0 stroke-2" />
                      </div>
                    </div>
                  </div>

                  {/* Platform's Messenger Composer Input */}
                  <div className="relative w-full rounded-xl bg-[#0e0f17]/90 border border-white/15 px-2.5 py-1.5 flex items-center gap-2 shadow-inner">
                    <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
                    <Plus size={14} className="text-purple-400 shrink-0" />
                    <span className="text-xs text-white/40 flex-1 truncate">Message...</span>
                    <Smile size={14} className="text-white/50 shrink-0" />
                    <Send size={12} className="text-purple-400 shrink-0" />
                  </div>
                </div>
              </div>
            ) : category === 'nameplate' ? (
              /* Nameplate: Live Member List with Animated Nameplate on ENTIRE Row */
              <div className="w-[280px] sm:w-[310px] rounded-2xl bg-[#111214]/95 backdrop-blur-2xl border border-white/15 p-4 shadow-2xl space-y-2 select-none">
                <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">
                  ONLINE — 4
                </div>
                {/* Current User with Animated Nameplate covering ENTIRE block */}
                <div className="nameplate-row relative flex items-center gap-3 p-2.5 rounded-xl overflow-hidden shadow-lg border border-white/20">
                  <Nameplate nameplate={effectiveNameplate} alwaysPlay={true} />
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-white/20">
                      {userAvatar ? (
                        <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#111214]" />
                  </div>
                  <div data-nameplate-text className="flex flex-col min-w-0 flex-1 z-10">
                    <span
                      data-nameplate-label
                      className="font-bold text-xs text-white drop-shadow truncate"
                    >
                      {userName}
                    </span>
                    <span className="text-[10px] text-white/70 truncate">Playing with styles</span>
                  </div>
                </div>
                {/* Other members */}
                <div className="flex items-center gap-2.5 px-2 py-1.5 opacity-70">
                  <div className="relative shrink-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/40 flex items-center justify-center text-xs font-bold text-white">
                      M
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#111214]" />
                  </div>
                  <span className="text-xs text-white/80 font-medium">Mallow</span>
                </div>
                <div className="flex items-center gap-2.5 px-2 py-1.5 opacity-70">
                  <div className="relative shrink-0">
                    <div className="w-7 h-7 rounded-full bg-pink-500/40 flex items-center justify-center text-xs font-bold text-white">
                      P
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#111214]" />
                  </div>
                  <span className="text-xs text-white/80 font-medium">Phibi</span>
                </div>
                <div className="flex items-center gap-2.5 px-2 py-1.5 opacity-70">
                  <div className="relative shrink-0">
                    <div className="w-7 h-7 rounded-full bg-amber-500/40 flex items-center justify-center text-xs font-bold text-white">
                      L
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#111214]" />
                  </div>
                  <span className="text-xs text-white/80 font-medium">Locke</span>
                </div>
              </div>
            ) : category === 'effect' ? (
              /* Profile Effect: Live Profile Card with Always-Animated Effect overlay & NO input field */
              <div className="relative w-[280px] sm:w-[300px] rounded-2xl bg-[#111214]/95 backdrop-blur-2xl border border-white/15 overflow-hidden shadow-2xl select-none">
                {/* Banner */}
                <div className="h-24 w-full overflow-hidden bg-gradient-to-r from-violet-600/80 via-purple-700/80 to-indigo-800/80 relative">
                  {userBanner ? (
                    <img src={userBanner} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                {/* Profile Info */}
                <div className="px-5 pb-5">
                  <div className="relative -mt-8 mb-2 inline-block">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#111214] bg-white/10 shadow-xl">
                      {userAvatar ? (
                        <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#111214]" />
                  </div>
                  <h4 className="text-base font-bold text-white leading-tight truncate">
                    {userName}
                  </h4>
                  <div className="text-xs text-white/50 truncate">@{userHandle}</div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-xs">
                    <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1">
                      About Me
                    </div>
                    <p className="text-xs text-white/70 line-clamp-3 leading-relaxed">{userBio}</p>
                  </div>
                </div>
                {/* Always-Animated Effect Overlay */}
                <img
                  src={effectiveEffect?.assetUrl || item.assetUrl || item.previewUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-30"
                />
              </div>
            ) : category === 'frame' ? (
              /* Profile Frame: Real ProfileFrameSurface around Profile Card & NO input field */
              <ProfileFrameSurface
                frame={effectiveFrame}
                radius={22}
                priority={true}
                className="w-[300px] sm:w-[320px]"
              >
                <div className="w-full overflow-hidden rounded-[22px] bg-[#111214]/95 backdrop-blur-2xl border border-white/10 text-white shadow-2xl">
                  {/* Banner */}
                  <div className="h-24 w-full overflow-hidden bg-gradient-to-r from-violet-600/80 via-purple-700/80 to-indigo-800/80 relative">
                    {userBanner ? (
                      <img src={userBanner} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  {/* Profile Info */}
                  <div className="px-5 pb-5">
                    <div className="relative -mt-8 mb-2 inline-block">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#111214] bg-white/10 shadow-lg">
                        {userAvatar ? (
                          <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#111214]" />
                    </div>
                    <h4 className="text-base font-bold text-white leading-tight truncate">
                      {userName}
                    </h4>
                    <div className="text-xs text-white/50 truncate">@{userHandle}</div>
                    <div className="mt-3 pt-3 border-t border-white/10 text-xs">
                      <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1">
                        About Me
                      </div>
                      <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">
                        {userBio}
                      </p>
                    </div>
                  </div>
                </div>
              </ProfileFrameSurface>
            ) : (
              /* Bundles Showcase: Live Discord Profile Preview with Bundle Equipped + Pieces Grid */
              <div className="flex flex-col items-center gap-3 select-none w-full max-w-[340px] sm:max-w-[370px]">
                {/* Composite Profile Card: Frame + Banner + Avatar Decoration + Nameplate */}
                <div className="relative w-full rounded-2xl bg-[#111214]/95 backdrop-blur-2xl border border-white/15 overflow-hidden shadow-2xl">
                  {bundleFrame ? (
                    <ProfileFrameSurface frame={bundleFrame} radius={18} priority={true}>
                      <div className="w-full">
                        {/* Banner */}
                        <div className="h-16 w-full overflow-hidden bg-gradient-to-r from-violet-600/80 via-purple-700/80 to-indigo-800/80 relative">
                          {userBanner ? (
                            <img src={userBanner} alt="" className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        {/* Profile Info */}
                        <div className="px-4 pb-3 flex items-center gap-3">
                          <div className="relative -mt-6 shrink-0">
                            <AvatarWithDecoration
                              avatarUrl={userAvatar}
                              decoration={bundleDecoration}
                              size="md"
                              status="online"
                            />
                          </div>
                          <div className="min-w-0 flex-1 pt-1 text-left">
                            <div className="font-bold text-sm text-white truncate">{userName}</div>
                            <div className="text-[11px] text-white/50 truncate">@{userHandle}</div>
                          </div>
                        </div>
                      </div>
                    </ProfileFrameSurface>
                  ) : (
                    <div className="w-full">
                      {/* Banner */}
                      <div className="h-16 w-full overflow-hidden bg-gradient-to-r from-violet-600/80 via-purple-700/80 to-indigo-800/80 relative">
                        {userBanner ? (
                          <img src={userBanner} alt="" className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      {/* Profile Info */}
                      <div className="px-4 pb-3 flex items-center gap-3">
                        <div className="relative -mt-6 shrink-0">
                          <AvatarWithDecoration
                            avatarUrl={userAvatar}
                            decoration={bundleDecoration}
                            size="md"
                            status="online"
                          />
                        </div>
                        <div className="min-w-0 flex-1 pt-1 text-left">
                          <div className="font-bold text-sm text-white truncate">{userName}</div>
                          <div className="text-[11px] text-white/50 truncate">@{userHandle}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live Nameplate Banner Row at bottom of Profile Card */}
                  {bundleNameplate && (
                    <div className="border-t border-white/10 p-2 bg-black/40">
                      <div className="nameplate-row relative flex items-center gap-2.5 p-2 rounded-xl overflow-hidden shadow-sm border border-white/15">
                        <Nameplate nameplate={bundleNameplate} alwaysPlay={true} />
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/15">
                          {userAvatar ? (
                            <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <div
                          data-nameplate-text
                          className="flex flex-col min-w-0 flex-1 z-10 text-left"
                        >
                          <span
                            data-nameplate-label
                            className="font-bold text-xs text-white drop-shadow truncate"
                          >
                            {userName}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bundle Items Grid: Real Names and Item Type Badges */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {bundlePieces.map((piece: any, idx: number) => {
                    const pieceName = piece.name || piece.title || 'Cosmetic';
                    const pieceTypeLabel =
                      piece.type === 'decoration'
                        ? 'Decoration'
                        : piece.type === 'frame'
                          ? 'Profile Frame'
                          : piece.type === 'nameplate'
                            ? 'Nameplate'
                            : 'Profile Effect';

                    return (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-white/[0.06] backdrop-blur-md border border-white/10 flex flex-col items-center gap-1 shadow-md text-center"
                      >
                        <div className="w-9 h-9 flex items-center justify-center">
                          <img
                            src={piece.previewUrl}
                            alt={pieceName}
                            className="max-w-full max-h-full object-contain drop-shadow"
                          />
                        </div>
                        <div className="min-w-0 w-full">
                          <p className="text-[11px] font-bold text-white truncate">{pieceName}</p>
                          <span className="text-[9px] text-purple-300 font-medium truncate block">
                            {pieceTypeLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
