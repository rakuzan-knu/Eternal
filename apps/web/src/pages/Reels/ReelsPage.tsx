import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Film, Plus, Sparkles } from 'lucide-react';
import { useReelsFeed } from '@/features/reels/api/reelsApi';
import { ReelCard } from '@/features/reels/ui/ReelCard';
import { ReelPlaceholder } from '@/features/reels/ui/ReelPlaceholder';
import { CreateReelModal } from '@/features/reels/ui/CreateReelModal';

export const ReelsPage: React.FC = () => {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useReelsFeed(8);

  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [hiddenReelIds, setHiddenReelIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const reels = useMemo(() => {
    const all = data?.pages.flatMap((page) => page.data) ?? [];
    return all.filter((r) => !hiddenReelIds.has(r.id));
  }, [data, hiddenReelIds]);

  const handleRemoveReel = useCallback((reelId: string) => {
    setHiddenReelIds((prev) => new Set([...prev, reelId]));
  }, []);

  const activeReel = reels[activeReelIndex];

  // Dynamic SEO title update based on active reel
  useEffect(() => {
    if (activeReel) {
      const authorName = activeReel.author.displayName || activeReel.author.username;
      const snippet = activeReel.caption ? activeReel.caption.slice(0, 45) : 'Коротке відео';
      document.title = `${authorName}: "${snippet}" | Reels`;
    } else {
      document.title = 'Reels — Короткі відео | Social Network';
    }
  }, [activeReel]);

  // Track currently active reel via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index)) {
              setActiveReelIndex(index);

              // Pre-fetch next page when near bottom
              if (index >= reels.length - 2 && hasNextPage && !isFetchingNextPage) {
                void fetchNextPage();
              }
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.65,
      },
    );

    const currentRefs = reelRefs.current;
    currentRefs.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      currentRefs.forEach((el) => {
        if (el) observer.unobserve(el);
      });
    };
  }, [reels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Pre-fetch next video stream for instant zero-buffering playback
  useEffect(() => {
    const nextReel = reels[activeReelIndex + 1];
    if (nextReel?.videoUrl) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = nextReel.videoUrl;
      document.head.appendChild(link);

      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      };
    }
  }, [activeReelIndex, reels]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const nextIndex = Math.min(reels.length - 1, activeReelIndex + 1);
        reelRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prevIndex = Math.max(0, activeReelIndex - 1);
        reelRefs.current[prevIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeReelIndex, reels.length]);

  const handleNavigateNext = useCallback(
    (currentIndex: number) => {
      const nextIndex = Math.min(reels.length - 1, currentIndex + 1);
      if (nextIndex > currentIndex) {
        reelRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [reels.length],
  );

  return (
    <div className="relative w-full h-[100dvh] sm:h-[calc(100dvh-64px)] flex justify-center bg-zinc-950 overflow-hidden">
      {/* Semantic H1 for SEO and Screen Readers (WCAG / A11Y requirement) */}
      <h1 className="sr-only">Стрічка коротких відео та рілсів</h1>

      {/* Schema.org VideoObject JSON-LD Structured Data for Search Engine Indexing */}
      {activeReel && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'VideoObject',
              name: activeReel.caption || `Reel by ${activeReel.author.username}`,
              description: activeReel.caption || 'Short video reel',
              thumbnailUrl: activeReel.thumbnailUrl || `${window.location.origin}/og-image.png`,
              uploadDate: activeReel.createdAt,
              contentUrl: `${window.location.origin}${activeReel.videoUrl}`,
              author: {
                '@type': 'Person',
                name: activeReel.author.displayName || activeReel.author.username,
              },
            }),
          }}
        />
      )}

      {/* Floating Create Reel Button - smartly positioned so it never overlaps right-side actions on mobile */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed top-3 right-3 sm:top-4 sm:right-4 md:top-auto md:bottom-8 md:right-8 z-40 flex items-center gap-2 p-2.5 sm:px-5 sm:py-3 rounded-full bg-linear-to-r from-pink-600 via-purple-600 to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-xl hover:opacity-90 active:scale-95 transition-all group backdrop-blur-sm"
        aria-label="Create Reel"
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-300" />
        <span className="hidden sm:inline">Create Reel</span>
      </button>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-400">
          <div className="w-12 h-12 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium animate-pulse">Loading Reels Feed...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400">
          <p className="text-base text-red-400">Could not load reels feed</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      ) : reels.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center h-full text-center px-4 max-w-sm">
          <div className="w-20 h-20 rounded-3xl bg-linear-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center mb-6 shadow-xl">
            <Film className="w-10 h-10 text-pink-500" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            No Reels Yet <Sparkles className="w-5 h-5 text-amber-400" />
          </h2>
          <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
            Be the pioneer! Create and upload the very first short vertical video for the community.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-6 px-6 py-3 rounded-2xl bg-linear-to-r from-pink-600 to-indigo-600 text-white font-bold text-sm shadow-lg hover:from-pink-500 hover:to-indigo-500 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Upload First Reel
          </button>
        </div>
      ) : (
        /* Vertical Snap Feed Container */
        <div
          ref={containerRef}
          className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none flex flex-col items-center py-0 sm:py-6 gap-0 sm:gap-6"
          style={{ scrollBehavior: 'smooth' }}
        >
          {reels.map((reel, index) => {
            // DOM Windowing: only mount full interactive ReelCard within ±1 of active index
            const distance = Math.abs(index - activeReelIndex);
            const isInViewportWindow = distance <= 1;

            return (
              <div
                key={reel.id}
                data-index={index}
                ref={(el) => {
                  reelRefs.current[index] = el;
                }}
                className="w-full flex justify-center snap-center snap-always shrink-0"
              >
                {isInViewportWindow ? (
                  <ReelCard
                    reel={reel}
                    isActive={index === activeReelIndex}
                    isMuted={isMuted}
                    onToggleMute={() => setIsMuted((prev) => !prev)}
                    onNavigateNext={() => handleNavigateNext(index)}
                    onRemoveReel={() => handleRemoveReel(reel.id)}
                  />
                ) : (
                  <ReelPlaceholder reel={reel} />
                )}
              </div>
            );
          })}

          {isFetchingNextPage && (
            <div className="flex justify-center py-6">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Upload/Create Modal */}
      <CreateReelModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  );
};
export default ReelsPage;
