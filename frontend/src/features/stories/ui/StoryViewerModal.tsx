import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  X,
  Volume2,
  Volume1,
  VolumeX,
  Play,
  Pause,
  MoreHorizontal,
  Trash2,
  Send,
  Eye,
  Star,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AtSign,
  Heart,
  Flame,
  Zap,
  PartyPopper,
  Sparkles,
  Link2,
  Share2,
  AlertCircle,
  Music,
  Check,
} from 'lucide-react';
import { useStoryViewerStore } from '../model/useStoryViewerStore';
import {
  useViewStory,
  useReactStory,
  useVoteStoryPoll,
  useReplyStory,
  useDeleteStory,
} from '../model/useStories';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useBodyScrollLock } from '@/shared/lib/useBodyScrollLock';
import Avatar from '@/shared/ui/Avatar';
import { reactionBurstEngine } from '@/features/chat/lib/reactionBurstEngine';
import { formatRelativeTime } from '@/shared/lib/formatRelativeTime';
import { getSocket } from '@/shared/api/socket';
import type {
  StoryViewResponse,
  UserStoriesGroup,
  ImageOverlay,
  DrawingOverlay,
  AudioOverlay,
} from '../model/types';
import { StoryDrawingOverlayView } from './StoryDrawingOverlayView';
import { getStoryFilterCss } from './StoryFiltersCarousel';
import { getStoryFontFamily } from '../lib/storyCanvasUtils';
import { storiesApi } from '../api/storiesApi';
import Hls from 'hls.js';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';
import { StoryMusicStickerView } from './StoryMusicStickerView';
import { DeleteStoryConfirmModal } from './DeleteStoryConfirmModal';

const STORY_DURATION_MS = 15000; // 15 seconds per Instagram standard

