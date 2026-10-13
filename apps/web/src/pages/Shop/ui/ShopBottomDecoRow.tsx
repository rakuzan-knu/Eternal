import { useMemo } from 'react';
import { isCurrentThemeLight, useThemeStore } from '@/shared/model/useThemeStore';

interface ShopBottomDecoRowProps {
  onShopAllClick: () => void;
}

export function ShopBottomDecoRow({ onShopAllClick }: ShopBottomDecoRowProps) {
  const isLight = useThemeStore(isCurrentThemeLight);

  // 9 curated, diverse decorations matching Discord screenshot composition:
  // cloche/crystal, cosmic ring, cat ears, pirate/hood, angry anime, dragon/gold, rose wreath, cloud/love, fox hood
  const avatarDecorations = useMemo(
    () => [
      {
        name: 'Crystal Flora',
        previewUrl: '/Profile-decorations/Avatar-decorations/crystal-aurora.preview.webp',
        fallbackUrl: '/Profile-decorations/Avatar-decorations/fairy-blue.preview.webp',
        yOffset: '-translate-y-1 sm:-translate-y-2',
        zIndex: 'z-10',
        scale: 'scale-100',
      },
      {
        name: 'Dark Ring Aura',
        previewUrl: '/Profile-decorations/Avatar-decorations/dark-dust.preview.webp',
        fallbackUrl: '/Profile-decorations/Avatar-decorations/astral-sigil.preview.webp',
        yOffset: 'translate-y-2 sm:translate-y-4',
        zIndex: 'z-20',
        scale: 'scale-105',
      },
      {
        name: 'Cat Ears Lilac',
        previewUrl: '/Profile-decorations/Avatar-decorations/cat-ears-lilac.preview.webp',
        fallbackUrl: '/Profile-decorations/Avatar-decorations/cat-ears-onyx.preview.webp',
        yOffset: '-translate-y-2 sm:-translate-y-3',
        zIndex: 'z-10',
        scale: 'scale-100',
      },
      {
        name: 'Cipher Rogue Hat',
        previewUrl: '/Profile-decorations/Avatar-decorations/cipher-hood.preview.webp',
        fallbackUrl: '/Profile-decorations/Avatar-decorations/obsidian-crown.preview.webp',
        yOffset: 'translate-y-1 sm:translate-y-2',
        zIndex: 'z-25',
        scale: 'scale-105',
      },
      {
        name: 'Angry Mood',
        previewUrl: '/Profile-decorations/Avatar-decorations/mood-angry.preview.webp',
        fallbackUrl: '/Profile-decorations/Avatar-decorations/mood-angry.preview.webp',
        yOffset: '-translate-y-3 sm:-translate-y-5',
        zIndex: 'z-30',
        scale: 'scale-110',
      },
      {
        name: 'Dragon Emperor',
        previewUrl: '/Profile-decorations/Avatar-decorations/dragon-gold.preview.webp',
        fallbackUrl: '/Profile-decorations/Avatar-decorations/dragon-silver.preview.webp',
        yOffset: 'translate-y-1 sm:translate-y-2',
        zIndex: 'z-20',
        scale: 'scale-105',
      },
      {
        name: 'Dark Roses Wreath',
        previewUrl: '/Profile-decorations/Avatar-decorations/dark-roses-purple.preview.webp',
        fallbackUrl: '/Profile-decorations/Avatar-decorations/dark-roses-black.preview.webp',
        yOffset: 'translate-y-2 sm:translate-y-4',
        zIndex: 'z-10',
        scale: 'scale-100',
      },
      {
        name: 'Pastel Rainbow Clouds',
        previewUrl: '/Profile-decorations/Avatar-decorations/in-love.preview.webp',
        fallbackUrl: '/Profile-decorations/Avatar-decorations/bunny-lop-rose.preview.webp',
        yOffset: '-translate-y-2 sm:-translate-y-3',
        zIndex: 'z-25',
        scale: 'scale-105',
      },
      {
        name: 'Fox Hood Red',
        previewUrl: '/Profile-decorations/Avatar-decorations/fox-ears-red.preview.webp',
        fallbackUrl: '/Profile-decorations/Avatar-decorations/fox-ears-arctic.preview.webp',
        yOffset: 'translate-y-1 sm:translate-y-2',
        zIndex: 'z-10',
        scale: 'scale-100',
      },
    ],
    [],
  );

  return (
    <div className="mt-16 sm:mt-24 pt-8 text-center flex flex-col items-center select-none relative overflow-visible">
      {/* Mini CTA Section */}
      <p
        className={
          'text-sm font-semibold mb-3 tracking-wide ' +
          (isLight ? 'text-zinc-600' : 'text-white/80')
        }
      >
        There&apos;s so much more
      </p>

      {/* Purple Shop All Button */}
      <button
        type="button"
        onClick={onShopAllClick}
        className="px-10 py-2.5 rounded-lg font-semibold text-white bg-[#8b5cf6] hover:bg-[#7c3aed] active:scale-[0.98] transition-all shadow-lg shadow-purple-500/25 text-sm mb-16 sm:mb-20 cursor-pointer"
      >
        Shop All
      </button>

      {/*
        Bottom Showcase Row:
        - 9 Large overlapping avatars with varied heights and z-indices (like Discord)
        - overflow-visible so crowns/ears/bubbles are NOT cut off
      */}
      <div
        className="w-full flex items-end justify-center overflow-x-auto no-scrollbar pointer-events-none -mb-2 pt-10 px-4"
        aria-hidden="true"
      >
        <div
          className="flex items-end justify-center flex-nowrap min-w-max pb-2 pl-6 pr-6 select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          {avatarDecorations.map((deco, idx) => (
            <div
              key={idx}
              className={
                'relative shrink-0 flex items-center justify-center transition-transform hover:-translate-y-2 select-none ' +
                deco.zIndex +
                ' ' +
                deco.yOffset +
                ' ' +
                deco.scale +
                (idx > 0 ? ' -ml-5 sm:-ml-7 md:-ml-8' : '')
              }
              onContextMenu={(e) => e.preventDefault()}
            >
              {/*
                Large Purple Base Avatar:
                Rich purple gradient circle with crisp avatar silhouette
              */}
              <div className="relative w-20 h-20 sm:w-26 sm:h-26 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-[#3b0764] via-[#6b21a8] to-[#9333ea] border-2 border-white/20 flex items-center justify-center shadow-2xl overflow-hidden select-none">
                <svg
                  viewBox="0 0 24 24"
                  className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 text-white/90 fill-current opacity-90 pointer-events-none select-none"
                  aria-hidden="true"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>

              {/*
                Static Decoration Overlay:
                Positioned with overflow-visible so crowns, ears, and bubbles extend out freely without clipping!
              */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible select-none">
                <img
                  src={deco.previewUrl}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  onError={(e) => {
                    if (deco.fallbackUrl && e.currentTarget.src !== deco.fallbackUrl) {
                      e.currentTarget.src = deco.fallbackUrl;
                    }
                  }}
                  className="w-[130%] h-[130%] max-w-none object-contain select-none drop-shadow-lg pointer-events-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
