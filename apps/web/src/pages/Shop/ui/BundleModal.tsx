import { useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import type { ShopBundleItem } from '../data/featuredCatalog';
import { isCurrentThemeLight, useThemeStore } from '@/shared/model/useThemeStore';

interface BundleModalProps {
  bundle: ShopBundleItem;
  onClose: () => void;
}

export function BundleModal({ bundle, onClose }: BundleModalProps) {
  const isLight = useThemeStore(isCurrentThemeLight);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(bundle.priceCents / 100);

  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="bundle-modal-title"
      className="m-auto w-[min(92vw,560px)] rounded-2xl glass-panel border border-black/10 dark:border-white/15 p-0 backdrop:bg-black/60 dark:backdrop:bg-black/75 backdrop:backdrop-blur-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 select-none text-gray-900 dark:text-white"
    >
      <div className="relative p-6 sm:p-7 select-none">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={
            'absolute right-4 top-4 p-2 rounded-full transition-colors cursor-pointer ' +
            (isLight
              ? 'hover:bg-black/5 text-zinc-500 hover:text-zinc-900'
              : 'hover:bg-white/10 text-white/70 hover:text-white')
          }
        >
          <X size={20} />
        </button>

        {/* Header Preview Showcase */}
        <div
          className="h-52 sm:h-60 w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/10 dark:bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 relative overflow-hidden mb-5 select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="absolute inset-0 bg-radial from-purple-500/10 via-transparent to-transparent pointer-events-none" />

          {/* Bundle Showcase Elements */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 z-10 w-full">
            {bundle.pieces.map((piece, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 group transition-transform hover:scale-105 select-none"
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-black/10 dark:border-white/10 bg-black/10 dark:bg-black/40 backdrop-blur-xs p-2 flex items-center justify-center relative shadow-lg">
                  <img
                    src={piece.previewUrl}
                    alt={piece.title}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                  <span className="absolute -bottom-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-black/10 dark:border-white/10 bg-black/[0.08] dark:bg-white/[0.12] text-gray-800 dark:text-white/90 backdrop-blur-xs shadow-xs">
                    {piece.type === 'decoration'
                      ? 'Avatar Deco'
                      : piece.type === 'frame'
                        ? 'Frame'
                        : 'Nameplate'}
                  </span>
                </div>
                <span
                  className={
                    'text-[11px] font-medium max-w-[90px] text-center truncate ' +
                    (isLight ? 'text-zinc-600' : 'text-white/70')
                  }
                >
                  {piece.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Badges & Title */}
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
            {bundle.rarity ?? 'Epic'} Bundle
          </span>
          <span className="text-xs font-bold text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-full">
            -{bundle.discountPercent}% OFF
          </span>
        </div>

        <h2 id="bundle-modal-title" className="text-2xl font-bold tracking-tight">
          {bundle.name}
        </h2>

        <p
          className={
            'mt-2 text-sm leading-relaxed ' + (isLight ? 'text-zinc-600' : 'text-white/70')
          }
        >
          {bundle.description}
        </p>

        {/* Included Items List */}
        <div className={'mt-4 pt-4 border-t ' + (isLight ? 'border-black/10' : 'border-white/10')}>
          <h3
            className={
              'text-xs font-semibold uppercase tracking-wider mb-2 ' +
              (isLight ? 'text-zinc-500' : 'text-white/50')
            }
          >
            Included in bundle ({bundle.itemCount} items):
          </h3>
          <ul className={'space-y-1.5 text-xs ' + (isLight ? 'text-zinc-700' : 'text-white/80')}>
            {bundle.pieces.map((p, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <Check size={14} className="text-emerald-500 shrink-0" />
                <span>{p.title}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Price & Purchase CTA */}
        <div
          className={
            'mt-6 flex items-center justify-between gap-4 pt-4 border-t ' +
            (isLight ? 'border-black/10' : 'border-white/10')
          }
        >
          <div>
            <div className={'text-xs ' + (isLight ? 'text-zinc-400' : 'text-white/50')}>
              Bundle Price
            </div>
            <div className="text-2xl font-bold flex items-center gap-2">
              <span>{formattedPrice}</span>
              <span className="text-xs text-emerald-500 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full">
                -{bundle.discountPercent}%
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled
            className="py-3 px-6 rounded-xl font-semibold bg-[#8b5cf6] text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            Purchases Currently Closed
          </button>
        </div>
      </div>
    </dialog>
  );
}
