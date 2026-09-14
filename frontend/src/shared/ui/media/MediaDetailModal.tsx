import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useInRouterContext, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { showcaseApi } from '@/entities/showcase/api/showcaseApi';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Share2,
  Link2,
  Check,
  Plus,
  X,
  MoreHorizontal,
  Monitor,
  Globe,
  ExternalLink,
  Trophy,
  Star,
  Film,
  Tv,
  Gamepad2,
  Flag,
  Sparkles,
} from 'lucide-react';
import { ShowcaseMediaType, type ShowcaseMediaItemDto } from '@backend/common/contracts';
import { useMediaDetailModalStore } from '@/entities/showcase/model/useMediaDetailModalStore';
import {
  getMediaDetails,
  CURATED_MEDIA_CATALOG,
  type MediaDetailPayload,
  type SimilarMediaItem,
} from '@/entities/showcase/model/mediaDetailsCatalog';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useShowcase, useUpdateShowcase } from '@/entities/showcase/model/useShowcase';
import {
  SteamBrandIcon,
  RiotGamesBrandIcon,
  BattleNetBrandIcon,
  EpicGamesBrandIcon,
  MinecraftBrandIcon,
  RobloxBrandIcon,
  YouTubeBrandIcon,
  TwitchBrandIcon,
  XBrandIcon,
  MalBrandIcon,
  AniListBrandIcon,
  CrunchyrollBrandIcon,
  ImdbBrandIcon,
  TmdbBrandIcon,
} from '@/shared/ui/BrandIcons';

function useSafeSearchParams() {
  const inRouter = useInRouterContext();
  const routerParams = inRouter ? useSearchParams() : null;
  const fallbackParams = useRef(
    new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''),
  ).current;
  const fallbackSetter = useRef(() => {}).current;

  if (routerParams) return routerParams;
  return [fallbackParams, fallbackSetter] as const;
}