const storyTransitionVariants = {
  enter: (direction: number) => ({
    x: direction >= 0 ? '65%' : '-65%',
    scale: 0.84,
    opacity: 0,
    zIndex: 20,
    pointerEvents: 'none' as const,
  }),
  center: {
    x: '0%',
    scale: 1,
    opacity: 1,
    zIndex: 20,
    pointerEvents: 'auto' as const,
    transition: {
      duration: 0.32,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  },
  exit: (direction: number) => ({
    x: direction >= 0 ? '-65%' : '65%',
    scale: 0.84,
    opacity: 0,
    zIndex: 10,
    pointerEvents: 'none' as const,
    transition: {
      duration: 0.28,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  }),
};

const getStoryPreviewDetails = (story?: StoryViewResponse) => {
  if (!story) {
    return {
      type: 'color' as const,
      url: '',
      background: 'linear-gradient(135deg, #2e0854, #09090b)',
    };
  }

  const overlays = Array.isArray(story.overlays) ? story.overlays : [];
  const audioOverlay = overlays.find((o) => o.type === 'audio') as AudioOverlay | undefined;
  const imageOverlay = overlays.find((o) => o.type === 'image') as ImageOverlay | undefined;

  if (
    story.mediaType === 'VIDEO' &&
    story.mediaUrl &&
    !story.mediaUrl.startsWith('color:') &&
    !story.mediaUrl.startsWith('blob:')
  ) {
    return { type: 'video' as const, url: story.mediaUrl, background: '#000000' };
  }

  if (
    story.mediaUrl &&
    !story.mediaUrl.startsWith('color:') &&
    !story.mediaUrl.startsWith('blob:')
  ) {
    return { type: 'image' as const, url: story.mediaUrl, background: '#000000' };
  }

  // If mediaUrl is color/gradient or empty:
  const trackCover = (audioOverlay as any)?.trackCover;
  if (trackCover && !trackCover.startsWith('blob:')) {
    return {
      type: 'image' as const,
      url: trackCover,
      background:
        (story as any).backgroundColor ||
        (story.mediaUrl?.startsWith('color:') ? story.mediaUrl.replace('color:', '') : '#110c22'),
    };
  }

  if (imageOverlay?.url && !imageOverlay.url.startsWith('blob:')) {
    return {
      type: 'image' as const,
      url: imageOverlay.url,
      background:
        (story as any).backgroundColor ||
        (story.mediaUrl?.startsWith('color:') ? story.mediaUrl.replace('color:', '') : '#110c22'),
    };
  }

  const bg =
    (story as any).backgroundColor ||
    (story.mediaUrl?.startsWith('color:')
      ? story.mediaUrl.replace('color:', '')
      : 'linear-gradient(135deg, #3b0764, #09090b)');
  return { type: 'color' as const, url: '', background: bg };
};

interface StorySegmentProgressBarProps {
  isActive: boolean;
  isPassed: boolean;
  isPaused: boolean;
  durationMs: number;
  isVideo: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onComplete: () => void;
}

function StorySegmentProgressBar({
  isActive,
  isPassed,
  isPaused,
  durationMs,
  isVideo,
  videoRef,
  onComplete,
}: StorySegmentProgressBarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  useEffect(() => {
    if (!isActive) {
      progressRef.current = isPassed ? 100 : 0;
      lastTimeRef.current = null;
      if (barRef.current) {
        barRef.current.style.width = isPassed ? '100%' : '0%';
      }
      return;
    }

    progressRef.current = 0;
    lastTimeRef.current = null;
    if (barRef.current) {
      barRef.current.style.width = '0%';
    }

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      if (isVideo) {
        const video = videoRef.current;
        if (video && video.duration && !Number.isNaN(video.duration)) {
          const pct = Math.min(100, (video.currentTime / video.duration) * 100);
          progressRef.current = pct;
          if (barRef.current) {
            barRef.current.style.width = `${pct}%`;
          }
        }
      } else {
        if (!isPausedRef.current) {
          const delta = Math.min(250, timestamp - lastTimeRef.current);
          const increment = (delta / durationMs) * 100;
          progressRef.current = Math.min(100, progressRef.current + increment);
          if (barRef.current) {
            barRef.current.style.width = `${progressRef.current}%`;
          }

          if (progressRef.current >= 100) {
            setTimeout(() => {
              onCompleteRef.current();
            }, 0);
            return;
          }
        }
      }

      lastTimeRef.current = timestamp;
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isActive, isPassed, durationMs, isVideo]);

  return (
    <div className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden backdrop-blur-xs">
      <div
        ref={barRef}
        style={{ width: isPassed ? '100%' : '0%' }}
        className="h-full bg-white rounded-full will-change-[width]"
      />
    </div>
  );
}

export function StoryViewerModal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const {
    isOpen,
    groups,
    activeGroupIndex,
    activeStoryIndex,
    isPaused,
    isBuffering,
    isMuted,
    volume,
    isInputFocused,
    isMenuOpen,
    isVolumeHovered,
    closeViewer,
    nextStory,
    prevStory,
    setGroupAndStory,
    setPaused,
    setBuffering,
    toggleMute,
    setMuted,
    setVolume,
    setInputFocused,
    setMenuOpen,
    setVolumeHovered,
    setVideoProgress,
    markStoryViewed,
  } = useStoryViewerStore();

  const viewStoryMutation = useViewStory();
  const reactStoryMutation = useReactStory();
  const votePollMutation = useVoteStoryPoll();
  const replyStoryMutation = useReplyStory();
  const deleteStoryMutation = useDeleteStory();

  // Active Story & Group
  const currentGroup: UserStoriesGroup | undefined = groups[activeGroupIndex];
  const activeStory: StoryViewResponse | undefined = currentGroup?.stories[activeStoryIndex];
  const isOwnStory = Boolean(currentUser && activeStory && activeStory.authorId === currentUser.id);
  const authorCaption =
    activeStory?.caption || activeStory?.overlays?.find((o) => o.type === 'caption')?.text;

  // Local state
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [viewersData, setViewersData] = useState<{ totalViews: number; viewers: any[] } | null>(
    null,
  );
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPressHolding, setIsPressHolding] = useState(false);
  const [replySentSuccess, setReplySentSuccess] = useState(false);
  const [localReactions, setLocalReactions] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState<number>(1);

  useBodyScrollLock(isOpen);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const viewerHlsRef = useRef<Hls | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wasHoldingRef = useRef(false);
  const volumeHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleGoNext = useCallback(() => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
    }
    setDirection(1);
    nextStory();
  }, [nextStory]);

  const handleGoPrev = useCallback(() => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
    }
    setDirection(-1);
    prevStory();
  }, [prevStory]);

  // Computed effective pause flag (locks timer on input, menu, sound slider or hold)
  const isEffectivelyPaused =
    isPaused ||
    isBuffering ||
    isInputFocused ||
    isMenuOpen ||
    isVolumeHovered ||
    isPressHolding ||
    showOptionsMenu ||
    showViewersSheet ||
    showDeleteConfirm;

  // Mark active story as viewed after 1.2s of playback and update ring cache
  useEffect(() => {
    if (
      !activeStory ||
      activeStory.hasViewed ||
      !currentUser ||
      activeStory.authorId === currentUser.id
    ) {
      return;
    }

    const timer = setTimeout(() => {
      viewStoryMutation.mutate(activeStory.id, {
        onSuccess: () => {
          markStoryViewed(activeStory.id);
          queryClient.invalidateQueries({ queryKey: ['stories', 'feed'] });
        },
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [activeStory?.id, currentUser?.id]);

  // Real-time synchronization for active story (live views, reactions, poll updates)
  useEffect(() => {
    if (!activeStory?.id) return;
    const storyId = activeStory.id;

    let socket: ReturnType<typeof getSocket> | null = null;
    try {
      socket = getSocket();
    } catch {
      return;
    }
    if (!socket) return;

    socket.emit('subscribeStory', { storyId });

    const handleLiveView = (payload: { storyId: string; viewer: any; viewedAt: string }) => {
      if (payload.storyId !== storyId) return;
      setViewersData((prev) => {
        if (!prev) {
          return {
            totalViews: 1,
            viewers: [{ user: payload.viewer, viewedAt: payload.viewedAt, reaction: null }],
          };
        }
        const alreadyIn = prev.viewers.some((v) => v.user.id === payload.viewer.id);
        if (alreadyIn) return prev;
        return {
          totalViews: prev.totalViews + 1,
          viewers: [
            { user: payload.viewer, viewedAt: payload.viewedAt, reaction: null },
            ...prev.viewers,
          ],
        };
      });
    };

    const handleLiveReaction = (payload: {
      storyId: string;
      userId: string;
      user: any;
      emoji: string;
    }) => {
      if (payload.storyId !== storyId) return;
      setViewersData((prev) => {
        if (!prev) return prev;
        const exists = prev.viewers.some((v) => v.user.id === payload.userId);
        if (exists) {
          return {
            ...prev,
            viewers: prev.viewers.map((v) =>
              v.user.id === payload.userId ? { ...v, reaction: payload.emoji } : v,
            ),
          };
        }
        return {
          totalViews: prev.totalViews + 1,
          viewers: [
            { user: payload.user, viewedAt: new Date().toISOString(), reaction: payload.emoji },
            ...prev.viewers,
          ],
        };
      });

      // Trigger reaction burst on center active card
      const target = document.getElementById('story-active-card');
      if (target) {
        const rect = target.getBoundingClientRect();
        reactionBurstEngine.triggerBurst(
          rect.left + rect.width / 2,
          rect.bottom - 90,
          payload.emoji,
        );
      }
    };

    const handleLivePoll = (payload: { storyId: string; pollResult: any }) => {
      if (payload.storyId !== storyId || !payload.pollResult) return;
      const currentGroups = useStoryViewerStore.getState().groups;
      const updated = currentGroups.map((g, gIdx) => {
        if (gIdx !== activeGroupIndex) return g;
        return {
          ...g,
          stories: g.stories.map((s, sIdx) => {
            if (sIdx !== activeStoryIndex) return s;
            return {
              ...s,
              pollResult: payload.pollResult,
            };
          }),
        };
      });
      useStoryViewerStore.getState().setGroups(updated);
    };

    socket.on('story:viewed', handleLiveView);
    socket.on('story:reacted', handleLiveReaction);
    socket.on('story:poll_voted', handleLivePoll);

    return () => {
      socket.emit('unsubscribeStory', { storyId });
      socket.off('story:viewed', handleLiveView);
      socket.off('story:reacted', handleLiveReaction);
      socket.off('story:poll_voted', handleLivePoll);
    };
  }, [activeStory?.id, activeGroupIndex, activeStoryIndex]);

  // Media Prefetching: prefetch next 1-2 stories in background
  useEffect(() => {
    if (!currentGroup) return;

    let nextStoryItem: StoryViewResponse | undefined;
    if (activeStoryIndex < currentGroup.stories.length - 1) {
      nextStoryItem = currentGroup.stories[activeStoryIndex + 1];
    } else if (activeGroupIndex < groups.length - 1) {
      nextStoryItem = groups[activeGroupIndex + 1]?.stories[0];
    }

    if (
      nextStoryItem?.mediaUrl &&
      !nextStoryItem.mediaUrl.startsWith('color:') &&
      !nextStoryItem.mediaUrl.startsWith('blob:')
    ) {
      if (nextStoryItem.mediaType === 'IMAGE') {
        const img = new Image();
        img.onerror = () => {};
        img.src = nextStoryItem.mediaUrl;
      }
    }
  }, [activeGroupIndex, activeStoryIndex, groups]);

  // Reset transient menus and options when switching stories, groups or closing viewer
  useEffect(() => {
    setShowOptionsMenu(false);
    setMenuOpen(false);
    setShowViewersSheet(false);
  }, [activeGroupIndex, activeStoryIndex, isOpen]);

  // Active Audio Overlay (Music sticker or voice track)
  const activeAudioOverlay = activeStory?.overlays?.find((o) => o.type === 'audio') as
    AudioOverlay | undefined;

  // Resolve legacy API endpoints on activeAudioOverlay if present
  useEffect(() => {
    if (!activeAudioOverlay?.audioUrl) return;
    const url = activeAudioOverlay.audioUrl;
    if (url.includes('/integrations/soundcloud/stream/')) {
      const match = url.match(/stream\/([^/?#]+)/);
      if (match && match[1]) {
        integrationsApi
          .getSoundCloudStream(match[1])
          .then((res) => {
            if (res?.streamUrl) {
              activeAudioOverlay.audioUrl = res.streamUrl;
              if (audioRef.current && !audioRef.current.src.includes(res.streamUrl)) {
                audioRef.current.src = res.streamUrl;
                if (!isEffectivelyPaused) {
                  audioRef.current.play().catch(() => {});
                }
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [activeAudioOverlay?.audioUrl, isEffectivelyPaused]);

  // Set initial start time and loop snippet when audio overlay loads
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeAudioOverlay?.audioUrl) return;

    const startSec = (activeAudioOverlay.startTimeMs || 0) / 1000;
    const clipSec = activeAudioOverlay.clipDurationSeconds || 15;
    const endSec = startSec + clipSec;

    const setTimeWhenReady = () => {
      try {
        audio.currentTime = startSec;
      } catch {}
    };

    if (audio.readyState >= 1) {
      setTimeWhenReady();
    } else {
      audio.addEventListener('loadedmetadata', setTimeWhenReady, { once: true });
    }

    const handleLoop = () => {
      if (audio.currentTime >= endSec || audio.currentTime < startSec) {
        audio.currentTime = startSec;
      }
    };

    audio.addEventListener('timeupdate', handleLoop);
    return () => {
      audio.removeEventListener('timeupdate', handleLoop);
    };
  }, [
    activeStory?.id,
    activeAudioOverlay?.startTimeMs,
    activeAudioOverlay?.clipDurationSeconds,
    activeAudioOverlay?.audioUrl,
  ]);

  // Sync Video & Audio Elements with Sound Settings, Balancing & Buffering
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (video) {
      // If audio overlay exists, balance video volume according to audioOverlay.videoVolume (or mute)
      const vidVolSetting = activeAudioOverlay ? (activeAudioOverlay.videoVolume ?? 0) : 100;
      const shouldMuteVid = isMuted || vidVolSetting === 0;
      video.muted = shouldMuteVid;
      video.volume = shouldMuteVid ? 0 : (vidVolSetting / 100) * volume;

      if (isEffectivelyPaused) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    }

    if (audio) {
      if (activeAudioOverlay?.audioUrl) {
        const audioUrl = activeAudioOverlay.audioUrl;
        const musVolSetting = activeAudioOverlay.musicVolume ?? 100;
        audio.muted = isMuted;
        audio.volume = isMuted ? 0 : (musVolSetting / 100) * volume;

        const isHls = audioUrl.includes('.m3u8');

        if (isHls && !audio.canPlayType('application/vnd.apple.mpegurl') && Hls.isSupported()) {
          if (!viewerHlsRef.current) {
            const hls = new Hls({ enableWorker: true });
            viewerHlsRef.current = hls;
            hls.loadSource(audioUrl);
            hls.attachMedia(audio);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              if (!isEffectivelyPaused) {
                audio.play().catch(() => {});
              }
            });
          } else if (isEffectivelyPaused) {
            audio.pause();
          } else {
            audio.play().catch(() => {});
          }
        } else {
          if (viewerHlsRef.current) {
            try {
              viewerHlsRef.current.destroy();
            } catch {}
            viewerHlsRef.current = null;
          }
          if (audio.src !== audioUrl) {
            audio.src = audioUrl;
          }
          if (isEffectivelyPaused) {
            audio.pause();
          } else {
            audio.play().catch(() => {});
          }
        }
      } else {
        if (viewerHlsRef.current) {
          try {
            viewerHlsRef.current.destroy();
          } catch {}
          viewerHlsRef.current = null;
        }
        audio.pause();
        audio.removeAttribute('src');
      }
    }

    return () => {
      if (viewerHlsRef.current) {
        try {
          viewerHlsRef.current.destroy();
        } catch {}
        viewerHlsRef.current = null;
      }
    };
  }, [isMuted, volume, isEffectivelyPaused, activeAudioOverlay, activeStory?.id]);

  // Video Time Update & Synchronization
  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setVideoProgress(video.currentTime / video.duration);
  };

  const handleVideoEnded = () => {
    handleGoNext();
  };

  // Keyboard navigation & Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || showDeleteConfirm) return;

      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isEditable =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (isEditable) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleGoNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeViewer();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'Space') {
        e.preventDefault();
        setPaused(!isPaused);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPaused, handleGoNext, handleGoPrev, closeViewer, toggleMute, setPaused]);

  // Press & Hold to pause gesture (>150ms holds, release resumes)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    wasHoldingRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      wasHoldingRef.current = true;
      setIsPressHolding(true);
    }, 150);
  };

  const handlePointerUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (isPressHolding) {
      setIsPressHolding(false);
    }
  };

  // Edge Tap navigation: Left 35% = back, Right 65% = forward
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (wasHoldingRef.current) {
      wasHoldingRef.current = false;
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;

    if (ratio < 0.35) {
      handleGoPrev();
    } else {
      handleGoNext();
    }
  };

  // Reaction burst & like toggle
  const isLiked = activeStory
    ? (localReactions[activeStory.id] ?? activeStory.userReaction) === '❤️'
    : false;

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeStory) return;

    if (isLiked) {
      setLocalReactions((prev) => ({ ...prev, [activeStory.id]: '' }));
      reactStoryMutation.mutate({ storyId: activeStory.id, emoji: '' });
    } else {
      setLocalReactions((prev) => ({ ...prev, [activeStory.id]: '❤️' }));
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      reactionBurstEngine.triggerBurst(rect.left + rect.width / 2, rect.top, '❤️');
      reactStoryMutation.mutate({ storyId: activeStory.id, emoji: '❤️' });
    }
  };

  // Direct reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeStory || isSendingReply) return;

    setIsSendingReply(true);
    try {
      await replyStoryMutation.mutateAsync({
        storyId: activeStory.id,
        text: replyText.trim(),
      });
      setReplyText('');
      setReplySentSuccess(true);
      setTimeout(() => setReplySentSuccess(false), 2400);
    } catch {
      // reply error fallback
    } finally {
      setIsSendingReply(false);
    }
  };

  // Load Viewers list for author
  const handleOpenViewersSheet = async () => {
    if (!activeStory || !isOwnStory) return;
    setShowViewersSheet(true);
    setIsLoadingViewers(true);

    try {
      const data = await storiesApi.getStoryViewers(activeStory.id);
      setViewersData(data);
    } catch {
      // view error
    } finally {
      setIsLoadingViewers(false);
    }
  };

  // Delete own story
  const handleDeleteStory = async () => {
    if (!activeStory || !isOwnStory) return;
    const storyIdToDelete = activeStory.id;
    setShowDeleteConfirm(false);

    try {
      await deleteStoryMutation.mutateAsync(storyIdToDelete);
    } catch (err) {
      console.error('Failed to delete story:', err);
    }
  };

  // Copy link
  const handleCopyLink = () => {
    if (!activeStory) return;
    const url = `${window.location.origin}/profile/${currentGroup?.user?.username}?story=${activeStory.id}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Share story
  const handleShareStory = () => {
    if (!activeStory) return;
    const url = `${window.location.origin}/profile/${currentGroup?.user?.username}?story=${activeStory.id}`;
    if (navigator.share) {
      navigator
        .share({
          title: `Story by ${currentGroup?.user?.displayName || currentGroup?.user?.username}`,
          url,
        })
        .catch(() => {});
    } else {
      handleCopyLink();
    }
    setShowOptionsMenu(false);
    setMenuOpen(false);
  };

  // Volume hover handlers (Spotify-style)
  const handleVolumeMouseEnter = () => {
    if (volumeHoverTimeoutRef.current) clearTimeout(volumeHoverTimeoutRef.current);
    setVolumeHovered(true);
  };

  const handleVolumeMouseLeave = () => {
    volumeHoverTimeoutRef.current = setTimeout(() => {
      setVolumeHovered(false);
    }, 450);
  };

  if (!isOpen || !currentGroup || !activeStory) return null;

  // Neighbor preview groups for Smart Feed desktop carousel (Screenshot 2)
  const prevGroups = groups.slice(Math.max(0, activeGroupIndex - 2), activeGroupIndex);
  const nextGroups = groups.slice(activeGroupIndex + 1, activeGroupIndex + 3);

  const canGoPrev = activeGroupIndex > 0 || activeStoryIndex > 0;
  const canGoNext =
    activeGroupIndex < groups.length - 1 || activeStoryIndex < currentGroup.stories.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#070709]/95 backdrop-blur-3xl select-none animate-fadeIn">
        {/* Ambient Blurred Tint */}
        <div
          className="absolute inset-0 opacity-20 filter blur-3xl scale-125 pointer-events-none transition-all duration-700"
          style={{
            background:
              activeStory.mediaUrl && !activeStory.mediaUrl.startsWith('color:')
                ? `url(${activeStory.mediaUrl}) center/cover no-repeat`
                : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)',
          }}
        />

        {/* Hidden Audio Player for SoundCloud Music and Voice stories */}
        <audio ref={audioRef} playsInline preload="auto" loop className="hidden" />

        {/* Top Left Brand Logo (Instagram/Eternal Desktop style) */}
        <div className="absolute top-5 left-6 z-50 hidden md:flex items-center gap-2 select-none pointer-events-none">
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-gray-200 to-purple-300 bg-clip-text text-transparent drop-shadow-md">
            Eternal
          </span>
        </div>

        {/* Global Close Button (top-right) */}
        <button
          type="button"
          onClick={closeViewer}
          aria-label="Close story viewer"
          className="absolute top-5 right-5 md:top-6 md:right-6 z-50 w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xl hover:scale-105 backdrop-blur-xl border border-white/15"
        >
          <X size={20} />
        </button>

        {/* Desktop 3D Smart Feed Carousel / Mobile Fullscreen Stage */}
        <div className="relative w-full h-full flex items-center justify-center px-4 lg:px-8 overflow-hidden">
          {/* Left Preview Cards (up to 2 previous user groups, anchored to the left of the central stage) */}
          <div className="hidden lg:flex items-center gap-4 shrink-0 absolute right-[calc(50%+285px)] xl:right-[calc(50%+300px)] top-1/2 -translate-y-1/2 z-10 pointer-events-auto">
            {prevGroups.map((group, idx) => {
              const targetIndex = activeGroupIndex - (prevGroups.length - idx);
              const previewStory = group.stories[0];
              const isCloseFriend = group.hasCloseFriendsStory;
              const previewDetails = getStoryPreviewDetails(previewStory);

              return (
                <div
                  key={group.user.id}
                  onClick={() => {
                    setDirection(-1);
                    setGroupAndStory(targetIndex, 0);
                  }}
                  className="relative w-[170px] xl:w-[195px] aspect-[9/16] max-h-[64vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl cursor-pointer group transition-all duration-300 hover:scale-[1.03] hover:border-white/25 flex flex-col items-center justify-center bg-[#09090b]"
                >
                  {/* Darkened Blur Cover Background */}
                  <div
                    className="absolute inset-0 w-full h-full overflow-hidden"
                    style={{ background: previewDetails.background }}
                  >
                    {previewDetails.type === 'video' ? (
                      <video
                        src={previewDetails.url}
                        muted
                        playsInline
                        className="w-full h-full object-cover filter blur-md scale-110 brightness-40"
                      />
                    ) : previewDetails.type === 'image' && previewDetails.url ? (
                      <img
                        src={previewDetails.url}
                        alt=""
                        className="w-full h-full object-cover filter blur-md scale-110 brightness-40"
                      />
                    ) : (
                      <div
                        className="w-full h-full filter blur-sm scale-110 opacity-70"
                        style={{ background: previewDetails.background }}
                      />
                    )}
                    {/* Semi-transparent dark overlay for text contrast */}
                    <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity group-hover:bg-black/25" />
                  </div>

                  {/* Centered User Info */}
                  <div className="relative z-20 flex flex-col items-center text-center p-3">
                    <div
                      className="p-[2.5px] rounded-full shadow-lg transition-transform group-hover:scale-105"
                      style={{
                        background: group.hasUnviewed
                          ? isCloseFriend
                            ? 'linear-gradient(135deg, #10b981 0%, #22c55e 50%, #14b8a6 100%)'
                            : 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #6366f1 100%)'
                          : 'rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <div className="p-[2px] rounded-full bg-[#09090b]">
                        <Avatar
                          src={group.user.avatar}
                          alt={group.user.displayName || group.user.username}
                          className="w-13 h-13"
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white mt-2.5 truncate max-w-[130px] drop-shadow-md">
                      {group.user.displayName || group.user.username}
                    </span>
                    <span className="text-[11px] text-gray-300 mt-0.5 drop-shadow-sm font-medium">
                      {formatRelativeTime(previewStory?.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Central Active Story Stage (Guaranteed 100% Dead-Center of Viewport) */}
          <div
            className="relative flex items-center justify-center shrink-0 z-20 w-full h-full md:h-auto max-h-[100dvh] md:max-h-[86vh] aspect-auto md:aspect-[9/16]"
            style={{
              width: 'min(100%, min(410px, calc(86vh * 9 / 16)))',
            }}
          >
            {/* Floating Left Chevron Button (Positioned absolute to the left of the central card) */}
            {canGoPrev && (
              <button
                type="button"
                onClick={handleGoPrev}
                aria-label="Previous story"
                className="hidden md:flex absolute -left-14 lg:-left-16 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#181822]/80 hover:bg-[#252535] border border-white/15 text-white items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all hover:scale-110 active:scale-95 cursor-pointer z-30"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            {/* Central 3D Animated Card Stage */}
            <div className="relative w-full h-full">
              <AnimatePresence custom={direction} initial={false}>
                <motion.div
                  key={`${currentGroup.user.id}-${activeStory.id}`}
                  custom={direction}
                  variants={storyTransitionVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  id="story-active-card"
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={0.6}
                  onDragEnd={(_e, info) => {
                    if (info.offset.y > 120) {
                      closeViewer();
                    }
                  }}
                  className="absolute inset-0 w-full h-full rounded-none md:rounded-3xl overflow-hidden border-0 md:border md:border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.25)] flex flex-col justify-between select-none"
                  style={{
                    background:
                      (
                        activeStory.overlays?.find(
                          (o) => o.type === 'image' && (o as ImageOverlay).isMainMedia,
                        ) as ImageOverlay
                      )?.backgroundColor ||
                      (activeStory.mediaUrl.startsWith('color:')
                        ? activeStory.mediaUrl.replace('color:', '')
                        : '#09090b'),
                    containerType: 'inline-size',
                    willChange: 'transform, opacity',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'translateZ(0)',
                  }}
                >
                  {/* Smooth GPU Darkening Overlay during Transition (No blur filter overhead) */}
                  <motion.div
                    className="absolute inset-0 bg-black pointer-events-none z-30"
                    initial={{ opacity: 0.35 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0.55 }}
                    transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }}
                  />

                  {/* Story Media Background & Overlays (with Hold to Pause & Edge Tap Zones) */}
                  <div
                    onClick={handleCardClick}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    className="absolute inset-0 w-full h-full cursor-pointer overflow-hidden"
                  >
                    {activeStory.mediaType === 'IMAGE' &&
                      !activeStory.mediaUrl.startsWith('color:') &&
                      !activeStory.overlays?.some(
                        (o) => o.type === 'image' && (o as ImageOverlay).isMainMedia,
                      ) && (
                        <img
                          src={activeStory.mediaUrl}
                          alt="Story"
                          style={{
                            filter: getStoryFilterCss(activeStory.filter || undefined),
                            willChange: 'filter',
                            transform: 'translateZ(0)',
                          }}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      )}

                    {activeStory.mediaType === 'VIDEO' && (
                      <video
                        ref={videoRef}
                        src={activeStory.mediaUrl}
                        autoPlay
                        playsInline
                        muted={
                          isMuted ||
                          (activeAudioOverlay ? activeAudioOverlay.videoVolume === 0 : false)
                        }
                        onTimeUpdate={handleVideoTimeUpdate}
                        onEnded={handleVideoEnded}
                        onWaiting={() => setTimeout(() => setBuffering(true), 0)}
                        onStalled={() => setTimeout(() => setBuffering(true), 0)}
                        onPlaying={() => setTimeout(() => setBuffering(false), 0)}
                        onCanPlay={() => setTimeout(() => setBuffering(false), 0)}
                        style={{
                          filter: getStoryFilterCss(activeStory.filter || undefined),
                          willChange: 'filter',
                          transform: 'translateZ(0)',
                        }}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    )}

                    {/* Full-Frame Drawing Layer in Viewer (Instagram-style) */}
                    {activeStory.overlays
                      ?.filter((o): o is DrawingOverlay => o.type === 'drawing')
                      .map((drawing) => (
                        <div
                          key={drawing.id}
                          className="absolute inset-0 w-full h-full pointer-events-none z-[12]"
                        >
                          <StoryDrawingOverlayView overlay={drawing} />
                        </div>
                      ))}

                    {/* Overlays Rendering in Normalized Coordinates (Author Caption pinned below, Drawing rendered separately) */}
                    {activeStory.overlays
                      ?.filter(
                        (overlay) => overlay.type !== 'caption' && overlay.type !== 'drawing',
                      )
                      .map((overlay) => (
                        <div
                          key={overlay.id}
                          style={{
                            left: `${overlay.xPercent}%`,
                            top: `${overlay.yPercent}%`,
                            transform: `translate(-50%, -50%) rotate(${overlay.rotation ?? 0}deg) scale(${
                              overlay.scale ?? 1
                            })`,
                            zIndex: overlay.zIndex ?? 1,
                          }}
                          className="absolute z-20 pointer-events-auto select-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* 1. Image Overlay (Main Photo or Sticker Photo with Resilient Fallback) */}
                          {overlay.type === 'image' &&
                            (() => {
                              const isBlobOrEmpty = !overlay.url || overlay.url.startsWith('blob:');
                              const effectiveSrc =
                                overlay.isMainMedia || isBlobOrEmpty
                                  ? activeStory.mediaUrl
                                  : overlay.url;
                              if (
                                !effectiveSrc ||
                                effectiveSrc.startsWith('color:') ||
                                effectiveSrc.startsWith('#') ||
                                effectiveSrc.startsWith('linear-gradient') ||
                                effectiveSrc.startsWith('radial-gradient')
                              ) {
                                return null;
                              }
                              return (
                                <div
                                  className="rounded-2xl overflow-hidden shadow-2xl"
                                  style={{
                                    filter: getStoryFilterCss(activeStory.filter || undefined),
                                    willChange: 'filter',
                                    transform: 'translateZ(0)',
                                  }}
                                >
                                  <img
                                    src={effectiveSrc}
                                    alt=""
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = 'none';
                                    }}
                                    className="max-w-[320px] max-h-[380px] object-cover pointer-events-none rounded-2xl select-none"
                                  />
                                </div>
                              );
                            })()}

                          {/* 2. Text Overlay */}
                          {overlay.type === 'text' && (
                            <div
                              style={{
                                color: overlay.color || '#ffffff',
                                fontFamily: getStoryFontFamily(overlay.fontFamily),
                                fontSize: `${overlay.fontSizeCqw ?? 6.5}cqw`,
                                fontStyle: overlay.fontStyle || 'normal',
                              }}
                              className={`px-3.5 py-1.5 rounded-2xl text-${
                                overlay.textAlign || 'center'
                              } whitespace-pre-wrap select-none font-bold leading-snug ${
                                overlay.animation === 'float'
                                  ? 'story-anim-float'
                                  : overlay.animation === 'bounce'
                                    ? 'story-anim-bounce'
                                    : overlay.animation === 'glow'
                                      ? 'story-anim-glow'
                                      : overlay.animation === 'wave'
                                        ? 'story-anim-wave'
                                        : overlay.animation === 'typewriter'
                                          ? 'story-anim-typewriter'
                                          : ''
                              } ${
                                overlay.backgroundStyle === 'solid'
                                  ? 'shadow-xl'
                                  : overlay.backgroundStyle === 'glass'
                                    ? 'bg-white/20 backdrop-blur-xl border border-white/25 shadow-xl'
                                    : overlay.backgroundStyle === 'highlight'
                                      ? 'bg-amber-400 text-black font-black shadow-lg'
                                      : overlay.backgroundStyle === 'neon'
                                        ? 'bg-purple-600/80 border border-pink-400 shadow-[0_0_20px_rgba(168,85,247,0.8)]'
                                        : 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]'
                              }`}
                            >
                              {overlay.text}
                            </div>
                          )}

                          {/* 4. Poll Overlay with Interactive Voting */}
                          {overlay.type === 'poll' && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="w-[260px] bg-[#14141c]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 shadow-2xl flex flex-col gap-2.5"
                            >
                              <span className="text-xs font-bold text-white text-center">
                                {overlay.question}
                              </span>
                              <div className="flex flex-col gap-1.5">
                                {overlay.options.map((opt, idx) => {
                                  const pollResult = activeStory.pollResult;
                                  const hasVoted =
                                    pollResult?.userVotedIndex !== null &&
                                    pollResult?.userVotedIndex !== undefined;
                                  const optResult = pollResult?.options?.[idx];
                                  const isSelected = pollResult?.userVotedIndex === idx;

                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      disabled={votePollMutation.isPending}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        votePollMutation.mutate({
                                          storyId: activeStory.id,
                                          optionIndex: idx,
                                        });
                                      }}
                                      className={`relative w-full py-2.5 px-3.5 rounded-2xl border text-xs font-bold text-left transition-all overflow-hidden flex items-center justify-between cursor-pointer ${
                                        isSelected
                                          ? 'border-purple-500 bg-purple-600/30 text-white'
                                          : 'border-white/10 bg-white/5 hover:bg-white/15 text-gray-200'
                                      }`}
                                    >
                                      {hasVoted && optResult && (
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${optResult.percentage}%` }}
                                          transition={{ duration: 0.4, ease: 'easeOut' }}
                                          className="absolute left-0 top-0 bottom-0 bg-purple-500/25 pointer-events-none rounded-2xl"
                                        />
                                      )}
                                      <span className="relative z-10 truncate">{opt.text}</span>
                                      {hasVoted && optResult && (
                                        <span className="relative z-10 text-[11px] font-black text-purple-300 ml-2">
                                          {optResult.percentage}%
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 5. Link Overlay */}
                          {overlay.type === 'link' && (
                            <a
                              href={overlay.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black font-black text-xs shadow-2xl hover:scale-105 transition-transform"
                            >
                              <ExternalLink size={13} className="stroke-[2.5]" />
                              <span>{overlay.title}</span>
                            </a>
                          )}

                          {/* 6. Mention Overlay */}
                          {overlay.type === 'mention' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                closeViewer();
                                navigate(`/profile/${overlay.username}`);
                              }}
                              className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-lg hover:scale-105 transition-transform cursor-pointer"
                            >
                              <AtSign size={13} />
                              <span>{overlay.username}</span>
                            </button>
                          )}

                          {/* 7. Audio / Music Sticker (4 styles support) */}
                          {overlay.type === 'audio' && (
                            <StoryMusicStickerView
                              overlay={overlay as AudioOverlay}
                              isEditor={false}
                              isPlaying={!isEffectivelyPaused}
                              isHeld={isPressHolding}
                            />
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Top Header & Segmented Progress Bars (Screenshot 2 Match) */}
                  <div className="relative z-30 pt-3 px-3.5 pb-6 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none">
                    {/* Segmented Progress Bars (Fluid 60/120fps GPU Progress) */}
                    <div className="flex items-center gap-1.5 w-full mb-3">
                      {currentGroup.stories.map((s, idx) => {
                        const isCurrent = idx === activeStoryIndex;
                        const isPassed = idx < activeStoryIndex;
                        const isVideo = s.mediaType === 'VIDEO';
                        const audioOverlay = s.overlays?.find((o) => o.type === 'audio') as
                          AudioOverlay | undefined;
                        const durationMs = isVideo
                          ? 0
                          : audioOverlay?.clipDurationSeconds
                            ? audioOverlay.clipDurationSeconds * 1000
                            : s.mediaType === 'VOICE'
                              ? 10000
                              : STORY_DURATION_MS;

                        return (
                          <StorySegmentProgressBar
                            key={s.id}
                            isActive={isCurrent}
                            isPassed={isPassed}
                            isPaused={isEffectivelyPaused}
                            durationMs={durationMs}
                            isVideo={isVideo}
                            videoRef={videoRef}
                            onComplete={handleGoNext}
                          />
                        );
                      })}
                    </div>

                    {/* Author Info Bar & Header Right Controls */}
                    <div className="flex items-center justify-between pointer-events-auto">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          closeViewer();
                          navigate(`/profile/${currentGroup.user.username}`);
                        }}
                        className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <div
                          className="p-[1.5px] rounded-full"
                          style={{
                            background: currentGroup.hasCloseFriendsStory
                              ? 'linear-gradient(135deg, #10b981, #14b8a6)'
                              : 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                          }}
                        >
                          <Avatar src={currentGroup.user.avatar} size="xs" />
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate max-w-[130px]">
                              {currentGroup.user.displayName || currentGroup.user.username}
                            </span>
                            {activeStory.privacy === 'CLOSE_FRIENDS' && (
                              <div
                                className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[8px] font-black"
                                title="Close Friends"
                              >
                                ★
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-300">
                            {formatRelativeTime(activeStory.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Right Header Action Controls: Volume with Hover Slider, Pause/Play, Three Dots */}
                      <div className="flex items-center gap-1.5">
                        {/* 1. Volume button with SpotifyBottomDock hover slider */}
                        <div
                          className="relative"
                          onMouseEnter={handleVolumeMouseEnter}
                          onMouseLeave={handleVolumeMouseLeave}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMute();
                            }}
                            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/10"
                            title={isMuted ? 'Unmute' : 'Mute'}
                          >
                            {isMuted || volume === 0 ? (
                              <VolumeX size={16} className="text-red-400" />
                            ) : volume < 0.5 ? (
                              <Volume1 size={16} />
                            ) : (
                              <Volume2 size={16} />
                            )}
                          </button>

                          {/* Liquid Glass Volume Slider Popover */}
                          <AnimatePresence>
                            {isVolumeHovered && (
                              <motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute top-full mt-2 right-0 px-3 py-2 rounded-2xl flex items-center gap-2 z-50 shadow-2xl"
                                style={{
                                  background:
                                    'linear-gradient(135deg, rgba(24, 25, 34, 0.9) 0%, rgba(13, 14, 20, 0.95) 100%)',
                                  backdropFilter: 'blur(32px) saturate(200%)',
                                  WebkitBackdropFilter: 'blur(32px) saturate(200%)',
                                  border: '1px solid rgba(255, 255, 255, 0.18)',
                                  boxShadow:
                                    '0 16px 36px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.3)',
                                }}
                              >
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  value={isMuted ? 0 : volume}
                                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                                  className="w-20 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-purple-500"
                                />
                                <span className="text-[10px] font-mono text-gray-300 w-7 text-right">
                                  {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                                </span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* 2. Pause / Play button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaused(!isPaused);
                          }}
                          className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/10"
                          title={isPaused ? 'Resume' : 'Pause'}
                        >
                          {isPaused ? (
                            <Play size={14} className="fill-white text-white ml-0.5" />
                          ) : (
                            <Pause size={14} className="fill-white text-white" />
                          )}
                        </button>

                        {/* 3. Three Dots (...) Menu */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = !showOptionsMenu;
                              setShowOptionsMenu(next);
                              setMenuOpen(next);
                            }}
                            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/10"
                            title="Story options"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {/* Frosted Glass Dropdown Popover */}
                          <AnimatePresence>
                            {showOptionsMenu && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowOptionsMenu(false);
                                    setMenuOpen(false);
                                  }}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-full mt-2 bg-[#16161f]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-1.5 shadow-2xl z-50 min-w-[180px]"
                                >
                                  <button
                                    type="button"
                                    onClick={handleCopyLink}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                                  >
                                    <Link2 size={14} className="text-purple-400" />
                                    <span>{copySuccess ? 'Copied!' : 'Copy link'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleShareStory}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                                  >
                                    <Share2 size={14} className="text-blue-400" />
                                    <span>Share</span>
                                  </button>
                                  {isOwnStory ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowOptionsMenu(false);
                                        setMenuOpen(false);
                                        setShowDeleteConfirm(true);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                                    >
                                      <Trash2 size={14} />
                                      <span>Delete story</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowOptionsMenu(false);
                                        setMenuOpen(false);
                                        alert('Report submitted to moderators');
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                                    >
                                      <AlertCircle size={14} />
                                      <span>Report</span>
                                    </button>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer: Reply Input + Heart Reaction + Views */}
                  <div className="relative z-30 p-3.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2 pointer-events-auto">
                    {/* Author Story Caption (Compact Instagram-style translucent pill) */}
                    {authorCaption && (
                      <div className="self-center max-w-[92%] px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-white shadow-lg mb-1 select-none animate-fadeIn flex items-center justify-center text-center">
                        <p className="text-xs font-medium text-white/95 truncate">
                          {authorCaption}
                        </p>
                      </div>
                    )}

                    {/* If Own Story: Viewers Sheet Button */}
                    {isOwnStory ? (
                      <button
                        type="button"
                        onClick={handleOpenViewersSheet}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all cursor-pointer backdrop-blur-md shadow-lg"
                      >
                        <Eye size={16} className="text-purple-400" />
                        <span>Views ({activeStory.viewsCount})</span>
                      </button>
                    ) : (
                      <div className="relative w-full">
                        <AnimatePresence>
                          {replySentSuccess && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.95 }}
                              className="absolute -top-10 left-1/2 -translate-y-0 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-[0_4px_16px_rgba(147,51,234,0.4)] backdrop-blur-md border border-white/20 pointer-events-none z-40 whitespace-nowrap"
                            >
                              <Check size={13} className="text-white" />
                              <span>Reply sent</span>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <form
                          onSubmit={handleSendReply}
                          className="flex items-center gap-2 w-full mt-1"
                        >
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                            placeholder={`Reply to ${
                              currentGroup.user.displayName || currentGroup.user.username
                            }...`}
                            className="flex-1 bg-white/10 border border-white/20 focus:border-purple-500 rounded-full px-4 py-2 text-xs text-white placeholder-gray-400 backdrop-blur-xl focus:outline-none transition-colors"
                          />

                          {/* Heart Reaction Button */}
                          <button
                            type="button"
                            onClick={handleToggleLike}
                            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shrink-0 ${
                              isLiked
                                ? 'bg-red-500/20 border-red-500/50 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.35)]'
                                : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
                            }`}
                            title={isLiked ? 'Liked' : 'Like'}
                          >
                            <Heart
                              size={18}
                              className={`transition-colors ${
                                isLiked
                                  ? 'text-red-500 fill-red-500'
                                  : 'text-white hover:text-red-400'
                              }`}
                            />
                          </button>

                          {/* Send Button */}
                          <button
                            type="submit"
                            disabled={!replyText.trim() || isSendingReply}
                            className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
                          >
                            <Send size={15} />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Floating Right Chevron Button (Positioned absolute to the right of the central card) */}
            {canGoNext && (
              <button
                type="button"
                onClick={handleGoNext}
                aria-label="Next story"
                className="hidden md:flex absolute -right-14 lg:-right-16 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#181822]/80 hover:bg-[#252535] border border-white/15 text-white items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all hover:scale-110 active:scale-95 cursor-pointer z-30"
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>

          {/* Right Preview Cards (up to 2 next user groups, anchored to the right of the central stage) */}
          <div className="hidden lg:flex items-center gap-4 shrink-0 absolute left-[calc(50%+285px)] xl:left-[calc(50%+300px)] top-1/2 -translate-y-1/2 z-10 pointer-events-auto">
            {nextGroups.map((group, idx) => {
              const targetIndex = activeGroupIndex + 1 + idx;
              const previewStory = group.stories[0];
              const isCloseFriend = group.hasCloseFriendsStory;
              const previewDetails = getStoryPreviewDetails(previewStory);

              return (
                <div
                  key={group.user.id}
                  onClick={() => {
                    setDirection(1);
                    setGroupAndStory(targetIndex, 0);
                  }}
                  className="relative w-[170px] xl:w-[195px] aspect-[9/16] max-h-[64vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl cursor-pointer group transition-all duration-300 hover:scale-[1.03] hover:border-white/25 flex flex-col items-center justify-center bg-[#09090b]"
                >
                  {/* Darkened Blur Cover Background */}
                  <div
                    className="absolute inset-0 w-full h-full overflow-hidden"
                    style={{ background: previewDetails.background }}
                  >
                    {previewDetails.type === 'video' ? (
                      <video
                        src={previewDetails.url}
                        muted
                        playsInline
                        className="w-full h-full object-cover filter blur-md scale-110 brightness-40"
                      />
                    ) : previewDetails.type === 'image' && previewDetails.url ? (
                      <img
                        src={previewDetails.url}
                        alt=""
                        className="w-full h-full object-cover filter blur-md scale-110 brightness-40"
                      />
                    ) : (
                      <div
                        className="w-full h-full filter blur-sm scale-110 opacity-70"
                        style={{ background: previewDetails.background }}
                      />
                    )}
                    {/* Semi-transparent dark overlay for text contrast */}
                    <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity group-hover:bg-black/25" />
                  </div>

                  {/* Centered User Info */}
                  <div className="relative z-20 flex flex-col items-center text-center p-3">
                    <div
                      className="p-[2.5px] rounded-full shadow-lg transition-transform group-hover:scale-105"
                      style={{
                        background: group.hasUnviewed
                          ? isCloseFriend
                            ? 'linear-gradient(135deg, #10b981 0%, #22c55e 50%, #14b8a6 100%)'
                            : 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #6366f1 100%)'
                          : 'rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <div className="p-[2px] rounded-full bg-[#09090b]">
                        <Avatar
                          src={group.user.avatar}
                          alt={group.user.displayName || group.user.username}
                          className="w-13 h-13"
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white mt-2.5 truncate max-w-[130px] drop-shadow-md">
                      {group.user.displayName || group.user.username}
                    </span>
                    <span className="text-[11px] text-gray-300 mt-0.5 drop-shadow-sm font-medium">
                      {formatRelativeTime(previewStory?.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Viewers & Reactions Drawer for Story Author */}
        {showViewersSheet && (
          <div className="absolute inset-x-0 bottom-0 z-50 max-h-[60vh] bg-[#14141c]/95 backdrop-blur-2xl border-t border-white/15 rounded-t-3xl p-5 shadow-2xl flex flex-col gap-4 animate-slideUp">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">
                Views ({viewersData?.totalViews || 0})
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowViewersSheet(false);
                  setPaused(false);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[45vh] flex flex-col gap-2.5 pr-1">
              {isLoadingViewers ? (
                <div className="py-8 text-center text-gray-500 text-xs">Loading views...</div>
              ) : viewersData?.viewers && viewersData.viewers.length > 0 ? (
                viewersData.viewers.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-3 rounded-2xl bg-white/[0.03] border border-white/5"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar src={item.user.avatar} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate">
                          {item.user.displayName || item.user.username}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatRelativeTime(item.viewedAt)}
                        </span>
                      </div>
                    </div>

                    {item.reaction && (
                      <span className="text-lg filter drop-shadow-md">{item.reaction}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 text-xs">
                  No one has viewed this story yet
                </div>
              )}
            </div>
          </div>
        )}
        {/* Delete Story Confirmation Modal */}
        <DeleteStoryConfirmModal
          isOpen={showDeleteConfirm}
          isDeleting={deleteStoryMutation.isPending}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteStory}
        />
      </div>
    </AnimatePresence>
  );
}
