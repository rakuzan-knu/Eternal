import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, X } from 'lucide-react';
import { useSpotifyDockOffset } from '@/shared/model/useSpotifyDockOffset';

export const MusicContentFeedView: React.FC = () => {
  const navigate = useNavigate();
  const { dockOffset } = useSpotifyDockOffset(24);

  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem('music_feed_banner_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  const [activeFilter, setActiveFilter] = useState<'music' | 'podcasts'>('music');

  const handleDismissBanner = () => {
    setIsBannerVisible(false);
    try {
      localStorage.setItem('music_feed_banner_dismissed', 'true');
    } catch {
      // Ignore
    }
  };

  return (
    <div
      style={{ paddingBottom: `${dockOffset + 48}px` }}
      className="p-6 md:p-8 overflow-y-auto custom-scrollbar select-none min-h-full"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Purple Notification Banner (Screenshot 2 1-in-1 matching design in purple) */}
        {isBannerVisible && (
          <div className="relative flex items-center justify-between gap-3 p-3.5 px-4.5 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white shadow-xl shadow-purple-950/40 border border-purple-400/20 transition-all duration-300">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <Info size={18} className="text-white" />
              </div>
              <p className="text-xs md:text-sm font-medium text-white/95 leading-snug">
                Looking for the latest releases from creators you follow? Explore the feeds on{' '}
                <button
                  type="button"
                  onClick={() => navigate('/music')}
                  className="font-bold underline hover:text-purple-200 transition-colors"
                >
                  Music
                </button>{' '}
                or{' '}
                <button
                  type="button"
                  onClick={() => navigate('/music')}
                  className="font-bold underline hover:text-purple-200 transition-colors"
                >
                  Podcasts
                </button>{' '}
                on{' '}
                <button
                  type="button"
                  onClick={() => navigate('/music')}
                  className="font-bold underline hover:text-purple-200 transition-colors"
                >
                  Home Page
                </button>
              </p>
            </div>

            <button
              type="button"
              onClick={handleDismissBanner}
              aria-label="Close notice"
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="pt-2">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">What's New</h1>
          <p className="text-xs md:text-sm text-gray-400 mt-1">
            New podcasts, shows, and latest releases from artists you follow.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 pt-1 pb-4">
          <button
            type="button"
            onClick={() => setActiveFilter('music')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === 'music'
                ? 'bg-white text-black shadow-md'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            Music
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('podcasts')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === 'podcasts'
                ? 'bg-white text-black shadow-md'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            Podcasts & Shows
          </button>
        </div>

        {/* Clean Background-Integrated Empty State (Spotify Screenshot 2) */}
        <div className="py-20 flex flex-col items-center justify-center text-center px-4">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2.5">
            No updates right now
          </h2>
          <p className="text-xs md:text-sm text-gray-400 max-w-lg leading-relaxed">
            Updates will appear here. Follow your favorite artists and podcasts to see their new
            releases.
          </p>
        </div>
      </div>
    </div>
  );
};
