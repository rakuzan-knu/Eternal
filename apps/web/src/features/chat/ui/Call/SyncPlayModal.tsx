import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Film,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  X,
  Search,
  Link2,
  ListMusic,
  Plus,
  Trash2,
  RotateCcw,
  RotateCw,
  SkipForward,
  Flame,
  Music2,
  Gamepad2,
  Clock,
  Sparkles,
  Loader2,
  ShieldCheck,
  FolderSearch,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Users,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { YoutubeIcon } from '@/entities/opengraph';
import Avatar from '@/shared/ui/Avatar';
import { WatchTogetherRail } from './WatchTogetherRail';
import Hls from 'hls.js';
import type { SyncPlayEngine } from '../../lib/webrtc/syncPlayEngine';
import { sanitizeMediaUrl } from '@/shared/lib/urlSecurity';
import { getSocket } from '@/shared/api/socket';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useCallStore } from '../../model/callStore';
import { useWatchTogetherStore, type WatchTogetherViewer } from '../../model/useWatchTogetherStore';
import { watchTogetherApi, type WatchTogetherVideoItem } from '../../api/watchTogetherApi';

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          videoId?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: any }) => void;
            onStateChange?: (event: { data: number; target: any }) => void;
            onError?: (event: { data: number }) => void;
          };
        },
      ) => any;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function ensureYouTubeIframeApi(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve();
    };
    if (!document.getElementById('youtube-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
}

function formatTime(secs: number): string {
  const totalSecs = Math.max(0, Math.floor(secs || 0));
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const RECENT_STORAGE_KEY = 'watch_together_recent_history';

type HubTab = 'youtube' | 'direct' | 'queue';
type CategoryType = 'all' | 'continue' | 'trending' | 'music' | 'gaming';

interface SyncPlayModalProps {
  engine: SyncPlayEngine | null;
  isOpen: boolean;
  onClose: () => void;
  driftMs?: number;
  rttMs?: number;
}

export const SyncPlayModal: React.FC<SyncPlayModalProps> = ({
  engine,
  isOpen,
  onClose,
  driftMs = 0,
  rttMs = 0,
}) => {
  const currentUserId = useAuthStore((s) => s.userId);
  const { data: currentUser } = useCurrentUser();
  const myName = currentUser?.displayName || currentUser?.username || 'You';
  const myAvatar = currentUser?.avatar || null;

  const callStore = useCallStore();
  const conversationId =
    callStore.conversationId ||
    callStore.activeCall?.conversationId ||
    callStore.callId ||
    'direct-call';

  // State: View mode (Media Hub vs Active Player)
  const [viewMode, setViewMode] = useState<'hub' | 'player'>('hub');
  const [isHubOverlayOpen, setIsHubOverlayOpen] = useState(false);

  // Global store sync
  const storeActiveMedia = useWatchTogetherStore((s) => s.activeMedia);
  const storeRoomQueue = useWatchTogetherStore((s) => s.roomQueue);
  const storeViewers = useWatchTogetherStore((s) => s.activeViewers);
  const setActiveMediaInStore = useWatchTogetherStore((s) => s.setActiveMedia);
  const setRoomQueueInStore = useWatchTogetherStore((s) => s.setRoomQueue);
  const addViewerInStore = useWatchTogetherStore((s) => s.addViewer);
  const removeViewerInStore = useWatchTogetherStore((s) => s.removeViewer);
  const setActiveViewersInStore = useWatchTogetherStore((s) => s.setActiveViewers);
  const setActiveActivityInStore = useWatchTogetherStore((s) => s.setActiveActivity);

  const [activeMedia, setActiveMedia] = useState<WatchTogetherVideoItem | null>(storeActiveMedia);

  // Keep activeMedia synchronized with store
  useEffect(() => {
    if (storeActiveMedia && (!activeMedia || activeMedia.id !== storeActiveMedia.id)) {
      setActiveMedia(storeActiveMedia);
      setViewMode('player');
    }
  }, [storeActiveMedia, activeMedia]);

  // Hub tabs & categories
  const [activeTab, setActiveTab] = useState<HubTab>('youtube');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const queryClient = useQueryClient();

  // Recommendations query (Exploitation/Exploration 70/30, Hard-filtered against 30-day repeats)
  const { data: recommendationsData, isLoading: isRecsLoading } = useQuery({
    queryKey: ['watchtogether', 'recommendations'],
    queryFn: () => watchTogetherApi.getRecommendations(),
    staleTime: 60_000,
    enabled: isOpen && activeTab === 'youtube',
  });

  // Video feed state
  const [feedVideos, setFeedVideos] = useState<WatchTogetherVideoItem[]>([]);
  const [recentVideos, setRecentVideos] = useState<WatchTogetherVideoItem[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Direct Stream form state
  const [directUrlInput, setDirectUrlInput] = useState('');
  const [isResolvingDirectUrl, setIsResolvingDirectUrl] = useState(false);
  const [directUrlError, setDirectUrlError] = useState<string | null>(null);

  // Player controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [centerAnimation, setCenterAnimation] = useState<
    'play' | 'pause' | 'rewind' | 'forward' | null
  >(null);

  // Mutable refs to decouple callbacks & intervals from re-rendering loops
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const roomQueueRef = useRef(storeRoomQueue);
  roomQueueRef.current = storeRoomQueue;

  const activeMediaRef = useRef(activeMedia);
  activeMediaRef.current = activeMedia;

  const activeViewersRef = useRef(storeViewers);
  activeViewersRef.current = storeViewers;

  const recentVideosRef = useRef(recentVideos);
  recentVideosRef.current = recentVideos;

  // Watch-time engagement tracker (>= 30s or >= 30% of total duration)
  const accumulatedWatchTimeRef = useRef<number>(0);
  const hasReportedWatchRef = useRef<boolean>(false);
  const currentTrackingIdRef = useRef<string | null>(null);

  // Reset tracking state when media changes
  useEffect(() => {
    if (activeMedia?.id !== currentTrackingIdRef.current) {
      accumulatedWatchTimeRef.current = 0;
      hasReportedWatchRef.current = false;
      currentTrackingIdRef.current = activeMedia?.id || null;
    }
  }, [activeMedia?.id]);

  // Real watch-time ticker (records ONLY on real engagement >= 30s or >= 30% duration)
  useEffect(() => {
    if (!isOpen || viewMode !== 'player' || !isPlaying || !activeMedia) return;

    const interval = setInterval(() => {
      accumulatedWatchTimeRef.current += 1;
      const watched = accumulatedWatchTimeRef.current;
      const dur = duration || activeMedia.durationSec || 0;

      // Threshold: record ONLY if user watched >= 30 seconds OR >= 30% of total duration
      const isThresholdMet = watched >= 30 || (dur > 0 && watched / dur >= 0.3);

      if (isThresholdMet && !hasReportedWatchRef.current) {
        hasReportedWatchRef.current = true;
        void watchTogetherApi
          .recordWatchTime({
            videoId: activeMedia.id,
            title: activeMedia.title,
            channelTitle: activeMedia.channelTitle,
            durationSec: dur,
            watchedSec: watched,
            completedRatio: dur > 0 ? watched / dur : 0,
            thumbnailUrl: activeMedia.thumbnailUrl,
            source: activeMedia.source,
          })
          .then(() => {
            void queryClient.invalidateQueries({ queryKey: ['watchtogether', 'recommendations'] });
          })
          .catch(() => {});
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, viewMode, isPlaying, activeMedia, duration, queryClient]);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const ytMountRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const isHostRef = useRef<boolean>(false);
  const handlePlayNextInQueueRef = useRef<() => void>(() => {});

  // Trigger transient center action animation
  const showCenterAction = useCallback((action: 'play' | 'pause' | 'rewind' | 'forward') => {
    setCenterAnimation(action);
    setTimeout(() => {
      setCenterAnimation((prev) => (prev === action ? null : prev));
    }, 600);
  }, []);

  // Debounce search query 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Persist recent videos
  const addRecentVideo = useCallback((item: WatchTogetherVideoItem) => {
    setRecentVideos((prev) => {
      const filtered = prev.filter((v) => v.id !== item.id);
      const updated = [item, ...filtered].slice(0, 15);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // Fetch YouTube feed (trending / categories / search)
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    setIsLoading(true);
    setErrorMessage(null);

    const loadContent = async () => {
      try {
        if (debouncedQuery) {
          const res = await watchTogetherApi.search(debouncedQuery);
          if (isSubscribed) {
            setFeedVideos(res.items || []);
          }
        } else {
          if (activeCategory === 'trending') {
            const items = await watchTogetherApi.getTrending('US');
            if (isSubscribed) setFeedVideos(items);
          } else if (activeCategory === 'music') {
            const res = await watchTogetherApi.search('official music video hits');
            if (isSubscribed) setFeedVideos(res.items || []);
          } else if (activeCategory === 'gaming') {
            const res = await watchTogetherApi.search('popular games live gameplay');
            if (isSubscribed) setFeedVideos(res.items || []);
          } else if (activeCategory === 'continue') {
            if (isSubscribed) setFeedVideos(recentVideosRef.current);
          }
        }
      } catch (err: any) {
        if (isSubscribed) {
          setErrorMessage(
            err?.response?.data?.message || 'Failed to load videos. Please try again.',
          );
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    void loadContent();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, debouncedQuery, activeCategory]);

  // Sync actions through Socket & RTCDataChannel (Stable callback using refs)
  const broadcastSyncAction = useCallback(
    (
      action: string,
      extra: {
        timestamp?: number;
        state?: 'playing' | 'paused';
        media?: WatchTogetherVideoItem;
        queue?: WatchTogetherVideoItem[];
        initiator?: { id: string; name: string; avatar?: string | null };
        viewer?: WatchTogetherViewer;
        viewers?: WatchTogetherViewer[];
        userId?: string;
      } = {},
    ) => {
      const socket = getSocket();
      socket?.emit('watchtogether:sync', {
        conversationId,
        action,
        timestamp: extra.timestamp ?? currentTimeRef.current,
        state: extra.state ?? (isPlayingRef.current ? 'playing' : 'paused'),
        media: extra.media,
        queue: extra.queue ?? roomQueueRef.current,
        initiator: extra.initiator,
        viewer: extra.viewer,
        viewers: extra.viewers,
        userId: extra.userId,
      });

      // Also mirror to WebRTC DataChannel engine
      if (action === 'play') engine?.notifyPlay();
      else if (action === 'pause') engine?.notifyPause();
      else if (action === 'seek' && typeof extra.timestamp === 'number') {
        engine?.notifySeek(extra.timestamp);
      } else if (action === 'change_media' && extra.media) {
        engine?.notifySourceChange(extra.media.url, extra.media.title);
      }
    },
    [conversationId, engine],
  );

  // Play a video for everyone (Stable callback)
  const handlePlayMedia = useCallback(
    (item: WatchTogetherVideoItem, startSec = 0) => {
      isHostRef.current = true;
      setActiveMedia(item);
      setActiveMediaInStore(item);
      addRecentVideo(item);
      setViewMode('player');
      setIsHubOverlayOpen(false);
      setIsPlaying(true);
      setCurrentTime(startSec);
      pendingSeekRef.current = startSec;

      // Broadcast activity invitation to other participants in this chat/call
      broadcastSyncAction('activity_start', {
        media: item,
        timestamp: startSec,
        state: 'playing',
        initiator: {
          id: currentUserId || 'me',
          name: myName,
          avatar: myAvatar,
        },
      });

      // Add self to viewers
      if (currentUserId) {
        const meViewer: WatchTogetherViewer = {
          id: currentUserId,
          name: myName,
          avatar: myAvatar,
        };
        addViewerInStore(meViewer);
        broadcastSyncAction('presence_join', { viewer: meViewer });
      }
    },
    [
      addRecentVideo,
      broadcastSyncAction,
      currentUserId,
      myName,
      myAvatar,
      setActiveMediaInStore,
      addViewerInStore,
    ],
  );

  // Play next from queue (Stable callback)
  const handlePlayNextInQueue = useCallback(() => {
    const currentQueue = roomQueueRef.current;
    if (currentQueue.length === 0) return;
    const next = currentQueue[0];
    const remaining = currentQueue.slice(1);
    setRoomQueueInStore(remaining);
    broadcastSyncAction('queue_update', { queue: remaining });
    handlePlayMedia(next, 0);
  }, [broadcastSyncAction, handlePlayMedia, setRoomQueueInStore]);

  handlePlayNextInQueueRef.current = handlePlayNextInQueue;

  // Add video to room queue
  const handleAddToQueue = useCallback(
    (item: WatchTogetherVideoItem) => {
      const currentQueue = roomQueueRef.current;
      if (currentQueue.some((q) => q.id === item.id)) return;
      const updated = [...currentQueue, item];
      setRoomQueueInStore(updated);
      broadcastSyncAction('queue_update', { queue: updated });
    },
    [broadcastSyncAction, setRoomQueueInStore],
  );

  // Remove video from queue
  const handleRemoveFromQueue = useCallback(
    (id: string) => {
      const updated = roomQueueRef.current.filter((item) => item.id !== id);
      setRoomQueueInStore(updated);
      broadcastSyncAction('queue_update', { queue: updated });
    },
    [broadcastSyncAction, setRoomQueueInStore],
  );

  // Handle Play/Pause
  const handleTogglePlay = useCallback(() => {
    const nextState = !isPlayingRef.current;
    setIsPlaying(nextState);
    showCenterAction(nextState ? 'play' : 'pause');

    if (activeMediaRef.current?.source === 'youtube' && ytPlayerRef.current) {
      try {
        if (nextState) ytPlayerRef.current.playVideo();
        else ytPlayerRef.current.pauseVideo();
      } catch {
        // ignore
      }
    } else if (videoRef.current) {
      if (nextState) {
        void videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }

    broadcastSyncAction(nextState ? 'play' : 'pause', {
      timestamp: currentTimeRef.current,
      state: nextState ? 'playing' : 'paused',
    });
  }, [broadcastSyncAction, showCenterAction]);

  // Handle Seek
  const handleSeek = useCallback(
    (targetTime: number) => {
      setCurrentTime(targetTime);

      if (activeMediaRef.current?.source === 'youtube' && ytPlayerRef.current) {
        try {
          ytPlayerRef.current.seekTo(targetTime, true);
        } catch {
          // ignore
        }
      } else if (videoRef.current) {
        videoRef.current.currentTime = targetTime;
      }

      broadcastSyncAction('seek', {
        timestamp: targetTime,
        state: isPlayingRef.current ? 'playing' : 'paused',
      });
    },
    [broadcastSyncAction],
  );

  // Handle Skip 10s back/forward
  const handleSkipTime = useCallback(
    (delta: number) => {
      const cur = currentTimeRef.current;
      const nextTime = Math.max(0, Math.min(duration || 99999, cur + delta));
      showCenterAction(delta > 0 ? 'forward' : 'rewind');
      handleSeek(nextTime);
    },
    [duration, handleSeek, showCenterAction],
  );

  // Double click on left/right video areas
  const handleVideoAreaDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width * 0.35) {
      handleSkipTime(-10);
    } else if (clickX > rect.width * 0.65) {
      handleSkipTime(10);
    } else {
      handleTogglePlay();
    }
  };

  // Keyboard shortcuts (Space: play/pause, Left: -10s, Right: +10s, M: mute, F: fullscreen)
  useEffect(() => {
    if (!isOpen || viewMode !== 'player') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTagName = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      if (activeTagName === 'input' || activeTagName === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSkipTime(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkipTime(10);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, viewMode, handleTogglePlay, handleSkipTime]);

  // Handle Direct URL Resolve & Play
  const handleResolveDirectUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = directUrlInput.trim();
    if (!raw) return;

    if (!raw.startsWith('https://')) {
      setDirectUrlError('Only secure HTTPS protocol is allowed (https://)');
      return;
    }

    setIsResolvingDirectUrl(true);
    setDirectUrlError(null);

    try {
      const resolved = await watchTogetherApi.resolveUrl(raw);
      const mediaItem: WatchTogetherVideoItem = {
        id: resolved.id || raw,
        title: resolved.title || 'External Video Stream',
        channelTitle: resolved.channelTitle || 'Direct Link',
        thumbnailUrl:
          resolved.thumbnailUrl ||
          'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=640&q=80',
        duration: resolved.duration || 'STREAM',
        durationSec: resolved.durationSec || 0,
        source: resolved.type,
        url: resolved.url,
      };

      setDirectUrlInput('');
      handlePlayMedia(mediaItem);
    } catch (err: any) {
      setDirectUrlError(
        err?.response?.data?.message ||
          'Link is unavailable or does not contain a supported video stream (.mp4, .webm, .m3u8, YouTube, Twitch).',
      );
    } finally {
      setIsResolvingDirectUrl(false);
    }
  };

  // Announce presence on entering player mode and request current sync timing
  useEffect(() => {
    if (!isOpen || viewMode !== 'player') return;

    if (currentUserId) {
      const meViewer: WatchTogetherViewer = {
        id: currentUserId,
        name: myName,
        avatar: myAvatar,
      };
      addViewerInStore(meViewer);
      broadcastSyncAction('presence_join', { viewer: meViewer });
    }

    // Request active session timing from room peers
    broadcastSyncAction('request_sync');

    return () => {
      if (currentUserId) {
        removeViewerInStore(currentUserId);
        broadcastSyncAction('presence_leave', { userId: currentUserId });
      }
    };
  }, [
    isOpen,
    viewMode,
    currentUserId,
    myName,
    myAvatar,
    addViewerInStore,
    removeViewerInStore,
    broadcastSyncAction,
  ]);

  // Periodic heartbeat from the host to ensure second-for-second exact alignment
  useEffect(() => {
    if (!isOpen || viewMode !== 'player' || !isHostRef.current) return;

    const interval = setInterval(() => {
      broadcastSyncAction('sync_heartbeat', {
        timestamp: currentTimeRef.current,
        state: isPlayingRef.current ? 'playing' : 'paused',
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, viewMode, broadcastSyncAction]);

  // Socket listener for room synchronization, viewer presence, and second-for-second alignment
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleSyncEvent = (data: any) => {
      if (!data || data.senderUserId === currentUserId) return;

      // 1. Viewer presence
      if (data.action === 'presence_join' && data.viewer) {
        addViewerInStore(data.viewer);
        // Reply with current presence list and timing so joiner gets instant full state
        if (currentUserId) {
          socket.emit('watchtogether:sync', {
            conversationId,
            action: 'presence_sync',
            viewers: activeViewersRef.current,
            timestamp: currentTimeRef.current,
            state: isPlayingRef.current ? 'playing' : 'paused',
            media: activeMediaRef.current,
            queue: roomQueueRef.current,
          });
        }
        return;
      }

      if (data.action === 'presence_leave' && (data.userId || data.senderUserId)) {
        removeViewerInStore(data.userId || data.senderUserId);
        return;
      }

      if (data.action === 'presence_sync' && Array.isArray(data.viewers)) {
        data.viewers.forEach((v: WatchTogetherViewer) => addViewerInStore(v));
      }

      // 2. Sync request from newly joined peer
      if (data.action === 'request_sync') {
        if (activeMediaRef.current) {
          socket.emit('watchtogether:sync', {
            conversationId,
            action: 'sync_response',
            timestamp: currentTimeRef.current,
            state: isPlayingRef.current ? 'playing' : 'paused',
            media: activeMediaRef.current,
            queue: roomQueueRef.current,
            viewers: activeViewersRef.current,
          });
        }
        return;
      }

      // 3. Sync response applied to joining peer
      if (data.action === 'sync_response' && data.media) {
        setActiveMedia(data.media);
        setActiveMediaInStore(data.media);
        setViewMode('player');
        setIsHubOverlayOpen(false);
        if (Array.isArray(data.queue)) {
          setRoomQueueInStore(data.queue);
        }
        if (typeof data.timestamp === 'number') {
          pendingSeekRef.current = data.timestamp;
          setCurrentTime(data.timestamp);
          if (activeMediaRef.current?.source === 'youtube' && ytPlayerRef.current) {
            try {
              ytPlayerRef.current.seekTo(data.timestamp, true);
            } catch {
              // ignore
            }
          } else if (videoRef.current) {
            videoRef.current.currentTime = data.timestamp;
          }
        }
        if (data.state === 'playing') {
          setIsPlaying(true);
          if (activeMediaRef.current?.source === 'youtube' && ytPlayerRef.current) {
            try {
              ytPlayerRef.current.playVideo();
            } catch {
              // ignore
            }
          } else if (videoRef.current) {
            void videoRef.current.play().catch(() => {});
          }
        }
        return;
      }

      // 4. Change media or Activity start
      if ((data.action === 'change_media' || data.action === 'activity_start') && data.media) {
        setActiveMedia(data.media);
        setActiveMediaInStore(data.media);
        addRecentVideo(data.media);
        setViewMode('player');
        setIsHubOverlayOpen(false);
        setIsPlaying(data.state !== 'paused');
        if (typeof data.timestamp === 'number') {
          pendingSeekRef.current = data.timestamp;
          setCurrentTime(data.timestamp);
        }
        return;
      }

      // 5. Queue updates
      if (data.action === 'queue_update' && data.queue) {
        setRoomQueueInStore(data.queue);
        return;
      }

      // 6. Real-time Seek, Play, Pause, and Heartbeat sync
      const remoteTime = typeof data.timestamp === 'number' ? data.timestamp : null;
      let localCur = currentTimeRef.current;
      if (activeMediaRef.current?.source === 'youtube' && ytPlayerRef.current) {
        try {
          localCur = ytPlayerRef.current.getCurrentTime() || localCur;
        } catch {
          // ignore
        }
      } else if (videoRef.current) {
        localCur = videoRef.current.currentTime || localCur;
      }

      // Precise timing: if remote action is explicit seek or drift > 1.0s, sync exact second
      const delta = remoteTime !== null ? Math.abs(localCur - remoteTime) : 0;
      const isExplicitSeek = data.action === 'seek';
      const shouldSeek = remoteTime !== null && (isExplicitSeek || delta > 1.0);

      if (data.action === 'seek' || data.action === 'sync_heartbeat') {
        if (shouldSeek && remoteTime !== null) {
          if (activeMediaRef.current?.source === 'youtube' && ytPlayerRef.current) {
            try {
              ytPlayerRef.current.seekTo(remoteTime, true);
            } catch {
              // ignore
            }
          } else if (videoRef.current) {
            videoRef.current.currentTime = remoteTime;
          }
          setCurrentTime(remoteTime);
        }
        if (data.state === 'playing') {
          setIsPlaying(true);
          if (activeMediaRef.current?.source === 'youtube' && ytPlayerRef.current) {
            try {
              ytPlayerRef.current.playVideo();
            } catch {
              // ignore
            }
          } else if (videoRef.current) {
            void videoRef.current.play().catch(() => {});
          }
        } else if (data.state === 'paused') {
          setIsPlaying(false);
          if (activeMediaRef.current?.source === 'youtube' && ytPlayerRef.current) {
            try {
              ytPlayerRef.current.pauseVideo();
            } catch {
              // ignore
            }
          } else if (videoRef.current) {
            videoRef.current.pause();
          }
        }
      } else if (data.action === 'play') {
        if (shouldSeek && remoteTime !== null) {
          if (activeMediaRef.current?.source === 'youtube' && ytPlayerRef.current) {
            try {
              ytPlayerRef.current.seekTo(remoteTime, true);
            } catch {
              // ignore
            }
          } else if (videoRef.current) {
            videoRef.current.currentTime = remoteTime;
          }
          setCurrentTime(remoteTime);
        }
        setIsPlaying(true);
        if (activeMediaRef.current?.source === 'youtube' && ytPlayerRef.current) {
          try {
            ytPlayerRef.current.playVideo();
          } catch {
            // ignore
          }
        } else if (videoRef.current) {
          void videoRef.current.play().catch(() => {});
        }
      } else if (data.action === 'pause') {
        if (shouldSeek && remoteTime !== null) {
          if (activeMediaRef.current?.source === 'youtube' && ytPlayerRef.current) {
            try {
              ytPlayerRef.current.seekTo(remoteTime, true);
            } catch {
              // ignore
            }
          } else if (videoRef.current) {
            videoRef.current.currentTime = remoteTime;
          }
          setCurrentTime(remoteTime);
        }
        setIsPlaying(false);
        if (activeMediaRef.current?.source === 'youtube' && ytPlayerRef.current) {
          try {
            ytPlayerRef.current.pauseVideo();
          } catch {
            // ignore
          }
        } else if (videoRef.current) {
          videoRef.current.pause();
        }
      }
    };

    socket.on('watchtogether:sync', handleSyncEvent);
    return () => {
      socket.off('watchtogether:sync', handleSyncEvent);
    };
  }, [
    currentUserId,
    conversationId,
    addRecentVideo,
    addViewerInStore,
    removeViewerInStore,
    setActiveMediaInStore,
    setRoomQueueInStore,
  ]);

  // YouTube IFrame API initialization with controls: 0 (No duplicate scrubber or volume)
  useEffect(() => {
    if (!isOpen || viewMode !== 'player' || activeMedia?.source !== 'youtube') {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore
        }
        ytPlayerRef.current = null;
      }
      return;
    }

    const currentVideoId = activeMedia.id;

    // If player is already initialized and video ID changed, simply load the new video without tearing down!
    if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
      try {
        ytPlayerRef.current.loadVideoById({
          videoId: currentVideoId,
          startSeconds: pendingSeekRef.current || 0,
        });
        pendingSeekRef.current = null;
        return;
      } catch {
        // Fallback to recreating if loadVideoById failed
      }
    }

    let isDisposed = false;
    let timeTicker: ReturnType<typeof setInterval> | null = null;

    void ensureYouTubeIframeApi().then(() => {
      if (isDisposed) return;

      const mountContainer = ytMountRef.current;
      if (!mountContainer) return;

      // Clean up previous instance cleanly
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore
        }
        ytPlayerRef.current = null;
      }

      mountContainer.innerHTML = '';
      const iframeHolder = document.createElement('div');
      iframeHolder.style.width = '100%';
      iframeHolder.style.height = '100%';
      mountContainer.appendChild(iframeHolder);

      // controls: 0 eliminates duplicate native YouTube scrubbers and volume sliders!
      ytPlayerRef.current = new window.YT!.Player(iframeHolder, {
        videoId: currentVideoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          disablekb: 1,
          iv_load_policy: 3,
          fs: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            if (isDisposed) return;
            const player = event.target;
            player.setVolume(volume * 100);
            if (isMuted) player.mute();

            if (pendingSeekRef.current && pendingSeekRef.current > 0) {
              player.seekTo(pendingSeekRef.current, true);
              pendingSeekRef.current = null;
            }
            player.playVideo();
            setIsPlaying(true);
          },
          onStateChange: (event: any) => {
            if (isDisposed) return;
            // 1: PLAYING, 2: PAUSED, 0: ENDED
            if (event.data === 1) {
              setIsPlaying(true);
            } else if (event.data === 2) {
              setIsPlaying(false);
            } else if (event.data === 0) {
              setIsPlaying(false);
              handlePlayNextInQueueRef.current();
            }
          },
        },
      });

      // Time tracking ticker (500ms smooth updates)
      timeTicker = setInterval(() => {
        if (isDisposed || !ytPlayerRef.current) return;
        try {
          if (typeof ytPlayerRef.current.getCurrentTime === 'function') {
            const cur = ytPlayerRef.current.getCurrentTime() || 0;
            const dur = ytPlayerRef.current.getDuration() || 0;
            setCurrentTime(cur);
            if (dur > 0) setDuration(dur);
          }
        } catch {
          // ignore
        }
      }, 500);
    });

    return () => {
      isDisposed = true;
      if (timeTicker) clearInterval(timeTicker);
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore
        }
        ytPlayerRef.current = null;
      }
    };
  }, [isOpen, viewMode, activeMedia?.id, activeMedia?.source]);

  // HTML5 Video & HLS lifecycle for direct streams
  useEffect(() => {
    if (!isOpen || viewMode !== 'player' || activeMedia?.source === 'youtube') {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    if (!video || !activeMedia?.url) return;

    if (engine) {
      engine.attachVideo(video);
    }

    const sanitizedUrl = sanitizeMediaUrl(activeMedia.url);
    if (!sanitizedUrl) return;

    if (sanitizedUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(sanitizedUrl);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (pendingSeekRef.current && pendingSeekRef.current > 0) {
            video.currentTime = pendingSeekRef.current;
            pendingSeekRef.current = null;
          }
          void video.play().catch(() => {});
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = sanitizedUrl;
        void video.play().catch(() => {});
      }
    } else {
      video.src = sanitizedUrl;
      if (pendingSeekRef.current && pendingSeekRef.current > 0) {
        video.currentTime = pendingSeekRef.current;
        pendingSeekRef.current = null;
      }
      void video.play().catch(() => {});
    }

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => setDuration(video.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      handlePlayNextInQueueRef.current();
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('ended', onEnded);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (engine) {
        engine.detachVideo();
      }
    };
  }, [isOpen, viewMode, activeMedia?.url, activeMedia?.source, engine]);

  // Volume & Mute synchronizer
  useEffect(() => {
    if (activeMedia?.source === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume(isMuted ? 0 : volume * 100);
        if (isMuted) ytPlayerRef.current.mute();
        else ytPlayerRef.current.unMute();
      } catch {
        // ignore
      }
    } else if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted, activeMedia]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    const el = playerContainerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      void el.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      void document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isHubOverlayOpen) {
          setIsHubOverlayOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isHubOverlayOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Watch Together"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
    >
      <div
        ref={playerContainerRef}
        className="relative w-full max-w-5xl h-[88vh] bg-neutral-950/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl"
      >
        {/* ========================================================= */}
        {/* TOP BAR: Always visible for intuitive navigation & status */}
        {/* ========================================================= */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-neutral-900/60 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)]">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-tight">Watch Together</h3>
              </div>
              <p className="text-xs text-neutral-400 truncate max-w-xs sm:max-w-md">
                {viewMode === 'player' && activeMedia ? activeMedia.title : 'Room Media Hub'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Viewers Avatar Stack ("Who is watching this video right now") */}
            {viewMode === 'player' && (
              <div
                title="Watch Together participants"
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">{storeViewers.length || 1} watching</span>
                </span>
                <div className="flex items-center -space-x-2">
                  {storeViewers.slice(0, 4).map((viewer) => (
                    <Avatar
                      key={viewer.id}
                      src={viewer.avatar}
                      name={viewer.name}
                      size="xs"
                      suppressDecoration={true}
                      className="ring-2 ring-neutral-950 border border-white/10"
                    />
                  ))}
                  {storeViewers.length > 4 && (
                    <span className="w-6 h-6 rounded-full bg-neutral-800 text-[10px] text-neutral-300 font-bold flex items-center justify-center border-2 border-neutral-950">
                      +{storeViewers.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* If in active player, show floating button to open Media Hub overlay */}
            {viewMode === 'player' && (
              <>
                <button
                  type="button"
                  onClick={() => setIsHubOverlayOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all border ${
                    isHubOverlayOpen
                      ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                      : 'bg-neutral-800/90 hover:bg-neutral-700/90 text-neutral-200 border-white/10 hover:border-white/20'
                  }`}
                >
                  <FolderSearch className="w-3.5 h-3.5 text-purple-300" />
                  <span className="hidden sm:inline">Catalog / Queue</span>
                  <span className="sm:hidden">Hub</span>
                  {storeRoomQueue.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-purple-500/30 text-purple-200 rounded-full text-[10px] font-bold">
                      {storeRoomQueue.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode('hub');
                    setIsHubOverlayOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-neutral-800/60 hover:bg-neutral-700 text-neutral-300 transition-colors border border-white/5"
                >
                  Back to Hub
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Watch Together"
              className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* VIEW 1: ACTIVE PLAYER VIEW (Clean single control bar)     */}
        {/* ========================================================= */}
        {viewMode === 'player' && activeMedia && (
          <div className="relative flex-1 bg-black flex flex-col overflow-hidden">
            {/* Video container with single-click and double-click actions */}
            <div
              className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden select-none cursor-pointer"
              onClick={handleVideoAreaDoubleClick}
            >
              {activeMedia.source === 'youtube' ? (
                <div className="w-full h-full flex items-center justify-center pointer-events-none">
                  <div ref={ytMountRef} className="w-full h-full min-h-[300px]" />
                </div>
              ) : activeMedia.source === 'twitch' ? (
                <iframe
                  title="Twitch Player"
                  src={`https://player.twitch.tv/?channel=${activeMedia.id}&parent=${window.location.hostname}&autoplay=true`}
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  className="w-full h-full border-0"
                />
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  className="w-full h-full object-contain pointer-events-none"
                />
              )}

              {/* Transient Center Play/Pause/Rewind/Forward Indicator */}
              {centerAnimation && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in fade-in zoom-in-75 duration-150">
                  <div className="p-5 rounded-full bg-black/75 border border-white/20 text-white backdrop-blur-md shadow-2xl">
                    {centerAnimation === 'play' && <Play className="w-10 h-10 fill-current ml-1" />}
                    {centerAnimation === 'pause' && <Pause className="w-10 h-10 fill-current" />}
                    {centerAnimation === 'rewind' && (
                      <div className="flex flex-col items-center">
                        <RotateCcw className="w-8 h-8" />
                        <span className="text-[10px] font-bold mt-1">-10s</span>
                      </div>
                    )}
                    {centerAnimation === 'forward' && (
                      <div className="flex flex-col items-center">
                        <RotateCw className="w-8 h-8" />
                        <span className="text-[10px] font-bold mt-1">+10s</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Sleek Glassmorphic Controls Bar (THE ONLY CONTROLS BAR) */}
            <div className="px-4 sm:px-6 py-3 bg-neutral-950/95 border-t border-white/10 flex flex-col gap-2 shrink-0 select-none backdrop-blur-md z-10">
              {/* Scrub line with time badges */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-neutral-400 w-12 text-right">
                  {formatTime(currentTime)}
                </span>
                <div className="relative flex-1 flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    aria-label="Seek video"
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500 transition-all hover:h-2"
                  />
                </div>
                <span className="text-xs font-mono text-neutral-400 w-12">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Bottom controls row */}
              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => handleSkipTime(-10)}
                    aria-label="Back 10 seconds"
                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] transition-transform transform active:scale-95"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSkipTime(10)}
                    aria-label="Forward 10 seconds"
                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  {storeRoomQueue.length > 0 && (
                    <button
                      type="button"
                      onClick={handlePlayNextInQueue}
                      aria-label="Next video in queue"
                      title={`Up next: ${storeRoomQueue[0].title}`}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors border border-white/5"
                    >
                      <SkipForward className="w-3.5 h-3.5 text-purple-400" />
                      <span className="hidden md:inline">
                        Next: {storeRoomQueue[0].title.slice(0, 16)}...
                      </span>
                    </button>
                  )}

                  {/* Volume Slider */}
                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      type="button"
                      onClick={() => setIsMuted((prev) => !prev)}
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                      className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVolume(val);
                        setIsMuted(val === 0);
                      }}
                      aria-label="Volume"
                      className="w-16 sm:w-24 h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-400 font-medium px-2 py-1 rounded-md bg-white/5 hidden sm:inline">
                    {activeMedia.channelTitle}
                  </span>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label="Full screen"
                    className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-4 h-4" />
                    ) : (
                      <Maximize className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: MEDIA HUB (Discovery View / Lobby / Drawer overlay)*/}
        {/* ========================================================= */}
        {(viewMode === 'hub' || isHubOverlayOpen) && (
          <div
            className={`flex-1 flex flex-col overflow-hidden bg-neutral-950/95 transition-all ${
              viewMode === 'player'
                ? 'absolute inset-0 top-[57px] z-20 backdrop-blur-2xl bg-neutral-950/90 animate-in fade-in duration-150'
                : ''
            }`}
          >
            {/* Discovery Header: Tabs & Search */}
            <div className="px-4 sm:px-6 py-3.5 bg-neutral-900/40 border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              {/* Source Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5 w-fit">
                <button
                  type="button"
                  onClick={() => setActiveTab('youtube')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'youtube'
                      ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <YoutubeIcon className="w-3.5 h-3.5 text-red-400" />
                  YouTube
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('direct')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'direct'
                      ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                  Direct Link / Stream
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('queue')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'queue'
                      ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <ListMusic className="w-3.5 h-3.5 text-amber-400" />
                  Room Queue
                  {storeRoomQueue.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded-full text-[10px]">
                      {storeRoomQueue.length}
                    </span>
                  )}
                </button>
              </div>

              {/* YouTube Search Bar (Visible when on YouTube tab) */}
              {activeTab === 'youtube' && (
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search YouTube videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              {/* TAB 1: YOUTUBE DISCOVERY */}
              {activeTab === 'youtube' && (
                <div className="space-y-5">
                  {/* Category Pills (when not actively searching) */}
                  {!debouncedQuery && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {[
                        { id: 'all', label: 'Recommendations', icon: Sparkles },
                        { id: 'continue', label: 'Continue Watching', icon: Clock },
                        { id: 'trending', label: 'Trending', icon: Flame },
                        { id: 'music', label: 'Music', icon: Music2 },
                        { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
                      ].map((cat) => {
                        const Icon = cat.icon;
                        const isSelected = activeCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setActiveCategory(cat.id as CategoryType)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                              isSelected
                                ? 'bg-purple-600/30 text-purple-200 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                                : 'bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border-white/5'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Error Alert */}
                  {errorMessage && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* 1. VIEW A: ALL RECOMMENDATIONS RAILS (Horizontal thematic sections) */}
                  {!debouncedQuery && activeCategory === 'all' && (
                    <div className="space-y-8">
                      {isRecsLoading && !recommendationsData && (
                        <div className="space-y-6">
                          {[...Array(3)].map((_, rIdx) => (
                            <div key={rIdx} className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-xl bg-neutral-800 animate-pulse" />
                                <div className="h-4 bg-neutral-800 rounded w-48 animate-pulse" />
                              </div>
                              <div className="flex gap-4 overflow-hidden">
                                {[...Array(4)].map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-64 shrink-0 aspect-video bg-neutral-900/60 rounded-2xl animate-pulse"
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {recommendationsData?.rails && recommendationsData.rails.length > 0 && (
                        <div className="space-y-8">
                          {recommendationsData.rails.map((rail) => (
                            <WatchTogetherRail
                              key={rail.id}
                              id={rail.id}
                              title={rail.title}
                              subtitle={rail.subtitle}
                              icon={rail.icon}
                              items={rail.items}
                              onPlay={handlePlayMedia}
                              onAddToQueue={handleAddToQueue}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. VIEW B: SEARCH RESULTS GRID OR SPECIFIC CATEGORY GRID */}
                  {(debouncedQuery || activeCategory !== 'all') && (
                    <>
                      {/* Skeletons while loading */}
                      {isLoading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              className="animate-pulse bg-neutral-900/60 rounded-xl overflow-hidden border border-white/5"
                            >
                              <div className="aspect-video bg-neutral-800/80" />
                              <div className="p-3 space-y-2">
                                <div className="h-3.5 bg-neutral-800 rounded w-4/5" />
                                <div className="h-3 bg-neutral-800/60 rounded w-2/5" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Video Grid */}
                      {!isLoading && feedVideos.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {feedVideos.map((video) => (
                            <div
                              key={video.id}
                              className="group bg-neutral-900/40 hover:bg-neutral-900/90 rounded-xl overflow-hidden border border-white/5 hover:border-purple-500/30 transition-all shadow-sm hover:shadow-xl flex flex-col"
                            >
                              {/* Thumbnail */}
                              <div className="relative aspect-video bg-neutral-950 overflow-hidden">
                                <img
                                  src={video.thumbnailUrl}
                                  alt={video.title}
                                  loading="lazy"
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                {/* Duration Badge */}
                                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono font-medium text-white backdrop-blur-sm border border-white/10">
                                  {video.duration}
                                </span>
                              </div>

                              {/* Info & Actions */}
                              <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                                <div>
                                  <h4
                                    title={video.title}
                                    className="text-xs font-semibold text-white line-clamp-2 group-hover:text-purple-300 transition-colors"
                                  >
                                    {video.title}
                                  </h4>
                                  <p className="text-[11px] text-neutral-400 mt-1 truncate">
                                    {video.channelTitle}
                                  </p>
                                </div>

                                {/* Buttons */}
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handlePlayMedia(video)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition-colors shadow-[0_0_10px_rgba(168,85,247,0.25)]"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    Play
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleAddToQueue(video)}
                                    title="Add to room queue"
                                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors border border-white/5"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Empty State */}
                      {!isLoading && feedVideos.length === 0 && (
                        <div className="text-center py-16 space-y-3">
                          <div className="inline-flex p-3 rounded-2xl bg-neutral-900 text-neutral-500">
                            <YoutubeIcon className="w-8 h-8" />
                          </div>
                          <p className="text-sm text-neutral-400">No videos found</p>
                          <p className="text-xs text-neutral-500">
                            Try changing your search query or choose another category
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: DIRECT LINK / STREAM */}
              {activeTab === 'direct' && (
                <div className="max-w-xl mx-auto py-8 space-y-6">
                  <div className="text-center space-y-1.5">
                    <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-1">
                      <Link2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-semibold text-white">
                      Direct Video Stream or Broadcast
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Paste a direct link to a video or supported platform
                    </p>
                  </div>

                  <form onSubmit={handleResolveDirectUrl} className="space-y-4">
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://example.com/video.mp4 or .m3u8, Twitch..."
                        value={directUrlInput}
                        onChange={(e) => setDirectUrlInput(e.target.value)}
                        className="w-full bg-neutral-900/90 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>

                    {directUrlError && (
                      <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>{directUrlError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span>SSRF Protected & HTTPS Only</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[10px]">
                          .mp4
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[10px]">
                          .webm
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[10px]">
                          .m3u8 (HLS)
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[10px]">
                          Twitch
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isResolvingDirectUrl || !directUrlInput.trim()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                    >
                      {isResolvingDirectUrl ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Checking and resolving stream...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          Verify and launch for everyone
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 3: ROOM QUEUE */}
              {activeTab === 'queue' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Room Playback Queue</h4>
                      <p className="text-xs text-neutral-400">
                        Videos will automatically play in order for all participants
                      </p>
                    </div>
                    {storeRoomQueue.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setRoomQueueInStore([]);
                          broadcastSyncAction('queue_update', { queue: [] });
                        }}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Clear queue
                      </button>
                    )}
                  </div>

                  {storeRoomQueue.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                      <div className="inline-flex p-3 rounded-2xl bg-neutral-900 text-neutral-500">
                        <ListMusic className="w-8 h-8" />
                      </div>
                      <p className="text-sm text-neutral-400">Room queue is empty</p>
                      <p className="text-xs text-neutral-500">
                        Add videos from YouTube search or via link using the "+" button
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('youtube')}
                        className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
                      >
                        Go to search
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {storeRoomQueue.map((item, index) => (
                        <div
                          key={`${item.id}-${index}`}
                          className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/60 border border-white/5 hover:border-white/15 transition-colors gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-mono font-medium text-neutral-500 w-5">
                              #{index + 1}
                            </span>
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="w-16 h-10 object-cover rounded-lg shrink-0 bg-neutral-950"
                            />
                            <div className="min-w-0">
                              <h5 className="text-xs font-medium text-white truncate max-w-sm">
                                {item.title}
                              </h5>
                              <p className="text-[11px] text-neutral-400 truncate">
                                {item.channelTitle} • {item.duration}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const remaining = storeRoomQueue.filter((_, i) => i !== index);
                                setRoomQueueInStore(remaining);
                                broadcastSyncAction('queue_update', { queue: remaining });
                                handlePlayMedia(item, 0);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Play
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromQueue(item.id)}
                              aria-label="Remove from queue"
                              className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
