import React from 'react';
import { calculateCS2Premier, CS2PremierInfo } from '@/entities/showcase/lib/cs2Ranks';

interface CS2PremierBadgeProps {
  rating?: number;
  premierInfo?: CS2PremierInfo;
  className?: string;
}

export const CS2PremierBadge: React.FC<CS2PremierBadgeProps> = ({
  rating = 17499,
  premierInfo: customInfo,
  className = '',
}) => {
  const info = customInfo || calculateCS2Premier(rating);

  // Background and border styling for the authentic csrep.gg parallelogram badge
  const tierStyles = (() => {
    if (rating >= 30000) {
      return {
        bg: 'from-[#3b2f0a] to-[#261e05]',
        border: 'border-[#e4ae39]/80',
        stripeThick: 'bg-[#ffd700]',
        stripeThin: 'bg-[#e4ae39]',
        text: 'text-[#ffd700]',
        glow: 'shadow-[0_0_16px_rgba(228,174,57,0.4)]',
      };
    }
    if (rating >= 25000) {
      return {
        bg: 'from-[#421111] to-[#260808]',
        border: 'border-[#eb4b4b]/80',
        stripeThick: 'bg-[#ff6262]',
        stripeThin: 'bg-[#eb4b4b]',
        text: 'text-[#ff6262]',
        glow: 'shadow-[0_0_16px_rgba(235,75,75,0.4)]',
      };
    }
    if (rating >= 20000) {
      return {
        bg: 'from-[#42112a] to-[#260718]',
        border: 'border-[#eb4b98]/80',
        stripeThick: 'bg-[#ff76c2]',
        stripeThin: 'bg-[#eb4b98]',
        text: 'text-[#ff76c2]',
        glow: 'shadow-[0_0_16px_rgba(235,75,152,0.4)]',
      };
    }
    if (rating >= 15000) {
      return {
        bg: 'from-[#381145] to-[#200729]',
        border: 'border-[#d32ce6]/80',
        stripeThick: 'bg-[#ee74fc]',
        stripeThin: 'bg-[#d32ce6]',
        text: 'text-[#ee74fc]',
        glow: 'shadow-[0_0_16px_rgba(211,44,230,0.4)]',
      };
    }
    if (rating >= 10000) {
      return {
        bg: 'from-[#131e4a] to-[#0a102b]',
        border: 'border-[#4b69ff]/90',
        stripeThick: 'bg-[#718eff]',
        stripeThin: 'bg-[#4b69ff]',
        text: 'text-[#4b69ff]',
        glow: 'shadow-[0_0_16px_rgba(75,105,255,0.45)]',
      };
    }
    if (rating >= 5000) {
      return {
        bg: 'from-[#162c3b] to-[#0c1a24]',
        border: 'border-[#5291b8]/80',
        stripeThick: 'bg-[#88c8e8]',
        stripeThin: 'bg-[#5291b8]',
        text: 'text-[#88c8e8]',
        glow: 'shadow-[0_0_16px_rgba(82,145,184,0.4)]',
      };
    }
    return {
      bg: 'from-[#1e252b] to-[#11161a]',
      border: 'border-[#738894]/80',
      stripeThick: 'bg-[#b0c3d0]',
      stripeThin: 'bg-[#738894]',
      text: 'text-[#b0c3d0]',
      glow: 'shadow-[0_0_12px_rgba(115,136,148,0.3)]',
    };
  })();

  return (
    <div
      className={`inline-flex items-center -skew-x-12 px-3 py-1 rounded-md bg-gradient-to-r ${tierStyles.bg} border ${tierStyles.border} ${tierStyles.glow} ${className}`}
    >
      {/* Dual Left Accent Stripes */}
      <div className="flex items-center gap-1 mr-2.5 shrink-0 py-0.5">
        <div className={`w-1 h-3.5 rounded-full ${tierStyles.stripeThick}`} />
        <div className={`w-0.5 h-3.5 rounded-full ${tierStyles.stripeThin}`} />
      </div>

      {/* Rating Numbers in CS2 italic bold style */}
      <span
        className={`text-sm font-black italic tracking-wide select-none ${tierStyles.text}`}
        style={{
          fontFamily:
            '"Stratum2", "Chakra Petch", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {rating.toLocaleString()}
      </span>
    </div>
  );
};
