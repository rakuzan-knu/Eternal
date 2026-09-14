import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Play, Loader2, Music, Clock } from 'lucide-react';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';
import { useSpotifyPlayerStore, type SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';
import { SpotifyBrandIcon, SoundCloudBrandIcon } from '@/shared/ui/BrandIcons';
import { unescapeHtml } from '@/shared/lib/spotifyUrl';

const formatDuration = (ms?: number): string => {
  if (!ms || ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

interface SpotifyLiquidSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpotifyLiquidSearchModal: React.FC<SpotifyLiquidSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'spotify' | 'soundcloud'>('all');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const playTrack = useSpotifyPlayerStore((s) => s.playTrack);
  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);

  // Smoothly scroll active item into view when navigating via arrow keys
  useEffect(() => {
    if (selectedIndex >= 0 && resultsContainerRef.current) {
      const container = resultsContainerRef.current;
      const selectedEl = container.querySelector<HTMLElement>(
        `[data-result-index="${selectedIndex}"]`,
      );
      if (selectedEl) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elTop = selectedEl.offsetTop;
        const elBottom = elTop + selectedEl.offsetHeight;

        if (elTop < containerTop) {
          container.scrollTo({
            top: Math.max(0, elTop - 8),
            behavior: 'smooth',
          });
        } else if (elBottom > containerBottom) {
          container.scrollTo({
            top: elBottom - container.clientHeight + 8,
            behavior: 'smooth',
          });
        }
      }
    }
  }, [selectedIndex]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        let combined: SpotifyTrack[] = [];

        if (sourceFilter === 'spotify') {
          const data = await integrationsApi.searchSpotifyCatalog(trimmed);
          if (Array.isArray(data)) {
            combined = data.map((t: any) => ({
              id: t.id,
              title: unescapeHtml(t.title || t.name),
              artist: unescapeHtml(t.artist),
              albumArt: t.albumArt || t.album?.images?.[0]?.url || '',
              durationMs: t.durationMs || t.duration_ms || 180000,
              previewUrl: t.previewUrl || null,
              spotifyUrl: t.spotifyUrl || `https://open.spotify.com/track/${t.id}`,
              contextName: 'Spotify Search',
              source: 'spotify' as const,
            }));
          }
        } else if (sourceFilter === 'soundcloud') {
          const scData = await integrationsApi.searchSoundCloudCatalog(trimmed, 15);
          if (Array.isArray(scData)) {
            combined = scData.map((t: any) => ({
              id: t.id,
              title: unescapeHtml(t.title),
              artist: unescapeHtml(t.artist),
              albumArt: t.albumArt,
              durationMs: t.durationMs || 180000,
              previewUrl: null,
              spotifyUrl: t.spotifyUrl || 'https://soundcloud.com',
              contextName: 'SoundCloud Search',
              source: 'soundcloud' as const,
              streamUrl: t.streamUrl,
            }));
          }
        } else {
          // 'all': query both Spotify and SoundCloud concurrently
          const [spotifyData, scData] = await Promise.all([
            integrationsApi.searchSpotifyCatalog(trimmed).catch(() => []),
            integrationsApi.searchSoundCloudCatalog(trimmed, 10).catch(() => []),
          ]);

          const mappedSpotify: SpotifyTrack[] = Array.isArray(spotifyData)
            ? spotifyData.map((t: any) => ({
                id: t.id,
                title: unescapeHtml(t.title || t.name),
                artist: unescapeHtml(t.artist),
                albumArt: t.albumArt || t.album?.images?.[0]?.url || '',
                durationMs: t.durationMs || t.duration_ms || 180000,
                previewUrl: t.previewUrl || null,
                spotifyUrl: t.spotifyUrl || `https://open.spotify.com/track/${t.id}`,
                contextName: 'Spotify Search',
                source: 'spotify' as const,
              }))
            : [];

          const mappedSoundCloud: SpotifyTrack[] = Array.isArray(scData)
            ? scData.map((t: any) => ({
                id: t.id,
                title: unescapeHtml(t.title),
                artist: unescapeHtml(t.artist),
                albumArt: t.albumArt,
                durationMs: t.durationMs || 180000,
                previewUrl: null,
                spotifyUrl: t.spotifyUrl || 'https://soundcloud.com',
                contextName: 'SoundCloud Search',
                source: 'soundcloud' as const,
                streamUrl: t.streamUrl,
              }))
            : [];

          const maxLen = Math.max(mappedSpotify.length, mappedSoundCloud.length);
          for (let i = 0; i < maxLen; i++) {
            if (i < mappedSpotify.length) combined.push(mappedSpotify[i]);
            if (i < mappedSoundCloud.length) combined.push(mappedSoundCloud[i]);
          }
        }

        setResults(combined);
        setSelectedIndex(combined.length > 0 ? 0 : -1);
      } catch (err) {
        console.warn('Catalog search error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timeoutId);
  }, [query, sourceFilter]);

  const handleSelectTrack = useCallback(
    (track: SpotifyTrack) => {
      playTrack(track);
      onClose();
    },
    [playTrack, onClose],
  );

  // Keyboard navigation
  // Capture-phase Escape key handler to strictly close only this modal without bubbling to Game Mode
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown, true);
    return () => window.removeEventListener('keydown', handleWindowKeyDown, true);
  }, [isOpen, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }

    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(results.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelectTrack(results[selectedIndex]);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 sm:pt-24 px-4 sm:px-6 select-none">
          {/* Backdrop Blur Dimmer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Apple Liquid Glass Spotlight Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -16, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="relative w-full max-w-xl rounded-[28px] overflow-hidden flex flex-col z-10 shadow-2xl"
            style={{
              background:
                'linear-gradient(145deg, rgba(28, 30, 42, 0.84) 0%, rgba(12, 14, 22, 0.94) 100%)',
              backdropFilter: 'blur(50px) saturate(220%) brightness(108%)',
              WebkitBackdropFilter: 'blur(50px) saturate(220%) brightness(108%)',
              border: 'none',
              boxShadow:
                'inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 2px 0 rgba(255, 255, 255, 0.1), inset 0 0 16px 2px rgba(255, 255, 255, 0.04), 0 30px 70px -15px rgba(0, 0, 0, 0.85), 0 12px 28px -6px rgba(0, 0, 0, 0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Apple Liquid Top Specular Reflection Highlight */}
            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />

            {/* Search Input Bar */}
            <div className="relative flex items-center px-5 py-4 border-b border-white/[0.08]">
              <Search
                className={`w-5 h-5 shrink-0 mr-3.5 transition-colors duration-300 ${
                  sourceFilter === 'soundcloud'
                    ? 'text-[#FF5500]'
                    : sourceFilter === 'spotify'
                      ? 'text-[#1DB954]'
                      : currentTrack?.source === 'soundcloud' || currentTrack?.id.startsWith('sc-')
                        ? 'text-[#FF5500]'
                        : 'text-[#1DB954]'
                }`}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tracks on Spotify & SoundCloud..."
                className="w-full bg-transparent text-white text-base sm:text-lg font-medium placeholder-white/40 focus:outline-none tracking-tight"
              />

              {isLoading && (
                <Loader2 className="w-4 h-4 text-white/50 animate-spin shrink-0 ml-2 mr-1" />
              )}

              {query && !isLoading && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer mr-1.5"
                  title="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-2 py-1 rounded-lg text-[11px] font-mono font-medium text-white/50 bg-white/[0.06] hover:bg-white/[0.12] hover:text-white border border-white/10 transition-all cursor-pointer"
                title="Close (Esc)"
              >
                ESC
              </button>
            </div>

            {/* Apple Liquid Filter Segmented Control */}
            <div className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
              <button
                type="button"
                onClick={() => setSourceFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  sourceFilter === 'all'
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('spotify')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  sourceFilter === 'spotify'
                    ? 'bg-[#1DB954]/25 text-[#1DB954] border border-[#1DB954]/40 shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <SpotifyBrandIcon size={14} />
                <span>Spotify</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('soundcloud')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  sourceFilter === 'soundcloud'
                    ? 'bg-[#FF5500]/25 text-[#FF5500] border border-[#FF5500]/40 shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <SoundCloudBrandIcon size={14} />
                <span>SoundCloud</span>
              </button>
            </div>

            {/* Results / Empty Viewport */}
            <div
              ref={resultsContainerRef}
              className="max-h-[380px] sm:max-h-[440px] overflow-y-auto p-2 space-y-1 overscroll-contain"
            >
              {results.length > 0 ? (
                results.map((track, idx) => {
                  const isSelected = selectedIndex === idx;
                  const isCurrent = currentTrack?.id === track.id;
                  const isSC = track.source === 'soundcloud' || track.id.startsWith('sc-');

                  return (
                    <div
                      key={track.id || idx}
                      data-result-index={idx}
                      onClick={() => handleSelectTrack(track)}
                      onMouseMove={(e) => {
                        if (e.movementX !== 0 || e.movementY !== 0) {
                          setSelectedIndex(idx);
                        }
                      }}
                      className={`group relative flex items-center gap-3.5 px-3 py-2.5 rounded-[20px] transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white/[0.14] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]'
                          : 'hover:bg-white/[0.08]'
                      }`}
                    >
                      {/* Album Art with Play Overlay */}
                      <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10 shadow-sm">
                        {track.albumArt ? (
                          <img
                            src={track.albumArt}
                            alt={track.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/5">
                            <Music className="w-5 h-5 text-white/40" />
                          </div>
                        )}

                        {/* Hover Play Button */}
                        <div
                          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <Play className="w-4 h-4 text-white fill-white translate-x-0.5" />
                        </div>
                      </div>

                      {/* Track Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-sm font-semibold truncate ${
                              isCurrent
                                ? isSC
                                  ? 'text-[#FF5500]'
                                  : 'text-[#1DB954]'
                                : 'text-white'
                            }`}
                          >
                            {track.title}
                          </h4>
                          {isCurrent && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                isSC
                                  ? 'text-[#FF5500] bg-[#FF5500]/20'
                                  : 'text-[#1DB954] bg-[#1DB954]/20'
                              }`}
                            >
                              Playing
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-white/60 truncate font-medium">
                            {track.artist}
                          </p>
                          {isSC ? (
                            <span className="text-[10px] font-bold text-[#FF5500] bg-[#FF5500]/15 border border-[#FF5500]/30 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                              <SoundCloudBrandIcon size={12} />
                              SoundCloud
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-[#1DB954] bg-[#1DB954]/15 border border-[#1DB954]/30 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                              <SpotifyBrandIcon size={12} />
                              Spotify
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-white/40 shrink-0 pr-1">
                        <Clock className="w-3 h-3 text-white/30" />
                        <span>{formatDuration(track.durationMs)}</span>
                      </div>
                    </div>
                  );
                })
              ) : query.trim() ? (
                !isLoading && (
                  <div className="py-12 text-center text-white/40 space-y-2">
                    <Music className="w-8 h-8 mx-auto text-white/20" />
                    <p className="text-sm font-medium">No results found for "{query}"</p>
                    <p className="text-xs text-white/30">
                      Try searching for a different song or artist name
                    </p>
                  </div>
                )
              ) : (
                <div className="py-10 text-center text-white/40 space-y-1.5">
                  <Search className="w-7 h-7 mx-auto text-white/20 mb-2" />
                  <p className="text-sm font-medium text-white/60">
                    Quick track search on Spotify & SoundCloud
                  </p>
                  <p className="text-xs text-white/35">
                    Start typing track name, artist, or navigate filters with ↑ ↓ Enter
                  </p>
                </div>
              )}
            </div>

            {/* Clean Footer Hint (removed Apple Liquid Glass text) */}
            <div className="px-5 py-2.5 bg-white/[0.03] border-t border-white/[0.06] flex items-center justify-end text-[11px] font-medium text-white/40">
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline">↑↓ to navigate</span>
                <span className="hidden sm:inline">↵ to play</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
