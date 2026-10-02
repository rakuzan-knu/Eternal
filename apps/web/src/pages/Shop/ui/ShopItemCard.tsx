import React from 'react';
import { Heart, Gem, Eye } from 'lucide-react';
import type { ShopItem } from '../types';

interface ShopItemCardProps {
  item: ShopItem;
  isWishlisted: boolean;
  onToggleWishlist: (e: React.MouseEvent) => void;
  onClick: () => void;
}

export const ShopItemCard: React.FC<ShopItemCardProps> = ({
  item,
  isWishlisted,
  onToggleWishlist,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col rounded-[22px] bg-[#12111b] dark:bg-[#12111b] light:bg-white border border-black/8 dark:border-white/8 hover:border-purple-500/40 p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(0,0,0,0.5)] cursor-pointer select-none"
    >
      {/* Top Preview Canvas */}
      <div
        className="relative w-full aspect-square rounded-2xl overflow-hidden flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.02]"
        style={{
          background: `radial-gradient(circle at center, ${item.previewGlow} 0%, rgba(10, 9, 16, 0.95) 75%)`,
        }}
      >
        {/* Wishlist Heart Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(e);
          }}
          className={`absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer backdrop-blur-md ${
            isWishlisted
              ? 'bg-rose-500/30 text-rose-400 border border-rose-500/40'
              : 'bg-black/40 text-gray-400 hover:text-white hover:bg-black/60 opacity-0 group-hover:opacity-100'
          }`}
          title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart size={14} className={isWishlisted ? 'fill-rose-400' : ''} />
        </button>

        {/* Quest Eligible or Bundle Badge */}
        {item.isQuestEligible && (
          <div className="absolute top-2.5 left-2.5 z-20 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 backdrop-blur-md text-[10px] font-bold text-cyan-300">
            Quest
          </div>
        )}

        {/* Discord Mock Avatar Canvas with Decoration */}
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Base Avatar Circle */}
          <div className="relative w-20 h-20 rounded-full bg-[#1e1d2b] dark:bg-[#1e1d2b] light:bg-gray-200 border-2 border-black/40 overflow-hidden flex items-center justify-center shadow-lg">
            {/* Discord Logo Silhouette in center */}
            <svg
              viewBox="0 0 24 24"
              className="w-10 h-10 fill-gray-500/60 transition-transform group-hover:scale-105"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>

          {/* Dynamic Cosmetic Illustration Rendered Over/Around Avatar */}
          {item.id === 'hexs-hat' && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 pointer-events-none transition-transform duration-300 group-hover:-translate-y-1">
              <svg viewBox="0 0 100 70" className="w-24 h-18 filter drop-shadow-[0_0_8px_#a855f7]">
                {/* Purple pointed witch hat */}
                <path
                  d="M15 55 Q50 48 85 55 Q50 62 15 55 Z"
                  fill="#581c87"
                  stroke="#c084fc"
                  strokeWidth="1.5"
                />
                <path
                  d="M32 52 L50 6 Q62 20 70 52 Z"
                  fill="url(#witchHatGrad)"
                  stroke="#a855f7"
                  strokeWidth="1.5"
                />
                <path d="M42 46 Q50 43 58 46" stroke="#fbbf24" strokeWidth="3" fill="none" />
                <circle cx="50" cy="44" r="3" fill="#fef08a" />
                <path
                  d="M68 48 Q82 55 88 64"
                  stroke="#c084fc"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <defs>
                  <linearGradient id="witchHatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7e22ce" />
                    <stop offset="100%" stopColor="#3b0764" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {item.id === 'grinning-gourds' && (
            <>
              {/* Glowing Green Mist Ring */}
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-pulse pointer-events-none" />
              {/* Cute smiling pumpkins at bottom */}
              <div className="absolute -bottom-2 -left-1 flex items-center gap-0.5 pointer-events-none transition-transform duration-300 group-hover:scale-110">
                <svg viewBox="0 0 60 40" className="w-16 h-10 filter drop-shadow-[0_0_8px_#22c55e]">
                  <ellipse cx="20" cy="24" rx="14" ry="12" fill="#ea580c" />
                  <ellipse cx="38" cy="26" rx="11" ry="10" fill="#f97316" />
                  <path d="M19 12 L21 7 L23 12 Z" fill="#65a30d" />
                  <path d="M37 16 L38 12 L40 16 Z" fill="#65a30d" />
                  {/* Glowing green jack-o-lantern eyes/mouth */}
                  <polygon points="15,22 17,19 19,22" fill="#86efac" />
                  <polygon points="23,22 25,19 27,22" fill="#86efac" />
                  <path d="M15 27 Q21 32 27 27 Z" fill="#86efac" />
                  <polygon points="34,25 36,22 38,25" fill="#86efac" />
                  <polygon points="40,25 42,22 44,25" fill="#86efac" />
                  <path d="M35 29 Q39 33 43 29 Z" fill="#86efac" />
                </svg>
              </div>
            </>
          )}

          {item.id === 'witching-hour-bundle' && (
            <>
              {/* Celestial Arcane Ring */}
              <div className="absolute -inset-1 rounded-full border-2 border-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.85)] animate-spin-slow pointer-events-none" />
              {/* Flying bats and moonlight aura */}
              <div className="absolute -bottom-3 -right-2 pointer-events-none">
                <svg viewBox="0 0 50 30" className="w-12 h-8 fill-cyan-300 opacity-80">
                  <path d="M10 15 Q15 5 22 12 Q29 5 34 15 Q28 17 22 24 Q16 17 10 15 Z" />
                </svg>
              </div>
            </>
          )}

          {item.id === 'lotties-cauldron-bundle' && (
            <>
              {/* Colorful Particle Burst & Ring */}
              <div className="absolute -inset-2 rounded-full border border-dashed border-purple-400/80 shadow-[0_0_20px_rgba(168,85,247,0.7)] pointer-events-none animate-spin-reverse" />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none">
                <svg viewBox="0 0 60 40" className="w-14 h-10 filter drop-shadow-[0_0_8px_#c084fc]">
                  <path d="M10 32 Q30 28 50 32 Z" stroke="#c084fc" strokeWidth="2" fill="none" />
                  <path d="M20 30 L30 6 L40 30 Z" fill="#9333ea" />
                  <circle cx="30" cy="24" r="2.5" fill="#facc15" />
                </svg>
              </div>
              <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-cyan-400/30 border border-cyan-300 flex items-center justify-center text-[10px] font-bold text-cyan-200">
                5pc
              </div>
            </>
          )}

          {/* Generic Frame / Effect Preview for Other Items */}
          {item.category === 'Profile Frames' && item.id !== 'arcane-moon-crest-frame' && (
            <div
              className="absolute -inset-1 rounded-full border-3 shadow-lg pointer-events-none"
              style={{
                borderColor: item.previewColor,
                boxShadow: `0 0 15px ${item.previewGlow}`,
              }}
            />
          )}

          {item.category === 'Profile Effects' && (
            <div
              className="absolute inset-0 rounded-full opacity-60 pointer-events-none animate-pulse"
              style={{
                background: `radial-gradient(circle, ${item.previewColor} 0%, transparent 70%)`,
              }}
            />
          )}

          {item.category === 'Nameplates' && (
            <div
              className="absolute -bottom-2 w-28 h-5 rounded-md flex items-center justify-center text-[9px] font-black uppercase tracking-wider text-white shadow-md pointer-events-none"
              style={{
                background: `linear-gradient(90deg, ${item.previewColor}cc, ${item.previewColor}66)`,
                border: `1px solid ${item.previewColor}`,
              }}
            >
              Eternal
            </div>
          )}
        </div>

        {/* Hover "Try On" Overlay Pill */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 text-black text-xs font-bold shadow-lg">
          <Eye size={12} />
          <span>Try On</span>
        </div>
      </div>

      {/* Bottom Info Area */}
      <div className="mt-3 flex flex-col gap-1 px-1">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate" title={item.name}>
          {item.name}
        </h3>

        {/* Price & Discount Pill */}
        <div className="flex items-center gap-2 mt-0.5">
          {item.currency === 'USD' ? (
            <span className="text-sm font-extrabold text-gray-900 dark:text-white">
              ${item.price.toFixed(2)}
            </span>
          ) : (
            <div className="flex items-center gap-1 text-sm font-extrabold text-purple-400">
              <Gem size={13} />
              <span>{item.price.toLocaleString()}</span>
            </div>
          )}

          {item.discountPercent && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">
              (-{item.discountPercent}%)
            </span>
          )}

          {item.originalPrice && (
            <span className="text-xs text-gray-500 line-through">
              ${item.originalPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
