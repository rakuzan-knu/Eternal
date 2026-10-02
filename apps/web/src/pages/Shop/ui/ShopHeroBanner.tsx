import React from 'react';
import { Clock, Sparkles, Wand2 } from 'lucide-react';

interface ShopHeroBannerProps {
  collectedCount?: number;
  totalQuestItems?: number;
  daysRemaining?: number;
  onShopCollection: () => void;
}

export const ShopHeroBanner: React.FC<ShopHeroBannerProps> = ({
  collectedCount = 0,
  totalQuestItems = 4,
  daysRemaining = 12,
  onShopCollection,
}) => {
  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-purple-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.6)] bg-[#0d0b17] min-h-[340px] flex items-center p-6 sm:p-10 select-none">
      {/* Background Image with Dark Vignette / Gradient Overlays */}
      <div
        className="absolute inset-0 bg-cover bg-right sm:bg-center opacity-40 sm:opacity-50 transition-opacity duration-700 pointer-events-none"
        style={{
          backgroundImage: "url('/images/cauldron_chaos_banner.jpg')",
          backgroundPosition: 'right 30% center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d0b17] via-[#0d0b17]/90 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-radial from-transparent via-[#0d0b17]/40 to-[#0d0b17] pointer-events-none" />

      {/* Floating Magic Glow Accents */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />

      {/* Banner Content */}
      <div className="relative z-10 max-w-xl flex flex-col items-start gap-4">
        {/* Collection Stylized Logo / Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 backdrop-blur-md">
          <Wand2 size={13} className="text-purple-300" />
          <span className="text-xs font-black tracking-wider uppercase bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
            Cauldron Chaos
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
          Cast a spell, <br />
          <span className="bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
            unlock a reward
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-gray-300 max-w-md leading-relaxed">
          Collect 4 items to unlock an exclusive nameplate from the Cauldron Chaos collection.{' '}
          <button
            type="button"
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 cursor-pointer transition-colors"
          >
            Terms apply.
          </button>
        </p>

        {/* Quest Progress Tracker & Timer */}
        <div className="flex items-center gap-4 py-2">
          {/* Progress Orb / Glowing Eye Avatar */}
          <div className="relative w-16 h-16 rounded-full bg-[#08070d] border-2 border-emerald-500/40 p-1 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] group">
            {/* Animated glowing eyes inside cauldron orb */}
            <svg
              viewBox="0 0 64 64"
              className="w-10 h-10 fill-emerald-400 filter drop-shadow-[0_0_6px_#34d399]"
            >
              <ellipse cx="22" cy="32" rx="7" ry="3.5" transform="rotate(-15 22 32)" />
              <ellipse cx="42" cy="32" rx="7" ry="3.5" transform="rotate(15 42 32)" />
            </svg>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-white tracking-wide">
              {collectedCount} of {totalQuestItems} collected
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/40 border border-white/10 text-gray-300 text-xs font-medium w-fit">
              <Clock size={11} className="text-cyan-400" />
              <span>{daysRemaining}d left</span>
            </div>
          </div>
        </div>

        {/* Call To Action Button */}
        <button
          type="button"
          onClick={onShopCollection}
          className="mt-2 px-6 py-3 rounded-full bg-white hover:bg-gray-100 text-black font-extrabold text-sm tracking-wide shadow-[0_10px_30px_rgba(255,255,255,0.2)] hover:shadow-[0_12px_35px_rgba(255,255,255,0.35)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2"
        >
          <Sparkles size={16} className="text-purple-600" />
          <span>Shop the Collection</span>
        </button>
      </div>
    </div>
  );
};