export const MediaDetailModal: React.FC = () => {
  const { isOpen, activeItem, closeMediaDetail, setActiveItem } = useMediaDetailModalStore();
  const [searchParams, setSearchParams] = useSafeSearchParams();

  const { data: currentUser } = useCurrentUser();
  const { data: viewerShowcase } = useShowcase(currentUser?.username);
  const updateShowcaseMutation = useUpdateShowcase();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbnailsScrollRef = useRef<HTMLDivElement>(null);
  const similarScrollRef = useRef<HTMLDivElement>(null);
  const hasAutoOpenedRef = useRef(false);

  // Active view: index 0 = video trailer, 1..N = screenshots
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  // Player controls state
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(44);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Dropdown menus
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Deep linking: sync URL param on open / close
  useEffect(() => {
    if (isOpen && activeItem?.title) {
      const currentParam = searchParams.get('mediaTitle');
      if (currentParam !== activeItem.title) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('mediaTitle', activeItem.title);
            return next;
          },
          { replace: true },
        );
      }
    }
  }, [isOpen, activeItem?.title, searchParams, setSearchParams]);

  // Deep linking: auto-open on initial mount if ?mediaTitle= is present in URL
  useEffect(() => {
    if (hasAutoOpenedRef.current) return;
    hasAutoOpenedRef.current = true;
    const titleParam = searchParams.get('mediaTitle');
    if (titleParam && !isOpen) {
      const lower = titleParam.trim().toLowerCase();
      const isAnime = [
        'sword art online',
        'sao',
        'kuroko',
        'kuroko no basket',
        'attack on titan',
        'aot',
        'demon slayer',
        'kimetsu no yaiba',
        'jujutsu kaisen',
        'jjk',
        'death note',
        'blue lock',
        'haikyuu',
        'berserk',
        'guts',
        'code geass',
        'lelouch',
        'one piece',
        'luffy',
        'steins;gate',
        'steins gate',
        'hunter x hunter',
        'hxh',
        'frieren',
        'gintama',
        'vinland saga',
        'spirited away',
        'gurren lagann',
        'naruto',
        'bleach',
        'chainsaw man',
        'solo leveling',
        'monster',
        'evangelion',
        'fmab',
        'fullmetal alchemist',
        'jojo',
        'mob psycho',
        'one punch man',
        're:zero',
        'hellsing',
        'horimiya',
        'kaguya',
        'spy x family',
        'overlord',
        'gto',
        'grand blue',
        'dororo',
        'k-on',
        'slime',
        'hyouka',
        'classroom of the elite',
        'assassination classroom',
      ].some((kw) => lower.includes(kw));
      const isMovie = [
        'interstellar',
        'oppenheimer',
        'arcane',
        'dune',
        'godfather',
        'matrix',
        'gladiator',
        'terminator',
        'forrest gump',
        'lotr',
        'back to the future',
      ].some((kw) => lower.includes(kw));
      const resolvedType = isAnime
        ? ShowcaseMediaType.ANIME
        : isMovie
          ? ShowcaseMediaType.MOVIE
          : ShowcaseMediaType.GAME;

      useMediaDetailModalStore.getState().openMediaDetail({
        title: titleParam,
        type: resolvedType,
        posterUrl: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Query dynamic rich media details from backend (Steam Store API / TMDB proxy)
  const { data: dynamicDetails } = useQuery({
    queryKey: ['media-details', activeItem?.title, activeItem?.type],
    queryFn: () => showcaseApi.getMediaDetails(activeItem!.title, activeItem!.type),
    enabled: Boolean(activeItem?.title && isOpen),
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  const baseDetails = useMemo(
    () => (activeItem ? getMediaDetails(activeItem) : null),
    [activeItem],
  );
  const details: MediaDetailPayload | null = useMemo(() => {
    if (!baseDetails) return null;
    if (!dynamicDetails) return baseDetails;
    return {
      ...baseDetails,
      // Curated catalog titles, descriptions and metadata must NEVER be corrupted by fuzzy external store searches
      title: baseDetails.title || dynamicDetails.title,
      subtitle: baseDetails.subtitle || dynamicDetails.subtitle,
      description: baseDetails.description || dynamicDetails.description,
      videoUrl: baseDetails.videoUrl || dynamicDetails.videoUrl,
      videoThumbnail: baseDetails.videoThumbnail || dynamicDetails.videoThumbnail,
      bannerUrl: baseDetails.bannerUrl || dynamicDetails.bannerUrl,
      screenshots:
        baseDetails.screenshots && baseDetails.screenshots.length > 0
          ? baseDetails.screenshots
          : Array.isArray(dynamicDetails.screenshots) && dynamicDetails.screenshots.length > 0
            ? dynamicDetails.screenshots
            : baseDetails.screenshots,
      details: {
        ...baseDetails.details,
        genres: baseDetails.details.genres || dynamicDetails.genres,
        publisher: baseDetails.details.publisher || dynamicDetails.publisher,
        developer: baseDetails.details.developer || dynamicDetails.developer,
        releaseDate: baseDetails.details.releaseDate || dynamicDetails.releaseDate,
      },
      reviews: {
        ...baseDetails.reviews,
        metacritic: dynamicDetails.metacritic ?? baseDetails.reviews.metacritic,
      },
    };
  }, [baseDetails, dynamicDetails]);

  // Direct fast streaming MP4 video url (Discord CDN / Steam Cloudflare CDN)
  const resolvedVideoUrl = useMemo(() => {
    const raw = details?.videoUrl || baseDetails?.videoUrl || '';
    if (!raw) return '';
    if (/(?:youtube\.com|youtu\.be)/i.test(raw)) {
      if (baseDetails?.videoUrl && !/(?:youtube\.com|youtu\.be)/i.test(baseDetails.videoUrl)) {
        return baseDetails.videoUrl;
      }
      return 'https://cdn.cloudflare.steamstatic.com/steam/apps/256692021/movie480.mp4';
    }
    return raw;
  }, [details?.videoUrl, baseDetails?.videoUrl]);

  // Curated similar items with automatic fallback if none defined
  const resolvedSimilarItems = useMemo(() => {
    if (details?.similarItems && details.similarItems.length > 0) {
      return details.similarItems;
    }
    if (!activeItem) return [];
    const currentKey = activeItem.title.toLowerCase();
    const fallbackList: SimilarMediaItem[] = [];
    for (const [key, item] of Object.entries(CURATED_MEDIA_CATALOG)) {
      if (key === currentKey || item.title.toLowerCase() === currentKey) continue;
      const isSameType =
        activeItem.type === ShowcaseMediaType.ANIME
          ? item.details?.genres?.includes('Anime') || item.subtitle?.includes('Anime')
          : activeItem.type === ShowcaseMediaType.MOVIE ||
              activeItem.type === ShowcaseMediaType.SERIES
            ? item.details?.genres?.includes('Movie') ||
              item.subtitle?.includes('TV Series') ||
              item.subtitle?.includes('Movie')
            : !item.details?.genres?.includes('Anime') && !item.subtitle?.includes('Anime');

      if (isSameType) {
        fallbackList.push({
          title: item.title,
          posterUrl: item.miniPosterUrl,
          type: activeItem.type,
          rating: item.reviews?.openCritic?.score ? item.reviews.openCritic.score / 10 : 9.0,
          releaseYear: parseInt(item.details?.releaseDate?.match(/\d{4}/)?.[0] || '2022', 10),
          subtitle: item.subtitle,
        });
        if (fallbackList.length >= 6) break;
      }
    }
    return fallbackList;
  }, [details?.similarItems, activeItem]);

  // Media selector: 0 is video trailer, 1..N are screenshots
  const handleSelectMedia = (index: number) => {
    setSelectedMediaIndex(index);
    if (index === 0) {
      // Resume video
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      // Pause video when viewing screenshot
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handlePrevMedia = () => {
    if (!details || details.screenshots.length === 0) return;
    const total = details.screenshots.length;
    const nextIdx = selectedMediaIndex === 0 ? total : selectedMediaIndex - 1;
    handleSelectMedia(nextIdx);
  };

  const handleNextMedia = () => {
    if (!details || details.screenshots.length === 0) return;
    const total = details.screenshots.length;
    const nextIdx = selectedMediaIndex >= total ? 0 : selectedMediaIndex + 1;
    handleSelectMedia(nextIdx);
  };

  const handleClose = useCallback(() => {
    hasAutoOpenedRef.current = true;
    // Clean URL param
    if (searchParams.has('mediaTitle')) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('mediaTitle');
          return next;
        },
        { replace: true },
      );
    }
    setIsAddMenuOpen(false);
    setIsMoreMenuOpen(false);
    closeMediaDetail();
  }, [searchParams, setSearchParams, closeMediaDetail]);

  // Zero-Layout-Shift Body Scroll Lock & Keyboard Navigation (Escape, ArrowLeft, ArrowRight)
  useEffect(() => {
    if (!isOpen) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevMedia();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextMedia();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, selectedMediaIndex, details?.screenshots.length, handleClose]);

  if (!isOpen || !activeItem || !details) {
    return null;
  }

  // Switch to a similar item: instant scroll to top and reset state
  const handleSelectSimilar = (sim: SimilarMediaItem) => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    setSelectedMediaIndex(0);
    setCurrentTime(0);
    setIsPlaying(true);
    setIsAddMenuOpen(false);
    setIsMoreMenuOpen(false);

    setActiveItem({
      title: sim.title,
      type: sim.type,
      posterUrl: sim.posterUrl,
      rating: sim.rating,
      releaseYear: sim.releaseYear,
      subtitle: sim.subtitle,
    });
  };

  // HTML5 Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const togglePlay = () => {
    if (selectedMediaIndex !== 0) {
      handleSelectMedia(0);
      return;
    }
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Copy link action
  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('mediaTitle', activeItem.title);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  // Check if item is already in user's profile
  const isAlreadyInProfile = Boolean(
    viewerShowcase &&
    (viewerShowcase.spotlightMedia?.title?.toLowerCase() === activeItem.title.toLowerCase() ||
      (viewerShowcase.mediaItems || []).some(
        (m: ShowcaseMediaItemDto) => m.title.toLowerCase() === activeItem.title.toLowerCase(),
      )),
  );

  // Add to Profile handler
  const handleAddToProfile = async (target: 'spotlight' | 'board' | 'wishlist') => {
    if (!viewerShowcase) return;
    setIsAddMenuOpen(false);

    const calculatedRating =
      activeItem.rating ??
      (details.reviews.openCritic?.score ? details.reviews.openCritic.score / 10 : 9.0);

    try {
      if (target === 'spotlight') {
        await updateShowcaseMutation.mutateAsync({
          spotlightMedia: {
            type: activeItem.type,
            title: activeItem.title,
            posterUrl: activeItem.posterUrl || details.miniPosterUrl,
            rating: calculatedRating,
            tags: activeItem.tags || [],
            subtitle: details.subtitle,
            externalUrl: activeItem.externalUrl || details.platformButton.url,
          },
        });
      } else {
        const newItem: ShowcaseMediaItemDto = {
          type: activeItem.type,
          title: activeItem.title,
          posterUrl: activeItem.posterUrl || details.miniPosterUrl,
          rating: calculatedRating,
          releaseYear: activeItem.releaseYear,
          tags: activeItem.tags || [],
          position: 0,
          isWishlist: target === 'wishlist',
          externalUrl: activeItem.externalUrl || details.platformButton.url,
        };

        const currentMedia = viewerShowcase.mediaItems || [];
        const filtered = currentMedia.filter(
          (m: ShowcaseMediaItemDto) => m.title.toLowerCase() !== activeItem.title.toLowerCase(),
        );
        await updateShowcaseMutation.mutateAsync({
          mediaItems: [...filtered, newItem],
        });
      }
    } catch (err) {
      console.error('Failed to add media to showcase', err);
    }
  };

  // Category-specific high-resolution fallbacks so anime/movies never show Dota 2
  const getCategoryFallbackPoster = (type?: ShowcaseMediaType): string => {
    if (type === ShowcaseMediaType.ANIME) {
      return 'https://cdn.myanimelist.net/images/anime/11/39717l.jpg';
    }
    if (type === ShowcaseMediaType.MOVIE || type === ShowcaseMediaType.SERIES) {
      return 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg';
    }
    return 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg';
  };

  // Scroll thumbnails carousel
  const scrollThumbnails = (direction: 'left' | 'right') => {
    if (!thumbnailsScrollRef.current) return;
    const offset = direction === 'left' ? -220 : 220;
    thumbnailsScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  // Scroll similar carousel
  const scrollSimilar = (direction: 'left' | 'right') => {
    if (!similarScrollRef.current) return;
    const offset = direction === 'left' ? -260 : 260;
    similarScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn select-none"
      onClick={handleClose}
    >
      {/* Modal Dialog Box */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[1140px] max-h-[92vh] bg-[#0e1015] border border-white/10 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-white"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/4 -right-1/4 h-32 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none" />

        {/* 1. Header (Discord Modal Header - Stable fixed layout, zero-layout-shift) */}
        <header className="shrink-0 flex items-center justify-between min-h-[72px] sm:min-h-[78px] px-5 sm:px-6 py-3 border-b border-white/[0.08] bg-[#0e1015] z-30">
          {/* Left: Media Icon + Title + Rank Pill + Subtitle */}
          <div className="flex items-center gap-3.5 min-w-0 pr-4">
            <img
              src={details.miniPosterUrl}
              alt={details.title}
              referrerPolicy="no-referrer"
              className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl object-cover border border-white/15 shrink-0 shadow-md"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = getCategoryFallbackPoster(
                  activeItem.type,
                );
              }}
            />
            <div className="flex flex-col min-w-0 justify-center">
              <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                {details.rank && (
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-wider w-fit shrink-0 shadow-sm">
                    <Trophy size={11} className="fill-black text-black" />
                    <span>NO. {details.rank} OVERALL RANKING</span>
                  </div>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white leading-tight mt-1 truncate drop-shadow-md">
                {details.title}
              </h1>
              <span className="text-xs text-gray-400 font-medium truncate mt-0.5">
                {details.subtitle}
              </span>
            </div>
          </div>

          {/* Right Action Buttons (Always anchored) */}
          <div className="flex items-center gap-2 shrink-0 relative">
            {/* Add to profile / In profile */}
            {isAlreadyInProfile ? (
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold shadow-sm">
                <Check size={13} className="text-emerald-400" />
                <span>In Profile</span>
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAddMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-102 active:scale-98"
                >
                  <Plus size={14} className="text-indigo-400" />
                  <span>Add to Profile</span>
                </button>

                {/* Add Target Selector Popover */}
                {isAddMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-[#16181f] border border-white/15 p-2 shadow-2xl z-50 flex flex-col gap-1 text-xs">
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase text-gray-400">
                      Add to:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddToProfile('spotlight')}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 text-left text-gray-200 hover:text-white transition-colors cursor-pointer"
                    >
                      <Sparkles size={13} className="text-amber-400" />
                      <span>To Favorite (Main)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddToProfile('board')}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 text-left text-gray-200 hover:text-white transition-colors cursor-pointer"
                    >
                      <Gamepad2 size={13} className="text-indigo-400" />
                      <span>To Top 5 Board</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddToProfile('wishlist')}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 text-left text-gray-200 hover:text-white transition-colors cursor-pointer"
                    >
                      <Star size={13} className="text-purple-400" />
                      <span>To Wishlist</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Link Copy Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copy link"
              className="p-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer relative"
            >
              {copiedLink ? <Check size={15} className="text-emerald-400" /> : <Link2 size={15} />}
              {copiedLink && (
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 border border-white/15 text-[10px] font-bold text-white whitespace-nowrap shadow-lg">
                  Copied!
                </span>
              )}
            </button>

            {/* More Options Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                title="More"
                className="p-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
              >
                <MoreHorizontal size={15} />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#16181f] border border-white/15 p-2 shadow-2xl z-50 flex flex-col gap-1 text-xs">
                  <a
                    href={details.platformButton.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 text-gray-200 hover:text-white transition-colors"
                  >
                    <ExternalLink size={13} className="text-blue-400" />
                    <span>Open in source</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleCopyLink();
                    }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 text-left text-gray-200 hover:text-white transition-colors cursor-pointer"
                  >
                    <Share2 size={13} className="text-emerald-400" />
                    <span>Share card</span>
                  </button>
                  <a
                    href="https://discord.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 text-left text-gray-400 hover:text-red-300 transition-colors"
                  >
                    <Flag size={13} />
                    <span>Report inaccuracy</span>
                  </a>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              title="Close"
              className="p-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* 2. Unified Scrollable Content Container (Both columns scroll together) */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-5 sm:p-6 pt-2 custom-scrollbar overscroll-contain"
          style={{
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (58% width on desktop) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Hero Video / Screenshot Viewer */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/95 border border-white/10 shadow-2xl group/player">
                {selectedMediaIndex === 0 ? (
                  // Video Trailer View (Discord HTML5 Player - 0.1s Fast Direct MP4)
                  <>
                    {/* Dark Skeleton & Poster Blur until video loads */}
                    {!videoLoaded && (
                      <div
                        className="absolute inset-0 bg-cover bg-center blur-md opacity-40 animate-pulse"
                        style={{
                          backgroundImage: `url(${details.videoThumbnail || details.miniPosterUrl})`,
                        }}
                      />
                    )}

                    <video
                      ref={videoRef}
                      src={resolvedVideoUrl}
                      autoPlay
                      muted={isMuted}
                      loop
                      playsInline
                      preload="metadata"
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedData={() => setVideoLoaded(true)}
                      onClick={togglePlay}
                      className="w-full h-full object-cover cursor-pointer"
                    />

                    {/* Next button overlay to browse to screenshots from trailer */}
                    {details.screenshots.length > 0 && (
                      <button
                        type="button"
                        onClick={handleNextMedia}
                        aria-label="Next screenshot"
                        title="View screenshots"
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white shadow-2xl opacity-0 group-hover/player:opacity-100 transition-all hover:scale-110 cursor-pointer z-20"
                      >
                        <ChevronRight size={20} />
                      </button>
                    )}

                    {/* Floating Discord Unmute Overlay Badge (if muted) */}
                    {isMuted && (
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/15 text-xs font-semibold text-white transition-all cursor-pointer shadow-lg group/unmute z-20"
                      >
                        <VolumeX size={14} className="text-amber-400" />
                        <span className="hidden sm:inline group-hover/unmute:inline">Unmute</span>
                      </button>
                    )}

                    {/* Custom Video Controls Bar */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 sm:p-4 flex flex-col gap-2 z-20 opacity-90 group-hover/player:opacity-100 transition-opacity">
                      <div className="flex items-center gap-3">
                        {/* Play / Pause Toggle */}
                        <button
                          type="button"
                          onClick={togglePlay}
                          className="text-white hover:text-indigo-400 transition-colors cursor-pointer"
                        >
                          {isPlaying ? <Pause size={17} /> : <Play size={17} />}
                        </button>

                        {/* Time display: 0:05 / 1:52 */}
                        <span className="text-xs font-mono font-medium text-gray-300 select-none">
                          {formatTime(currentTime)} /{' '}
                          {duration > 0 ? formatTime(duration) : details.videoDuration || '1:30'}
                        </span>

                        {/* Scrubber Progress Bar */}
                        <input
                          type="range"
                          min={0}
                          max={duration || 1}
                          step={0.1}
                          value={currentTime}
                          onChange={handleSeek}
                          className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                        />

                        {/* Volume Mute Toggle */}
                        <button
                          type="button"
                          onClick={toggleMute}
                          className="text-white hover:text-indigo-400 transition-colors cursor-pointer"
                        >
                          {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                        </button>

                        {/* Fullscreen Toggle */}
                        <button
                          type="button"
                          onClick={handleFullscreen}
                          className="text-white hover:text-indigo-400 transition-colors cursor-pointer"
                        >
                          <Maximize2 size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  // Screenshot Enlarged View (Discord Grade)
                  <div className="w-full h-full relative flex items-center justify-center bg-black/95 group/hero select-none">
                    <img
                      src={details.screenshots[selectedMediaIndex - 1] || details.miniPosterUrl}
                      alt={`${details.title} screenshot ${selectedMediaIndex}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain select-none transition-transform duration-200"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          details.miniPosterUrl || getCategoryFallbackPoster(activeItem.type);
                      }}
                    />

                    {/* Discord-style Screenshot Counter Badge */}
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-xs font-semibold text-white/90 shadow-lg flex items-center gap-1.5 select-none pointer-events-none z-10">
                      <span>
                        Screenshot {selectedMediaIndex} of {details.screenshots.length}
                      </span>
                    </div>

                    {/* Discord-style Hover Overlay Left/Right Navigation Arrows */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevMedia();
                      }}
                      aria-label="Previous screenshot"
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white shadow-2xl opacity-0 group-hover/hero:opacity-100 transition-all hover:scale-110 cursor-pointer z-20"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextMedia();
                      }}
                      aria-label="Next screenshot"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white shadow-2xl opacity-0 group-hover/hero:opacity-100 transition-all hover:scale-110 cursor-pointer z-20"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>

              {/* Thumbnails Carousel Bar with Left/Right Arrows */}
              <div className="relative flex items-center group/thumbs">
                <button
                  type="button"
                  onClick={() => scrollThumbnails('left')}
                  className="absolute left-1 z-20 p-1.5 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white shadow-xl opacity-0 group-hover/thumbs:opacity-100 transition-opacity cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>

                <div
                  ref={thumbnailsScrollRef}
                  className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 w-full"
                >
                  {/* Slot 0: Video Trailer Thumbnail with Center Icon */}
                  <button
                    type="button"
                    onClick={() => handleSelectMedia(0)}
                    className={`relative w-24 h-15 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedMediaIndex === 0
                        ? 'border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)] scale-102 ring-2 ring-indigo-500/30'
                        : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={details.videoThumbnail || details.miniPosterUrl}
                      alt="Trailer"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          details.miniPosterUrl || getCategoryFallbackPoster(activeItem.type);
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="p-1 rounded-full bg-black/70 border border-white/20 text-white">
                        {selectedMediaIndex === 0 && isPlaying ? (
                          <Pause size={12} />
                        ) : (
                          <Play size={12} className="fill-white" />
                        )}
                      </div>
                    </div>
                    <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[8px] font-bold text-white uppercase tracking-wider">
                      Trailer
                    </span>
                  </button>

                  {/* Screenshots Slots */}
                  {details.screenshots.map((src, sIdx) => {
                    const mediaIdx = sIdx + 1;
                    const isSelected = selectedMediaIndex === mediaIdx;
                    return (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => handleSelectMedia(mediaIdx)}
                        className={`relative w-24 h-15 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)] scale-102 ring-2 ring-indigo-500/30'
                            : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={src}
                          alt={`Screenshot ${sIdx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              details.miniPosterUrl || getCategoryFallbackPoster(activeItem.type);
                          }}
                        />
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => scrollThumbnails('right')}
                  className="absolute right-1 z-20 p-1.5 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white shadow-xl opacity-0 group-hover/thumbs:opacity-100 transition-opacity cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Description Paragraph */}
              <p className="text-sm text-gray-300 leading-relaxed pt-1">{details.description}</p>

              {/* Similar media section */}
              {resolvedSimilarItems && resolvedSimilarItems.length > 0 && (
                <div className="flex flex-col gap-3 pt-3 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white tracking-wide">
                      {activeItem.type === ShowcaseMediaType.ANIME
                        ? 'Similar Anime'
                        : activeItem.type === ShowcaseMediaType.MOVIE ||
                            activeItem.type === ShowcaseMediaType.SERIES
                          ? 'Similar Movies'
                          : 'Similar Games'}
                    </h3>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => scrollSimilar('left')}
                        className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollSimilar('right')}
                        className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Scroll Cards */}
                  <div
                    ref={similarScrollRef}
                    className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth py-1"
                  >
                    {resolvedSimilarItems.map((sim, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectSimilar(sim)}
                        className="relative w-28 sm:w-32 shrink-0 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-[#14161d] group/sim hover:scale-105 hover:border-indigo-500/60 hover:shadow-xl transition-all duration-300 cursor-pointer"
                      >
                        <img
                          src={sim.posterUrl}
                          alt={sim.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = getCategoryFallbackPoster(
                              sim.type,
                            );
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-2.5 flex flex-col justify-end">
                          {sim.rating && (
                            <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/85 text-[9px] font-bold text-amber-300 border border-amber-500/30 shadow-md">
                              <Star size={9} className="fill-amber-400 text-amber-400" />
                              <span>{sim.rating}</span>
                            </div>
                          )}
                          <span className="text-[11px] font-extrabold text-white leading-tight line-clamp-2">
                            {sim.title}
                          </span>
                          {sim.subtitle && (
                            <span className="text-[9px] text-gray-400 truncate mt-0.5">
                              {sim.subtitle}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (42% width on desktop) */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              {/* Primary Platform Button (Steam / AniList / TMDB) */}
              <a
                href={details.platformButton.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 hover:border-white/25 flex items-center justify-center gap-2.5 text-white font-extrabold text-sm transition-all duration-300 shadow-md hover:scale-101 cursor-pointer group"
              >
                {details.platformButton.type === 'steam' ? (
                  <SteamBrandIcon size={20} />
                ) : details.platformButton.type === 'riot' ? (
                  <RiotGamesBrandIcon size={20} />
                ) : details.platformButton.type === 'battlenet' ? (
                  <BattleNetBrandIcon size={20} />
                ) : details.platformButton.type === 'epic' ? (
                  <EpicGamesBrandIcon size={20} />
                ) : details.platformButton.type === 'minecraft' ? (
                  <MinecraftBrandIcon size={20} />
                ) : details.platformButton.type === 'roblox' ? (
                  <RobloxBrandIcon size={20} />
                ) : details.platformButton.type === 'crunchyroll' ? (
                  <CrunchyrollBrandIcon size={20} />
                ) : details.platformButton.type === 'anilist' ? (
                  <AniListBrandIcon size={20} />
                ) : details.platformButton.type === 'myanimelist' ||
                  details.platformButton.type === 'mal' ? (
                  <MalBrandIcon size={20} />
                ) : details.platformButton.type === 'tmdb' ? (
                  <TmdbBrandIcon size={20} />
                ) : details.platformButton.type === 'imdb' ? (
                  <ImdbBrandIcon size={20} />
                ) : activeItem.type === ShowcaseMediaType.ANIME ? (
                  <CrunchyrollBrandIcon size={20} />
                ) : activeItem.type === ShowcaseMediaType.GAME ? (
                  <Gamepad2 size={18} className="text-sky-400" />
                ) : (
                  <Film size={18} className="text-amber-400" />
                )}
                <span>{details.platformButton.label}</span>
                <ExternalLink
                  size={14}
                  className="opacity-60 group-hover:opacity-100 transition-opacity ml-1"
                />
              </a>

              {/* Reviews Section */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                  Reviews
                </span>
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3.5 flex flex-col gap-3">
                  {/* Row 1: Primary Rating Service (MAL for Anime, IMDb for Movies, Steam / Platform for Games) */}
                  {details.reviews.recentReviews && (
                    <div className="flex items-start justify-between text-xs gap-3">
                      <div className="flex items-center gap-2 text-gray-300 shrink-0">
                        {activeItem.type === ShowcaseMediaType.ANIME ? (
                          <MalBrandIcon size={16} />
                        ) : activeItem.type === ShowcaseMediaType.MOVIE ||
                          activeItem.type === ShowcaseMediaType.SERIES ? (
                          <ImdbBrandIcon size={16} />
                        ) : details.platformButton.type === 'steam' ? (
                          <SteamBrandIcon size={15} />
                        ) : details.platformButton.type === 'riot' ? (
                          <RiotGamesBrandIcon size={16} />
                        ) : details.platformButton.type === 'battlenet' ? (
                          <BattleNetBrandIcon size={16} />
                        ) : details.platformButton.type === 'epic' ? (
                          <EpicGamesBrandIcon size={16} />
                        ) : details.platformButton.type === 'minecraft' ? (
                          <MinecraftBrandIcon size={16} />
                        ) : details.platformButton.type === 'roblox' ? (
                          <RobloxBrandIcon size={16} />
                        ) : (
                          <Star size={14} className="text-amber-400 fill-amber-400" />
                        )}
                        <span className="font-medium whitespace-nowrap">
                          {details.reviews.recentReviews.label}
                        </span>
                      </div>
                      <span className="font-bold text-amber-400 text-right shrink min-w-0 break-words leading-tight">
                        {details.reviews.recentReviews.count}
                      </span>
                    </div>
                  )}

                  {/* Row 2: Secondary / Community Rating (AniList for Anime, TMDB for Movies, Steam / Global for Games) */}
                  {details.reviews.languageReviews && (
                    <div className="flex items-start justify-between text-xs gap-3">
                      <div className="flex items-center gap-2 text-gray-300 shrink-0">
                        {activeItem.type === ShowcaseMediaType.ANIME ? (
                          <AniListBrandIcon size={16} />
                        ) : activeItem.type === ShowcaseMediaType.MOVIE ||
                          activeItem.type === ShowcaseMediaType.SERIES ? (
                          <TmdbBrandIcon size={16} />
                        ) : details.platformButton.type === 'steam' ? (
                          <SteamBrandIcon size={15} />
                        ) : (
                          <Globe size={14} className="text-sky-400" />
                        )}
                        <span className="font-medium whitespace-nowrap">
                          {details.reviews.languageReviews.label}
                        </span>
                      </div>
                      <span className="font-bold text-sky-400 text-right shrink min-w-0 break-words leading-tight">
                        {details.reviews.languageReviews.count}
                      </span>
                    </div>
                  )}

                  {/* Row 3: Score / Tier Badge */}
                  {details.reviews.openCritic && (
                    <div className="flex items-center justify-between text-xs gap-2 pt-1 border-t border-white/[0.06]">
                      <span className="font-medium text-gray-300 shrink-0">
                        {activeItem.type === ShowcaseMediaType.ANIME
                          ? 'AniList / MAL'
                          : activeItem.type === ShowcaseMediaType.MOVIE ||
                              activeItem.type === ShowcaseMediaType.SERIES
                            ? 'Metacritic'
                            : 'OpenCritic'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Shield Badge */}
                        <div
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            activeItem.type === ShowcaseMediaType.ANIME
                              ? 'bg-sky-500 text-black'
                              : activeItem.type === ShowcaseMediaType.MOVIE ||
                                  activeItem.type === ShowcaseMediaType.SERIES
                                ? 'bg-amber-400 text-black'
                                : 'bg-[#ff5500] text-black'
                          }`}
                        >
                          {details.reviews.openCritic.tier}
                        </div>
                        {/* Circle Score */}
                        <div className="w-6 h-6 rounded-full border border-amber-500/60 bg-black/60 flex items-center justify-center font-bold text-amber-300 text-[11px]">
                          {details.reviews.openCritic.score}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Details Section */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                  Details
                </span>
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3.5 flex flex-col gap-2.5 text-xs">
                  {/* Genres */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-400 shrink-0">Genres</span>
                    <span className="text-gray-200 font-medium text-right leading-relaxed break-words min-w-0">
                      {details.details.genres}
                    </span>
                  </div>

                  {/* Publisher */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-400 shrink-0">Publisher</span>
                    <span className="text-gray-200 font-medium text-right leading-relaxed break-words min-w-0">
                      {details.details.publisher}
                    </span>
                  </div>

                  {/* Developer / Studio */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-400 shrink-0">
                      {activeItem.type === ShowcaseMediaType.ANIME
                        ? 'Studio'
                        : activeItem.type === ShowcaseMediaType.MOVIE ||
                            activeItem.type === ShowcaseMediaType.SERIES
                          ? 'Director'
                          : 'Developer'}
                    </span>
                    <span className="text-gray-200 font-medium text-right leading-relaxed break-words min-w-0">
                      {details.details.developer}
                    </span>
                  </div>

                  {/* Release Date */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-400 shrink-0">Release Date</span>
                    <span className="text-gray-200 font-medium text-right leading-relaxed break-words min-w-0">
                      {details.details.releaseDate}
                    </span>
                  </div>

                  {/* Platform */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-400 shrink-0">Platform</span>
                    <div className="flex items-start justify-end gap-1.5 text-gray-300 text-right min-w-0">
                      {activeItem.type === ShowcaseMediaType.ANIME ? (
                        <Tv size={14} className="text-sky-400 shrink-0 mt-0.5" />
                      ) : activeItem.type === ShowcaseMediaType.MOVIE ||
                        activeItem.type === ShowcaseMediaType.SERIES ? (
                        <Film size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <Monitor size={14} className="shrink-0 mt-0.5" />
                      )}
                      <span className="font-medium leading-relaxed break-words">
                        {details.details.platform}
                      </span>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
                    <span className="text-gray-400 shrink-0">Links</span>
                    <div className="flex items-center gap-2 text-gray-400 shrink-0">
                      {details.details.socialLinks.web && (
                        <a
                          href={details.details.socialLinks.web}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white transition-colors"
                          title="Official website"
                        >
                          <Globe size={14} />
                        </a>
                      )}
                      {details.details.socialLinks.twitter && (
                        <a
                          href={details.details.socialLinks.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white transition-colors"
                          title="X / Twitter"
                        >
                          <XBrandIcon size={14} />
                        </a>
                      )}
                      {details.details.socialLinks.youtube && (
                        <a
                          href={details.details.socialLinks.youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white transition-colors"
                          title="YouTube"
                        >
                          <YouTubeBrandIcon size={14} />
                        </a>
                      )}
                      {details.details.socialLinks.twitch && (
                        <a
                          href={details.details.socialLinks.twitch}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white transition-colors"
                          title="Twitch"
                        >
                          <TwitchBrandIcon size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Metadata Source */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-gray-400 shrink-0">
                      Metadata by {details.details.metadataSource.name}
                    </span>
                    <a
                      href={details.details.metadataSource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline font-semibold shrink-0"
                    >
                      {details.details.metadataSource.name}
                    </a>
                  </div>
                </div>

                {/* Footer Claim link (Games only) */}
                {activeItem.type === ShowcaseMediaType.GAME && (
                  <div className="px-1 text-[11px] text-gray-400">
                    <span>Are you the developer of this game? </span>
                    <a
                      href={details.details.developerClaimUrl || 'https://partner.steamgames.com/'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      Claim this page
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
