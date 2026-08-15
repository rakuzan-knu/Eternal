import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { SuggestedUsersCarousel } from './SuggestedUsersCarousel';

interface AllCaughtUpBannerProps {
  showCarousel?: boolean;
}

export function AllCaughtUpBanner({ showCarousel = true }: AllCaughtUpBannerProps) {
  const [hasSuggestions, setHasSuggestions] = useState(true);

  return (
    <div className="w-full flex flex-col gap-6 pt-6 pb-12 animate-fadeIn select-none">
      {/* All Caught Up Indicator Card */}
      <div className="w-full rounded-3xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-2xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden group">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Checkmark Icon */}
        <div className="relative mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.25)] group-hover:scale-105 transition-transform duration-300">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Text Details */}
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
          You're all caught up
        </h3>
        <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-sm">
          You've seen all new posts from the past 3 days.
        </p>
      </div>

      {/* Suggested Users Carousel underneath the milestone */}
      {showCarousel && hasSuggestions && (
        <SuggestedUsersCarousel
          title="Suggested for you"
          limit={8}
          onEmpty={() => setHasSuggestions(false)}
        />
      )}
    </div>
  );
}
