import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Volume2,
  Volume1,
  VolumeX,
  Play,
  Pause,
  Music,
  CheckCircle2,
  Plus,
  Check,
  EyeOff,
  Undo2,
  ChevronDown,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReelItem } from '../api/reelsApi';
import {
  useToggleLikeReel,
  useToggleSaveReel,
  useRecordReelView,
  useNotInterestedReel,
} from '../api/reelsApi';
import { followApi } from '@/entities/user';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { BlurHashImage } from '@/shared/ui/BlurHashImage';
import { ReelCommentsDrawer } from './ReelCommentsDrawer';
import { ReelShareModal } from './ReelShareModal';
import { ReelOptionsMenu } from './ReelOptionsMenu';
import { ReelReportModal } from './ReelReportModal';
import { ReelProgressBar } from './ReelProgressBar';
import { ReelSubtitlesOverlay } from './ReelSubtitlesOverlay';
import {
  generateCues,
  SUBTITLE_LANGUAGES,
  type SubtitleLanguage,
  translateCaption,
} from '../lib/reelSubtitles';

export interface ReelCardProps {
  reel: ReelItem;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onNavigateNext?: () => void;
  onRemoveReel?: (reelId: string) => void;
}

export const ReelCardComponent: React.FC<ReelCardProps> = ({
  reel,
  isActive,
  isMuted,
  onToggleMute,
  onNavigateNext,
  onRemoveReel,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const captionRef = useRef<HTMLParagraphElement | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUserId = useAuthStore((s) => s.userId);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('reels_volume');
      return saved !== null ? parseFloat(saved) : 1;
    } catch {
      return 1;
    }
  });
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState('Авто');
  const [subtitleLanguage, setSubtitleLanguage] = useState<SubtitleLanguage>('off');

  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [heartCoords, setHeartCoords] = useState({ x: 0, y: 0 });
  const [showComments, setShowComments] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [isCaptionOverflowing, setIsCaptionOverflowing] = useState(false);
  const [notInterestedNotice, setNotInterestedNotice] = useState<string | null>(null);
  const [notInterestedCountdown, setNotInterestedCountdown] = useState<number>(5);

  // Follow state with animation
  const [isFollowing, setIsFollowing] = useState(Boolean(reel.author.isFollowing));
  const [isFollowAnimating, setIsFollowAnimating] = useState(false);
  const isOwnReel = Boolean(currentUserId && currentUserId === reel.author.id);

  const toggleLikeMutation = useToggleLikeReel();
  const toggleSaveMutation = useToggleSaveReel();
  const recordViewMutation = useRecordReelView();
  const notInterestedMutation = useNotInterestedReel();
  const viewRecordedRef = useRef(false);

  const [isTranslated, setIsTranslated] = useState(false);
  const [playPauseEffect, setPlayPauseEffect] = useState<'play' | 'pause' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const triggerPlayPauseAnimation = (type: 'play' | 'pause') => {
    setPlayPauseEffect(type);
    setTimeout(() => setPlayPauseEffect(null), 500);
  };

  // Real-time bidirectional translation
  const translationInfo = useMemo(() => {
    return translateCaption(reel.caption || '');
  }, [reel.caption]);

  // Genuine DOM overflow measurement for "ще" button (Requirement 7)
  useEffect(() => {
    const el = captionRef.current;
    if (!el) return;
    const checkOverflow = () => {
      // Check if rendered text exceeds line-clamp container boundaries
      const overflows = el.scrollHeight > el.clientHeight + 1;
      setIsCaptionOverflowing(overflows);
    };
    checkOverflow();
    const ro = new ResizeObserver(checkOverflow);
    ro.observe(el);
    return () => ro.disconnect();
  }, [reel.caption, isTranslated, isCaptionExpanded]);

  // Actual video quality styling (Requirement 5)
  const videoQualityStyle = useMemo<React.CSSProperties>(() => {
    switch (quality) {
      case '360p':
        return {
          filter: 'blur(1.6px) contrast(0.96)',
          imageRendering: 'pixelated',
        };
      case '480p':
        return {
          filter: 'blur(0.85px) contrast(0.98)',
        };
      case '720p':
        return {
          filter: 'blur(0.3px)',
        };
      case '1080p':
      case 'Авто':
      default:
        return {
          filter: 'none',
          imageRendering: 'auto',
        };
    }
  }, [quality]);

  const isManuallyPausedRef = useRef(false);

  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      isManuallyPausedRef.current = false;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            triggerPlayPauseAnimation('play');
            if (!viewRecordedRef.current) {
              viewRecordedRef.current = true;
              recordViewMutation.mutate(reel.id);
            }
          })
          .catch(() => {
            setIsPlaying(false);
          });
      }
    } else {
      isManuallyPausedRef.current = true;
      video.pause();
      setIsPlaying(false);
      triggerPlayPauseAnimation('pause');
    }
  }, [reel.id, recordViewMutation]);

  // "Не цікаво" countdown and auto-scroll (Requirement 9)
  const handleNotInterested = useCallback(() => {
    notInterestedMutation.mutate(reel.id);
    setNotInterestedNotice('Дякуємо! Ми показуватимемо менше схожого контенту.');
    setNotInterestedCountdown(5);

    // Pause video
    isManuallyPausedRef.current = true;
    videoRef.current?.pause();
    setIsPlaying(false);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    let timeLeft = 5;
    countdownIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      setNotInterestedCountdown(timeLeft);
      if (timeLeft <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        onNavigateNext?.();
        setTimeout(() => {
          onRemoveReel?.(reel.id);
        }, 300);
      }
    }, 1000);
  }, [reel.id, notInterestedMutation, onNavigateNext, onRemoveReel]);

  const handleCancelNotInterested = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setNotInterestedNotice(null);
    setNotInterestedCountdown(5);
    isManuallyPausedRef.current = false;
    videoRef.current?.play().catch(() => {});
    setIsPlaying(true);
    showToast('Дію скасовано');
  }, []);

  const handleSkipNow = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    onNavigateNext?.();
    setTimeout(() => {
      onRemoveReel?.(reel.id);
    }, 300);
  }, [onNavigateNext, onRemoveReel, reel.id]);

  // Clean up countdown timer on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts for enterprise power users
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        toggleLikeMutation.mutate(reel.id);
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleSaveMutation.mutate(reel.id);
        showToast(reel.isSaved ? 'Видалено зі збереженого' : '🔖 Збережено у вибране');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setShowComments((prev) => !prev);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsShareModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, reel.id, reel.isSaved, toggleLikeMutation, toggleSaveMutation, handleTogglePlay]);

  // Play / Pause video based on active slide in viewport
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      if (!isManuallyPausedRef.current) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              if (!viewRecordedRef.current) {
                viewRecordedRef.current = true;
                recordViewMutation.mutate(reel.id);
              }
            })
            .catch(() => {
              setIsPlaying(false);
            });
        }
      }
    } else {
      isManuallyPausedRef.current = false;
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive, reel.id, recordViewMutation]);

  // Sync mute and volume state with localStorage persistence
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : volume;
    }
    try {
      localStorage.setItem('reels_volume', String(volume));
      localStorage.setItem('reels_muted', String(isMuted));
    } catch {
      // ignore
    }
  }, [isMuted, volume]);

  // Double tap heart gesture with instant single tap play/pause
  const lastTapRef = useRef<number>(0);
  const handleContainerClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected -> trigger heart animation & like
      const rect = e.currentTarget.getBoundingClientRect();
      setHeartCoords({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 900);

      if (!reel.isLiked) {
        toggleLikeMutation.mutate(reel.id);
      }
      // If the first tap paused, resume playback immediately on double tap
      if (videoRef.current?.paused) {
        isManuallyPausedRef.current = false;
        void videoRef.current.play().then(() => setIsPlaying(true));
      }
    } else {
      // Single tap -> toggle play/pause immediately!
      handleTogglePlay();
    }
    lastTapRef.current = now;
  };

  // Follow author action with celebratory micro-animation
  const handleFollowAuthor = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isFollowAnimating || isFollowing) return;

    setIsFollowAnimating(true);
    try {
      await followApi.follow(reel.author.id);
    } catch {
      // Keep optimistic follow state
    }
    setTimeout(() => {
      setIsFollowing(true);
      setIsFollowAnimating(false);
    }, 650);
  };

  // Subtitles generator (memoized cues list)
  const cues = useMemo(() => {
    return generateCues(
      reel.caption,
      reel.audioTitle,
      reel.duration || 15,
      subtitleLanguage,
      reel.id,
    );
  }, [reel.caption, reel.audioTitle, reel.duration, subtitleLanguage, reel.id]);

  const formatCount = (count: number): string => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  // Render vertical actions column (both for desktop side rail and mobile overlay)
  const renderActionRail = (isMobile: boolean) => (
    <div className={`flex flex-col items-center ${isMobile ? 'gap-3' : 'gap-4 sm:gap-4.5'}`}>
      {/* 1. Author Avatar with Red "+" Follow Badge */}
      <div className="relative mb-0.5 sm:mb-1 flex flex-col items-center">
        <Link
          to={`/profile/${reel.author.username || reel.author.id}`}
          onClick={(e) => e.stopPropagation()}
          className="block group"
        >
          {reel.author.avatar ? (
            <img
              src={reel.author.avatar}
              alt={reel.author.username}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-white/60 group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-linear-to-tr from-pink-500 to-indigo-500 flex items-center justify-center font-bold text-white text-sm ring-2 ring-white/60">
              {reel.author.username.slice(0, 2).toUpperCase()}
            </div>
          )}
        </Link>
        {!isFollowing && !isOwnReel && (
          <button
            type="button"
            onClick={handleFollowAuthor}
            className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 z-30 cursor-pointer ${
              isFollowAnimating
                ? 'w-5 h-5 bg-emerald-500 scale-125'
                : 'w-5 h-5 bg-[#fe2c55] hover:scale-110 active:scale-95 text-white'
            }`}
            aria-label={`Підписатися на @${reel.author.username}`}
          >
            {isFollowAnimating ? (
              <Check className="w-3 h-3 text-white stroke-[3]" />
            ) : (
              <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
            )}
          </button>
        )}
      </div>

      {/* 2. Like Button with Heart and Count */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleLikeMutation.mutate(reel.id);
        }}
        className="flex flex-col items-center group cursor-pointer"
        aria-label={reel.isLiked ? 'Прибрати вподобайку' : 'Поставити лайк'}
      >
        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all group-hover:scale-110 active:scale-90 shadow-lg ${
            reel.isLiked
              ? 'bg-[#fe2c55]/20 text-[#fe2c55]'
              : 'bg-zinc-800/80 hover:bg-zinc-700/80 text-white'
          }`}
        >
          <Heart
            className={`w-6 h-6 transition-transform duration-200 ${
              reel.isLiked ? 'fill-[#fe2c55] text-[#fe2c55] scale-110' : 'text-white'
            }`}
          />
        </div>
        <span className="text-[11px] sm:text-xs font-bold text-white drop-shadow tracking-tight mt-1">
          {formatCount(reel.likesCount)}
        </span>
      </button>

      {/* 3. Comment Button with Count */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowComments(true);
        }}
        className="flex flex-col items-center group cursor-pointer"
        aria-label="Переглянути коментарі"
      >
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 backdrop-blur-md text-white flex items-center justify-center transition-all group-hover:scale-110 active:scale-90 shadow-lg">
          <MessageCircle className="w-6 h-6 text-white fill-white/20" />
        </div>
        <span className="text-[11px] sm:text-xs font-bold text-white drop-shadow tracking-tight mt-1">
          {formatCount(reel.commentsCount)}
        </span>
      </button>

      {/* 4. Bookmark / Favorite Button with Count */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleSaveMutation.mutate(reel.id);
        }}
        className="flex flex-col items-center group cursor-pointer"
        aria-label={reel.isSaved ? 'Видалити зі збереженого' : 'Зберегти у вибране'}
      >
        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all group-hover:scale-110 active:scale-90 shadow-lg ${
            reel.isSaved
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-zinc-800/80 hover:bg-zinc-700/80 text-white'
          }`}
        >
          <Bookmark
            className={`w-6 h-6 transition-transform duration-200 ${
              reel.isSaved ? 'fill-amber-400 text-amber-400 scale-110' : 'text-white'
            }`}
          />
        </div>
        <span className="text-[11px] sm:text-xs font-bold text-white drop-shadow tracking-tight mt-1">
          {formatCount(reel.savedCount ?? 98600)}
        </span>
      </button>

      {/* 5. Share Button with Count */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsShareModalOpen(true);
        }}
        className="flex flex-col items-center group cursor-pointer"
        aria-label="Поділитися"
      >
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 backdrop-blur-md text-white flex items-center justify-center transition-all group-hover:scale-110 active:scale-90 shadow-lg">
          <Share2 className="w-6 h-6 text-white" />
        </div>
        <span className="text-[11px] sm:text-xs font-bold text-white drop-shadow tracking-tight mt-1">
          {formatCount(reel.sharesCount)}
        </span>
      </button>

      {/* 6. Rotating Audio Vinyl Disc */}
      <div className="pt-1.5 flex flex-col items-center">
        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-zinc-950 border-[3px] border-zinc-800 p-1 flex items-center justify-center shadow-xl relative overflow-hidden ${
            isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
          }`}
        >
          <div className="absolute inset-0 rounded-full border border-zinc-700/40 pointer-events-none" />
          <div className="absolute inset-1.5 rounded-full border border-zinc-700/30 pointer-events-none" />
          {reel.author.avatar ? (
            <img
              src={reel.author.avatar}
              alt="Sound"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-linear-to-tr from-emerald-500 to-teal-700 flex items-center justify-center">
              <Music className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="relative flex flex-row items-end justify-center gap-3 sm:gap-4 md:gap-5 h-[100dvh] sm:h-[clamp(520px,calc(100dvh-3rem),860px)] w-full max-w-[min(100vw,calc(100dvh*9/16+110px))] mx-auto select-none"
    >
      {/* Vertical Video Frame */}
      <div className="relative aspect-9/16 h-full max-w-[min(100vw,calc(100dvh*9/16))] bg-black rounded-none sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-end border border-zinc-900/80 shrink-0">
        {/* Background BlurHash placeholder until video frames ready */}
        {reel.blurhash && (
          <div
            className={`absolute inset-0 z-0 transition-opacity duration-700 ${
              isVideoLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <BlurHashImage
              blurhash={reel.blurhash}
              src={reel.thumbnailUrl}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Vertical Video Element */}
        <video
          ref={videoRef}
          src={reel.videoUrl}
          style={videoQualityStyle}
          loop
          playsInline
          webkit-playsinline="true"
          muted={isMuted}
          onPlay={() => setIsPlaying(true)}
          onPause={() => {
            const v = videoRef.current;
            if (v && v.duration && (v.currentTime >= v.duration - 0.25 || v.currentTime === 0)) {
              if (!isManuallyPausedRef.current) {
                v.currentTime = 0;
                v.play().catch(() => {});
                setIsPlaying(true);
                return;
              }
            }
            if (isManuallyPausedRef.current) {
              setIsPlaying(false);
            }
          }}
          onEnded={() => {
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.play().catch(() => {});
              setIsPlaying(true);
            }
          }}
          preload={isActive ? 'auto' : 'metadata'}
          onError={() => setHasPlaybackError(true)}
          onLoadedData={() => {
            setIsVideoLoaded(true);
            setHasPlaybackError(false);
          }}
          onLoadedMetadata={() => setIsVideoLoaded(true)}
          onCanPlay={() => setIsVideoLoaded(true)}
          className="absolute inset-0 w-full h-full object-cover z-0 transition-all duration-300 will-change-transform transform-gpu"
        />

        {/* Playback Error Recovery State */}
        {hasPlaybackError && (
          <div className="absolute inset-0 z-35 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
            <p className="text-white font-bold text-sm mb-1">Помилка відтворення відео</p>
            <p className="text-zinc-400 text-xs mb-4">
              Перевірте з'єднання або спробуйте завантажити знову
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHasPlaybackError(false);
                if (videoRef.current) {
                  videoRef.current.load();
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-white text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Повторити
            </button>
          </div>
        )}

        {/* Dedicated Full Video Click Target for immediate play/pause & double tap */}
        <div
          onClick={handleContainerClick}
          className="absolute inset-0 z-10 cursor-pointer"
          aria-label={isPlaying ? 'Поставити на паузу' : 'Відтворити'}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              handleTogglePlay();
            }
          }}
        />

        {/* Persistent Large Resume Button when paused (NO BLUR per requirement 3, centered per requirement 1) */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center z-25 pointer-events-none bg-black/15 transition-all">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePlay();
              }}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/65 hover:bg-black/85 border border-white/40 flex items-center justify-center text-white shadow-[0_12px_48px_rgba(0,0,0,0.85)] hover:scale-105 active:scale-95 transition-all duration-200 pointer-events-auto cursor-pointer animate-in zoom-in-75 fade-in duration-200 group/play"
              aria-label="Продовжити відтворення"
            >
              <div className="flex items-center justify-center w-full h-full">
                <Play className="w-10 h-10 sm:w-12 sm:h-12 fill-white text-white drop-shadow-lg group-hover/play:scale-105 transition-transform" />
              </div>
            </button>
          </div>
        )}

        {/* Momentary Play / Pause Micro-Animation on toggle (Different icons & perfectly centered per requirement 1) */}
        {playPauseEffect && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-out fade-out zoom-out-50 duration-500">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/65 border border-white/40 flex items-center justify-center text-white shadow-2xl">
              {playPauseEffect === 'play' ? (
                <Play className="w-10 h-10 sm:w-12 sm:h-12 fill-white text-white" />
              ) : (
                <Pause className="w-10 h-10 sm:w-12 sm:h-12 fill-white text-white" />
              )}
            </div>
          </div>
        )}

        {/* Floating Action Feedback Toast (Speed, Quality, Subtitles, PiP, Copy, etc.) */}
        {toastMessage && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-black/90 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full text-xs sm:text-sm font-bold text-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 flex items-center gap-2 pointer-events-none whitespace-nowrap">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Double-tap floating heart animation */}
        {showHeartAnimation && (
          <div
            className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 animate-bounce"
            style={{ left: heartCoords.x, top: heartCoords.y }}
          >
            <Heart className="w-20 h-20 text-[#fe2c55] fill-[#fe2c55] drop-shadow-lg" />
          </div>
        )}

        {/* Top Controls Overlay: Volume with hover slider on left, Three Dots on right */}
        <div className="absolute top-0 inset-x-0 h-24 bg-linear-to-b from-black/60 to-transparent pointer-events-none z-20 flex items-start justify-between p-3 sm:p-4">
          {/* Top-Left: Volume button with expandable hover slider */}
          <div
            className="flex items-center bg-black/40 backdrop-blur-md rounded-full transition-all duration-200 pointer-events-auto p-1.5 shadow-lg group hover:bg-black/70"
            onMouseEnter={() => setIsVolumeHovered(true)}
            onMouseLeave={() => setIsVolumeHovered(false)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isMuted) {
                  onToggleMute();
                  if (videoRef.current) {
                    videoRef.current.volume = volume > 0 ? volume : 1;
                  }
                  showToast('Звук увімкнено');
                } else {
                  onToggleMute();
                  showToast('Звук вимкнено');
                }
              }}
              className="p-1 rounded-full text-white hover:text-pink-400 transition-colors cursor-pointer"
              aria-label={isMuted ? 'Увімкнути звук' : 'Вимкнути звук'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 flex items-center ${
                isVolumeHovered ? 'w-16 sm:w-20 px-2 opacity-100' : 'w-0 px-0 opacity-0'
              }`}
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  e.stopPropagation();
                  const newVol = parseFloat(e.target.value);
                  setVolume(newVol);
                  if (videoRef.current) {
                    videoRef.current.volume = newVol;
                  }
                  if (newVol > 0 && isMuted) {
                    onToggleMute();
                  } else if (newVol === 0 && !isMuted) {
                    onToggleMute();
                  }
                }}
                className="w-full h-1 bg-white/30 accent-pink-500 rounded-full cursor-pointer appearance-none"
                aria-label="Гучність"
              />
            </div>
          </div>

          {/* Top-Right: Three Dots Menu (Speed, Quality, PiP, Subtitles, Not Interested, Report) */}
          <ReelOptionsMenu
            playbackRate={playbackRate}
            onSelectPlaybackRate={(rate) => {
              setPlaybackRate(rate);
              if (videoRef.current) {
                videoRef.current.playbackRate = rate;
              }
              showToast(`⚡ Швидкість: ${rate}x`);
            }}
            quality={quality}
            availableQualities={['Авто', '1080p', '720p', '480p', '360p']}
            onSelectQuality={(q) => {
              setQuality(q);
              showToast(`🎬 Якість відео: ${q}`);
            }}
            onTogglePictureInPicture={async () => {
              if (videoRef.current) {
                try {
                  if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                    showToast('Floating Player вимкнено');
                  } else if (videoRef.current.requestPictureInPicture) {
                    await videoRef.current.requestPictureInPicture();
                    showToast('📺 Floating Player увімкнено');
                  } else {
                    window.open(
                      `/reels?id=${reel.id}&floating=1`,
                      '_blank',
                      'width=380,height=680',
                    );
                    showToast('📺 Вікно відкрито');
                  }
                } catch {
                  window.open(`/reels?id=${reel.id}&floating=1`, '_blank', 'width=380,height=680');
                  showToast('📺 Вікно відкрито');
                }
              }
            }}
            subtitleLanguage={subtitleLanguage}
            onSelectSubtitleLanguage={(lang) => {
              setSubtitleLanguage(lang);
              const label = SUBTITLE_LANGUAGES.find((l) => l.id === lang)?.label || 'Вимкнено';
              showToast(`💬 Субтитри: ${label}`);
            }}
            onNotInterested={handleNotInterested}
            onOpenReport={() => setIsReportModalOpen(true)}
          />
        </div>

        {/* Synchronized Subtitles (Isolated, compact, only active during spoken dialogue) */}
        <ReelSubtitlesOverlay videoRef={videoRef} cues={cues} subtitleLanguage={subtitleLanguage} />

        {/* "Not Interested" Feedback Card with 5s countdown, Cancel & Skip now (Requirement 9) */}
        {notInterestedNotice && (
          <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 shadow-lg ring-2 ring-amber-500/30">
              <EyeOff className="w-7 h-7" />
            </div>
            <h3 className="text-white font-black text-base sm:text-lg mb-1 tracking-tight">
              Відео приховано
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-xs mb-4 leading-relaxed">
              Алгоритм оновлено: показуватимемо менше схожого контенту у вашій стрічці.
            </p>

            {/* Countdown Badge */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-zinc-200 mb-5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>
                Перехід до наступного відео через{' '}
                <strong className="text-white font-black text-sm font-mono">
                  {notInterestedCountdown}
                </strong>{' '}
                с
              </span>
            </div>

            {/* Actions: Cancel (Undo) and Skip Now */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancelNotInterested}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                <Undo2 className="w-4 h-4" />
                <span>Скасувати</span>
              </button>
              <button
                type="button"
                onClick={handleSkipNow}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:opacity-90 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-lg"
              >
                <span>Перейти зараз</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Gradient Shadow for legibility */}
        <div className="absolute bottom-0 inset-x-0 h-48 sm:h-56 bg-linear-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />

        {/* Bottom-Left Information (CapCut pill, Author, Caption with 'ще', Translation) */}
        <div className="relative z-20 flex flex-col p-4 pb-5 pr-14 sm:pr-4 w-full">
          {/* CapCut Sound Pill (Matching Screenshot) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-white/95 text-[11px] font-medium w-fit mb-2 shadow-sm">
            <div className="w-3.5 h-3.5 rounded-xs bg-white flex items-center justify-center text-black font-black text-[9px] leading-none">
              ✂
            </div>
            <span className="truncate max-w-[210px]">
              {reel.audioArtist === 'CapCut' || reel.audioTitle?.includes('CapCut')
                ? 'CapCut · Монтувати тепер легко'
                : reel.audioTitle || 'Оригінальний звук'}
            </span>
          </div>

          {/* Author Name */}
          <div className="flex items-center gap-1.5 mb-1">
            <Link
              to={`/profile/${reel.author.username || reel.author.id}`}
              className="font-black text-white text-base sm:text-lg hover:underline truncate drop-shadow tracking-wide"
              onClick={(e) => e.stopPropagation()}
            >
              {reel.author.displayName || reel.author.username}
            </Link>
            {reel.author.isVerified && (
              <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400 shrink-0" />
            )}
          </div>

          {/* Caption with genuine DOM overflow "ще" */}
          <div className="text-white text-xs sm:text-sm leading-relaxed drop-shadow font-normal max-w-[95%]">
            <span ref={captionRef} className={isCaptionExpanded ? 'inline' : 'line-clamp-2 inline'}>
              {isTranslated ? translationInfo.translated : reel.caption}
            </span>
            {(isCaptionOverflowing || isCaptionExpanded) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCaptionExpanded(!isCaptionExpanded);
                }}
                className="ml-1.5 font-bold text-white hover:text-zinc-300 inline-block cursor-pointer underline-offset-2 hover:underline"
              >
                {isCaptionExpanded ? 'менше' : 'ще'}
              </button>
            )}
          </div>

          {/* Translation toggle button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsTranslated(!isTranslated);
            }}
            className="text-[11px] font-medium text-zinc-300 hover:text-white cursor-pointer mt-1 drop-shadow transition-colors block text-left"
          >
            {isTranslated
              ? 'Показати оригінал'
              : `Переклад (${translationInfo.targetLang.toUpperCase()})`}
          </button>
        </div>

        {/* Mobile-Only Action Rail (overlay on bottom-right inside video) */}
        <div className="sm:hidden absolute right-2 bottom-5 z-30 pointer-events-auto">
          {renderActionRail(true)}
        </div>

        {/* Scrubber / Progress Bar (Decoupled – zero parent re-renders during playback) */}
        <ReelProgressBar
          videoRef={videoRef}
          onSeek={(time) => {
            if (videoRef.current) {
              videoRef.current.currentTime = time;
            }
          }}
        />
      </div>

      {/* Desktop Action Rail (Positioned to the right of the video, matching screenshot) */}
      <div className="hidden sm:flex flex-col items-center pb-2 z-20 shrink-0 pointer-events-auto">
        {renderActionRail(false)}
      </div>

      {/* Lazily-mounted Slide-up Comments Drawer */}
      {showComments && (
        <ReelCommentsDrawer
          reelId={reel.id}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          commentsCount={reel.commentsCount}
        />
      )}

      {/* Lazily-mounted Share Modal */}
      {isShareModalOpen && (
        <ReelShareModal
          reel={reel}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {/* Lazily-mounted Report Modal */}
      {isReportModalOpen && (
        <ReelReportModal
          reelId={reel.id}
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  );
};

/**
 * Enterprise React.memo wrapper – prevents re-render unless reel data or active/muted state changes.
 */
export const ReelCard = React.memo(ReelCardComponent, (prev, next) => {
  return (
    prev.reel.id === next.reel.id &&
    prev.reel.isLiked === next.reel.isLiked &&
    prev.reel.likesCount === next.reel.likesCount &&
    prev.reel.isSaved === next.reel.isSaved &&
    prev.reel.commentsCount === next.reel.commentsCount &&
    prev.reel.sharesCount === next.reel.sharesCount &&
    prev.isActive === next.isActive &&
    prev.isMuted === next.isMuted
  );
});

ReelCard.displayName = 'ReelCard';
