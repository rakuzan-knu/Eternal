import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Link2,
  Users,
  ChevronRight,
  Play,
  Pause,
  Music,
  Film,
  Sparkles,
  ListMusic,
} from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import { Nameplate } from '@/shared/ui/Nameplate';
import Avatar from '@/shared/ui/Avatar';
import GroupAvatarCollage from '@/shared/ui/GroupAvatarCollage';
import OnlineStatusIndicator from '@/shared/ui/OnlineStatusIndicator';
import { VerifiedCheckmark } from '@/entities/profile/ui/VerifiedCheckmark';
import { chatApi } from '@/features/chat/api/chatApi';
import type { ConversationView, GlobalSearchResult } from '../../../entities/chat/model/types';
import { useConversations } from '../model/useConversations';
import { getConversationDisplay } from '../lib/getConversationDisplay';
import { formatMessageTime } from '../lib/groupMessagesByDate';
import { getRecentVisitedChatIds, recordRecentVisitedChat } from '../lib/recentVisitedChats';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { useMusicHubStore, CATALOG_PLAYLISTS } from '@/features/music/model/useMusicHubStore';
import type { MusicPlaylist } from '@/features/music/model/types';
import { useSpotifyPlayerStore, type SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';
import { isSameTrackId } from '@/shared/lib/spotifyUrl';
import { isSoundCloudUrl } from '@/shared/lib/urlSecurity';
import { isMusicActivity, isGamingActivity } from '@/shared/ui/activityIcons';
import { DiscordGamepadIcon, SpotifyBrandIcon, SoundCloudBrandIcon } from '@/shared/ui/BrandIcons';
import { integrationsApi } from '@/shared/api/integrationsApi';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation?: (conversationId: string, messageId?: string) => void;
  onStartDirectChat?: (userId: string) => void;
  initialConversationId?: string;
}

export type SearchTab = 'all' | 'messages' | 'media' | 'music' | 'files' | 'links' | 'people';

export const SEARCH_TABS: Array<{
  id: SearchTab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: 'all', label: 'All', icon: Search },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'media', label: 'Media', icon: ImageIcon },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'files', label: 'Files', icon: FileText },
  { id: 'links', label: 'Links', icon: Link2 },
  { id: 'people', label: 'People', icon: Users },
];

function getConversationActivityTime(conversation: ConversationView): number {
  const activityAt =
    conversation.lastMessage?.createdAt ?? conversation.updatedAt ?? conversation.createdAt;
  const time = new Date(activityAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatSongDuration(ms?: number): string {
  if (!ms || isNaN(ms)) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function getTrackPlatform(track: SpotifyTrack): 'soundcloud' | 'spotify' {
  if (
    track.source === 'soundcloud' ||
    track.id.startsWith('sc-') ||
    track.id.startsWith('soundcloud-') ||
    isSoundCloudUrl(track.spotifyUrl) ||
    track.spotifyUrl?.includes('soundcloud.com')
  ) {
    return 'soundcloud';
  }
  return 'spotify';
}

function isStoryGradient(url?: string): boolean {
  if (!url) return false;
  return (
    url.startsWith('color:') ||
    url.startsWith('linear-gradient') ||
    url.startsWith('radial-gradient')
  );
}

function isVideoMedia(item: { url?: string; type?: string; mimeType?: string | null }): boolean {
  if (item.type === 'VIDEO') return true;
  if (item.mimeType && item.mimeType.startsWith('video/')) return true;
  return Boolean(item.url && /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(item.url));
}

const FALLBACK_CHAT_IMAGES = [
  {
    id: 'demo-img-1',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    fileName: 'Fluid_Geometry.png',
    senderName: 'Alice',
    conversationId: '',
    messageId: '',
    type: 'IMAGE',
    mimeType: 'image/jpeg',
  },
  {
    id: 'demo-img-2',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    fileName: 'Vibrant_Artwork.webp',
    senderName: 'Bob',
    conversationId: '',
    messageId: '',
    type: 'IMAGE',
    mimeType: 'image/webp',
  },
  {
    id: 'demo-img-3',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
    fileName: 'Landscape_Echo.jpg',
    senderName: 'Charlie',
    conversationId: '',
    messageId: '',
    type: 'IMAGE',
    mimeType: 'image/jpeg',
  },
];

export default function GlobalSearchModal({
  isOpen,
  onClose,
  onSelectConversation,
  onStartDirectChat,
  initialConversationId,
}: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.userId);
  const { data: conversations } = useConversations();
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);
  const userActivities = usePresenceStore((s) => s.userActivities);

  // Music Hub store
  const recentlyPlayed = useMusicHubStore((s) => s.recentlyPlayed);
  const history = useSpotifyPlayerStore((s) => s.history);
  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isPlaying = useSpotifyPlayerStore((s) => s.isPlaying);

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SearchTab>('all');
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [musicResults, setMusicResults] = useState<{
    tracks: SpotifyTrack[];
    playlists: MusicPlaylist[];
  }>({ tracks: [], playlists: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isMusicSearching, setIsMusicSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Recent chat media fetched from backend
  const [recentChatMedia, setRecentChatMedia] = useState<
    Array<{
      id: string;
      url: string;
      fileName: string | null;
      senderId?: string;
      senderName?: string;
      conversationId: string;
      messageId: string;
      type?: string;
      mimeType?: string | null;
    }>
  >([]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      // Fetch recent media attachments for default view (strictly visual media)
      chatApi
        .globalSearch('', 'media', undefined, 20, 0)
        .then((res) => {
          if (res?.media && Array.isArray(res.media)) {
            setRecentChatMedia(res.media);
          }
        })
        .catch(() => {});
    } else {
      setQuery('');
      setResults(null);
      setMusicResults({ tracks: [], playlists: [] });
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search for Chat and Music
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setMusicResults({ tracks: [], playlists: [] });
      setIsLoading(false);
      setIsMusicSearching(false);
      return;
    }

    setIsLoading(tab !== 'music');
    setIsMusicSearching(tab === 'all' || tab === 'music');

    const timeoutId = setTimeout(async () => {
      // 1. Search chat content (messages, media, people, files, links)
      if (tab !== 'music') {
        chatApi
          .globalSearch(trimmed, tab === 'all' ? 'all' : tab, initialConversationId, 30, 0)
          .then((res) => {
            startTransition(() => {
              setResults(res);
              setIsLoading(false);
            });
          })
          .catch(() => {
            setIsLoading(false);
          });
      } else {
        setResults(null);
        setIsLoading(false);
      }

      // 2. Search Music Hub catalog (SoundCloud & Spotify tracks + playlists)
      if (tab === 'all' || tab === 'music') {
        try {
          const trackLimit = tab === 'music' ? 24 : 6;
          const plLimit = tab === 'music' ? 12 : 4;

          const [scTracks, spTracks, scPls] = await Promise.all([
            typeof integrationsApi.searchSoundCloudCatalog === 'function'
              ? integrationsApi.searchSoundCloudCatalog(trimmed, trackLimit, 0).catch(() => [])
              : Promise.resolve([]),
            typeof integrationsApi.searchSpotifyCatalog === 'function'
              ? integrationsApi.searchSpotifyCatalog(trimmed, trackLimit, 0).catch(() => [])
              : Promise.resolve([]),
            typeof integrationsApi.searchSoundCloudPlaylists === 'function'
              ? integrationsApi.searchSoundCloudPlaylists(trimmed, plLimit, 0).catch(() => [])
              : Promise.resolve([]),
          ]);

          const combinedTracks: SpotifyTrack[] = [];
          const seenTrackIds = new Set<string>();

          if (Array.isArray(scTracks)) {
            for (const t of scTracks) {
              if (t?.id && !seenTrackIds.has(t.id)) {
                seenTrackIds.add(t.id);
                combinedTracks.push({
                  id: t.id,
                  title: t.title,
                  artist: t.artist,
                  album: t.album || t.title,
                  albumArt: t.albumArt,
                  durationMs: t.durationMs || 180000,
                  previewUrl: null,
                  spotifyUrl: t.spotifyUrl || 'https://soundcloud.com',
                  contextName: 'Global Search',
                  source: 'soundcloud',
                  streamUrl: t.streamUrl,
                });
              }
            }
          }

          if (Array.isArray(spTracks)) {
            for (const t of spTracks) {
              if (t?.id && !seenTrackIds.has(t.id)) {
                seenTrackIds.add(t.id);
                combinedTracks.push({
                  id: t.id,
                  title: t.title || t.name,
                  artist: t.artist,
                  album: t.album?.name || t.album || t.title || t.name,
                  albumArt: t.albumArt || t.album?.images?.[0]?.url || '',
                  durationMs: t.durationMs || t.duration_ms || 180000,
                  previewUrl: t.previewUrl || null,
                  spotifyUrl: t.spotifyUrl || `https://open.spotify.com/track/${t.id}`,
                  contextName: 'Global Search',
                  source: 'spotify',
                });
              }
            }
          }

          // Playlists: Match local and catalog playlists, plus SoundCloud playlists
          const combinedPlaylists: MusicPlaylist[] = [];
          const seenPlIds = new Set<string>();

          const { playlists: localPlaylists, catalogPlaylists } = useMusicHubStore.getState();
          const queryLower = trimmed.toLowerCase();
          const localMatches = [...(localPlaylists || []), ...(catalogPlaylists || [])].filter(
            (p) =>
              p.title?.toLowerCase().includes(queryLower) ||
              p.description?.toLowerCase().includes(queryLower) ||
              p.creator?.toLowerCase().includes(queryLower),
          );

          for (const pl of localMatches) {
            if (!seenPlIds.has(pl.id)) {
              seenPlIds.add(pl.id);
              combinedPlaylists.push(pl);
            }
          }

          if (Array.isArray(scPls)) {
            for (const p of scPls) {
              if (p?.id && !seenPlIds.has(p.id)) {
                seenPlIds.add(p.id);
                combinedPlaylists.push({
                  id: p.id,
                  title: p.title,
                  description: p.description,
                  coverUrl: p.coverUrl,
                  creator: p.creator || 'SoundCloud',
                  creatorUsername: p.creatorUsername,
                  creatorAvatar: p.creatorAvatar,
                  trackCount: p.trackCount || 0,
                  tracks: p.tracks || [],
                  createdAt: new Date().toISOString(),
                  source: 'soundcloud',
                });
              }
            }
          }

          setMusicResults({
            tracks: combinedTracks.slice(0, tab === 'music' ? 30 : 6),
            playlists: combinedPlaylists.slice(0, tab === 'music' ? 16 : 4),
          });
        } catch {
          setMusicResults({ tracks: [], playlists: [] });
        } finally {
          setIsMusicSearching(false);
        }
      } else {
        setMusicResults({ tracks: [], playlists: [] });
        setIsMusicSearching(false);
      }
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [query, tab, isOpen, initialConversationId]);

  // Navigate to conversation
  const handleSelectConversation = (conversationId: string, messageId?: string) => {
    recordRecentVisitedChat(conversationId);
    if (onSelectConversation) {
      onSelectConversation(conversationId, messageId);
    } else {
      navigate(`/messages/${conversationId}${messageId ? `?messageId=${messageId}` : ''}`);
    }
    onClose();
  };

  // Start direct chat
  const handleStartDirectChat = async (targetUserId: string) => {
    if (onStartDirectChat) {
      onStartDirectChat(targetUserId);
      onClose();
      return;
    }

    try {
      const conv = await chatApi.createDirectConversation(targetUserId);
      handleSelectConversation(conv.id);
    } catch {
      const existing = conversations?.find(
        (c) => c.type === 'DIRECT' && c.participants.some((p) => p.userId === targetUserId),
      );
      if (existing) {
        handleSelectConversation(existing.id);
      } else {
        navigate('/messages');
        onClose();
      }
    }
  };

  // Play track handler
  const handlePlayTrack = (track: SpotifyTrack) => {
    const store = useSpotifyPlayerStore.getState();
    if (store.currentTrack && isSameTrackId(store.currentTrack.id, track.id)) {
      store.togglePlay();
    } else {
      store.playTrack(track, undefined, 'Global Search');
    }
  };

  // Known chat contacts of current user (for prioritization)
  const knownUserIds = useMemo(() => {
    const set = new Set<string>();
    if (!conversations) return set;
    for (const conv of conversations) {
      for (const p of conv.participants) {
        if (p.userId && p.userId !== currentUserId) {
          set.add(p.userId);
        }
      }
    }
    return set;
  }, [conversations, currentUserId]);

  // Sort people with familiar chat contacts at the very top
  const sortedPeople = useMemo(() => {
    if (!results?.people) return [];
    return [...results.people].sort((a, b) => {
      const aKnown = knownUserIds.has(a.id) ? 1 : 0;
      const bKnown = knownUserIds.has(b.id) ? 1 : 0;
      if (aKnown !== bKnown) return bKnown - aKnown;
      return 0;
    });
  }, [results?.people, knownUserIds]);

  // 1. Calculate top 3 recent chats
  const recentChats = useMemo(() => {
    if (!conversations || conversations.length === 0) return [];
    const visitedIds = getRecentVisitedChatIds();
    const convMap = new Map(conversations.map((c) => [c.id, c]));

    const ordered: ConversationView[] = [];
    for (const id of visitedIds) {
      const c = convMap.get(id);
      if (c && !c.isArchived) {
        ordered.push(c);
        convMap.delete(id);
      }
    }

    // Fill remaining up to 3 ordered by most recent activity
    const remaining = Array.from(convMap.values())
      .filter((c) => !c.isArchived)
      .sort((a, b) => getConversationActivityTime(b) - getConversationActivityTime(a));

    return [...ordered, ...remaining].slice(0, 3);
  }, [conversations, isOpen]);

  // 2. Calculate recent visual media from chats (strictly photos/videos, no audio)
  const displayedImages = useMemo(() => {
    const visualMedia = recentChatMedia.filter((item) => {
      if (item.type === 'AUDIO' || item.mimeType?.startsWith('audio/')) return false;
      return true;
    });

    // Prioritize received media (senderId !== currentUserId)
    const received = visualMedia.filter((img) => img.senderId && img.senderId !== currentUserId);
    const chosen =
      received.length >= 3
        ? received.slice(0, 3)
        : [...received, ...visualMedia.filter((img) => !received.includes(img))].slice(0, 3);

    if (chosen.length >= 3) {
      return chosen.map((img) => ({
        id: img.id,
        url: img.url,
        fileName: img.fileName,
        senderName: img.senderName || 'Chat Member',
        conversationId: img.conversationId,
        messageId: img.messageId,
        type: img.type,
        mimeType: img.mimeType,
      }));
    }

    // Fill with distinct fallback images if fewer than 3
    const result = chosen.map((img) => ({
      id: img.id,
      url: img.url,
      fileName: img.fileName,
      senderName: img.senderName || 'Chat Member',
      conversationId: img.conversationId,
      messageId: img.messageId,
      type: img.type,
      mimeType: img.mimeType,
    }));

    for (const fallback of FALLBACK_CHAT_IMAGES) {
      if (result.length >= 3) break;
      result.push(fallback);
    }
    return result.slice(0, 3);
  }, [recentChatMedia, currentUserId]);

  // 3. Calculate recently played songs (SoundCloud & Spotify)
  const displayedTracks = useMemo<SpotifyTrack[]>(() => {
    const maxItems = tab === 'music' ? 8 : 3;
    const tracksList: SpotifyTrack[] = [];
    const seenIds = new Set<string>();

    // From recentlyPlayed in MusicHubStore
    for (const item of recentlyPlayed) {
      const isSc = item.id.startsWith('sc-') || item.id.startsWith('soundcloud-');
      const t =
        item.track ||
        (item.type === 'track'
          ? ({
              id: item.id,
              title: item.title,
              artist: item.artist || item.subtitle || 'Artist',
              album: item.title,
              albumArt: item.coverUrl || '',
              durationMs: 180000,
              previewUrl: null,
              spotifyUrl: isSc
                ? 'https://soundcloud.com'
                : `https://open.spotify.com/track/${item.id}`,
              source: isSc ? 'soundcloud' : 'spotify',
            } as SpotifyTrack)
          : null);

      if (t && !seenIds.has(t.id)) {
        seenIds.add(t.id);
        tracksList.push(t);
      }
      if (tracksList.length >= maxItems) break;
    }

    // If still need more, check SpotifyPlayerStore history
    if (tracksList.length < maxItems && Array.isArray(history)) {
      for (const t of history) {
        if (!seenIds.has(t.id)) {
          seenIds.add(t.id);
          tracksList.push(t);
        }
        if (tracksList.length >= maxItems) break;
      }
    }

    // If still need more, fill from curated catalog
    if (tracksList.length < maxItems) {
      const catalogTracks = CATALOG_PLAYLISTS[0]?.tracks ?? [];
      for (const t of catalogTracks) {
        if (!seenIds.has(t.id)) {
          seenIds.add(t.id);
          tracksList.push(t);
        }
        if (tracksList.length >= maxItems) break;
      }
    }

    return tracksList.slice(0, maxItems);
  }, [recentlyPlayed, history, tab]);

  const isSearching = isLoading || isMusicSearching;
  const totalResults =
    (results?.messages.length ?? 0) +
    (results?.media.length ?? 0) +
    (sortedPeople.length ?? 0) +
    (musicResults.tracks.length ?? 0) +
    (musicResults.playlists.length ?? 0);

  // Tab switching helper with directional animation
  const switchTab = useCallback(
    (direction: 'left' | 'right') => {
      const curIdx = SEARCH_TABS.findIndex((t) => t.id === tab);
      const newIdx =
        direction === 'left'
          ? (curIdx - 1 + SEARCH_TABS.length) % SEARCH_TABS.length
          : (curIdx + 1) % SEARCH_TABS.length;
      setSlideDirection(direction);
      setTab(SEARCH_TABS[newIdx].id);
      setSelectedIndex(0);
    },
    [tab],
  );

  const handleTabClick = useCallback(
    (targetTab: SearchTab) => {
      const oldIdx = SEARCH_TABS.findIndex((t) => t.id === tab);
      const newIdx = SEARCH_TABS.findIndex((t) => t.id === targetTab);
      setSlideDirection(newIdx >= oldIdx ? 'right' : 'left');
      setTab(targetTab);
      setSelectedIndex(0);
    },
    [tab],
  );

  // Flat list of all currently displayed navigable items
  const navigableItems = useMemo<
    Array<{
      id: string;
      onSelect: () => void;
    }>
  >(() => {
    const items: Array<{ id: string; onSelect: () => void }> = [];
    if (isSearching) return items;

    if (!query) {
      // 1. Recent chats
      if (tab === 'all' || tab === 'messages') {
        recentChats.forEach((conv) => {
          items.push({
            id: `recent-chat-${conv.id}`,
            onSelect: () => handleSelectConversation(conv.id),
          });
        });
      }

      // 2. Recent visual media
      if (tab === 'all' || tab === 'media') {
        displayedImages.forEach((img) => {
          if (img.conversationId) {
            items.push({
              id: `recent-media-${img.id}`,
              onSelect: () => handleSelectConversation(img.conversationId, img.messageId),
            });
          }
        });
      }

      // 3. Recently played songs
      if (tab === 'all' || tab === 'music') {
        displayedTracks.forEach((track) => {
          items.push({
            id: `recent-track-${track.id}`,
            onSelect: () => handlePlayTrack(track),
          });
        });
      }
    } else if (totalResults > 0) {
      // 1. People & Contacts
      if ((tab === 'all' || tab === 'people') && sortedPeople.length > 0) {
        sortedPeople.forEach((person) => {
          items.push({
            id: `person-${person.id}`,
            onSelect: () => handleStartDirectChat(person.id),
          });
        });
      }

      // 2. Messages
      if ((tab === 'all' || tab === 'messages') && (results?.messages.length ?? 0) > 0) {
        results!.messages.forEach((msg) => {
          items.push({
            id: `msg-${msg.id}`,
            onSelect: () => handleSelectConversation(msg.conversationId, msg.id),
          });
        });
      }

      // 3. Media (Photos / Videos)
      if ((tab === 'all' || tab === 'media') && (results?.media.length ?? 0) > 0) {
        results!.media.forEach((item) => {
          items.push({
            id: `media-${item.id}`,
            onSelect: () => handleSelectConversation(item.conversationId, item.messageId),
          });
        });
      }

      // 4. Music Tracks
      if ((tab === 'all' || tab === 'music') && musicResults.tracks.length > 0) {
        musicResults.tracks.forEach((track) => {
          items.push({
            id: `track-${track.id}`,
            onSelect: () => handlePlayTrack(track),
          });
        });
      }

      // 5. Music Playlists
      if ((tab === 'all' || tab === 'music') && musicResults.playlists.length > 0) {
        musicResults.playlists.forEach((pl) => {
          items.push({
            id: `playlist-${pl.id}`,
            onSelect: () => {
              useMusicHubStore.getState().setSelectedPlaylistId(pl.id);
              navigate(`/music/playlist/${encodeURIComponent(pl.id)}`);
              onClose();
            },
          });
        });
      }
    }

    return items;
  }, [
    isSearching,
    query,
    tab,
    totalResults,
    recentChats,
    displayedImages,
    displayedTracks,
    sortedPeople,
    results,
    musicResults,
    onClose,
    navigate,
  ]);

  const getItemIndex = useCallback(
    (id: string) => navigableItems.findIndex((item) => item.id === id),
    [navigableItems],
  );

  // Sync selected index when navigable items list updates
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (navigableItems.length === 0) return -1;
      if (prev >= 0 && prev < navigableItems.length) return prev;
      return 0;
    });
  }, [navigableItems]);

  // Smooth scroll active element into view
  useEffect(() => {
    if (selectedIndex >= 0 && navigableItems[selectedIndex] && resultsContainerRef.current) {
      const activeItem = navigableItems[selectedIndex];
      const container = resultsContainerRef.current;
      const selectedEl = container.querySelector<HTMLElement>(
        `[data-search-nav-id="${activeItem.id}"]`,
      );
      if (selectedEl) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elTop = selectedEl.offsetTop;
        const elBottom = elTop + selectedEl.offsetHeight;

        if (elTop < containerTop) {
          container.scrollTo({
            top: Math.max(0, elTop - 12),
            behavior: 'smooth',
          });
        } else if (elBottom > containerBottom) {
          container.scrollTo({
            top: elBottom - container.clientHeight + 12,
            behavior: 'smooth',
          });
        }
      }
    }
  }, [selectedIndex, navigableItems]);

  // Keyboard navigation: ArrowUp/ArrowDown for items, ArrowLeft/ArrowRight for tabs, Enter for activation
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return;

      // Tab cycling on ArrowLeft / ArrowRight
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const isInput = document.activeElement === inputRef.current;
        if (isInput && inputRef.current) {
          const input = inputRef.current;
          const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
          const atEnd =
            input.selectionStart === input.value.length &&
            input.selectionEnd === input.value.length;
          if (e.key === 'ArrowLeft' && !atStart && !e.altKey && query.length > 0) return;
          if (e.key === 'ArrowRight' && !atEnd && !e.altKey && query.length > 0) return;
        }

        e.preventDefault();
        e.stopPropagation();
        switchTab(e.key === 'ArrowLeft' ? 'left' : 'right');
        return;
      }

      // Navigate items via ArrowDown / ArrowUp
      if (e.key === 'ArrowDown') {
        if (navigableItems.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev < navigableItems.length - 1 ? prev + 1 : 0));
        return;
      }

      if (e.key === 'ArrowUp') {
        if (navigableItems.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : navigableItems.length - 1));
        return;
      }

      // Activate selected item on Enter
      if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < navigableItems.length) {
          e.preventDefault();
          e.stopPropagation();
          navigableItems[selectedIndex].onSelect();
        }
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [isOpen, switchTab, query, selectedIndex, navigableItems]);

  if (!isOpen) return null;

  // Helper to render media cards (images, videos, or story gradient frames)
  const renderMediaPreview = (item: {
    url: string;
    fileName?: string | null;
    type?: string;
    mimeType?: string | null;
  }) => {
    if (isStoryGradient(item.url)) {
      const gradient = item.url.replace(/^color:/, '');
      return (
        <div
          className="w-full h-full flex flex-col items-center justify-center p-3 text-center transition-transform duration-300 group-hover:scale-105"
          style={{ background: gradient }}
        >
          <Sparkles size={20} className="text-white/80 mb-1 drop-shadow-md" />
          <span className="text-[11px] font-semibold text-white drop-shadow-sm tracking-wide">
            Story
          </span>
        </div>
      );
    }

    if (isVideoMedia(item)) {
      return (
        <div className="relative w-full h-full bg-black/40">
          <video
            src={item.url}
            preload="metadata"
            muted
            playsInline
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute top-2 right-2 p-1 rounded-md bg-black/60 backdrop-blur-xs text-white/90">
            <Film size={12} />
          </div>
        </div>
      );
    }

    return (
      <img
        src={item.url}
        alt={item.fileName || 'Chat media'}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent && !parent.querySelector('.media-fallback-placeholder')) {
            const div = document.createElement('div');
            div.className =
              'media-fallback-placeholder absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/30 to-slate-900/50 text-gray-400 p-2 text-center';
            div.innerHTML =
              '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-1 text-purple-400 opacity-60"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg><span class="text-[10px] text-gray-400 font-medium truncate max-w-full">Photo</span>';
            parent.appendChild(div);
          }
        }}
      />
    );
  };

  return (
    <Modal
      onClose={onClose}
      closeOnInputEscape
      className="w-[min(780px,94vw)] max-h-[85vh] rounded-3xl p-0"
    >
      {(requestClose) => (
        <div className="flex flex-col h-full max-h-[85vh] glass-modal border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          {/* Header Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-white/2">
            <Search size={20} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  requestClose();
                }
              }}
              placeholder="Search messages, photos, music, files, and people..."
              className="flex-1 bg-transparent text-white placeholder:text-gray-500 text-base focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            )}

            {/* Clickable ESC close button with smooth exit transition */}
            <button
              type="button"
              onClick={requestClose}
              title="Close (Esc)"
              aria-label="Close search"
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg transition-all cursor-pointer select-none shadow-xs group"
            >
              <span className="tracking-wide">ESC</span>
              <X size={12} className="text-gray-400 group-hover:text-white transition-colors" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/5 bg-white/1 overflow-x-auto scrollbar-none no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0">
            {SEARCH_TABS.map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTabClick(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'glass-card bg-white/18 text-white shadow-[0_2px_12px_rgba(255,255,255,0.1),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-white/20 scale-[1.02]'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon size={13} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Container with directional tab animations */}
          <div
            key={`${tab}-${query ? 'search' : 'default'}`}
            ref={resultsContainerRef}
            className={`flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 ${
              slideDirection === 'right' ? 'animate-slideInRight' : 'animate-slideInLeft'
            }`}
          >
            {isSearching && (
              <div className="flex items-center justify-center py-16 text-gray-500">
                <div className="h-6 w-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mr-2" />
                <span className="text-sm">Searching...</span>
              </div>
            )}

            {/* Empty Search Query: Show the Default Rich Sections */}
            {!isSearching && !query && (
              <div className="space-y-6">
                {/* 1. Recent Chats (Shown in 'all' and 'messages') */}
                {(tab === 'all' || tab === 'messages') && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                      <span className="flex items-center gap-1.5 text-gray-300">
                        <MessageSquare size={13} className="text-sky-400" />
                        Recent Chats
                      </span>
                      <span className="text-[10px] text-gray-500 font-normal">Last active</span>
                    </div>

                    {recentChats.length === 0 ? (
                      <p className="text-xs text-gray-500 px-1">No chats yet</p>
                    ) : (
                      <div className="space-y-1.5">
                        {recentChats.map((conv) => {
                          const display = getConversationDisplay(conv, currentUserId);
                          const activityAt = getConversationActivityTime(conv);
                          const otherUserId = display.otherUserId;
                          const userActivity = otherUserId ? userActivities[otherUserId] : null;
                          const isOnline = otherUserId ? onlineUserIds.has(otherUserId) : false;
                          const isListening = Boolean(isOnline && isMusicActivity(userActivity));
                          const isGaming = Boolean(isOnline && isGamingActivity(userActivity));
                          const itemIndex = getItemIndex(`recent-chat-${conv.id}`);
                          const isNavSelected = selectedIndex === itemIndex;

                          return (
                            <div
                              key={conv.id}
                              data-search-nav-id={`recent-chat-${conv.id}`}
                              data-result-index={itemIndex}
                              onClick={() => handleSelectConversation(conv.id)}
                              onMouseMove={(e) => {
                                if (itemIndex >= 0 && (e.movementX !== 0 || e.movementY !== 0)) {
                                  setSelectedIndex(itemIndex);
                                }
                              }}
                              className={`nameplate-row flex items-center gap-3 p-2.5 rounded-2xl transition-all cursor-pointer group border ${
                                isNavSelected
                                  ? 'glass-card bg-white/12 border-sky-400/40 shadow-[0_0_18px_rgba(56,189,248,0.2),inset_0_1px_1px_rgba(255,255,255,0.3)] scale-[1.012]'
                                  : 'bg-white/2 hover:bg-white/6 border-white/5 hover:border-white/10'
                              }`}
                            >
                              <Nameplate nameplate={display.activeNameplate} alwaysPlay={true} />
                              <div className="relative shrink-0">
                                {display.isGroup ? (
                                  display.avatar ? (
                                    <Avatar size="md" src={display.avatar} />
                                  ) : (
                                    <GroupAvatarCollage
                                      avatars={conv.participants.map((p) => p.user?.avatar)}
                                      size={40}
                                    />
                                  )
                                ) : (
                                  <>
                                    <Avatar size="md" src={display.avatar} />
                                    {display.otherUserId && (
                                      <OnlineStatusIndicator
                                        userId={display.otherUserId}
                                        variant="dot"
                                        size="sm"
                                      />
                                    )}
                                  </>
                                )}
                              </div>

                              <div data-nameplate-text className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    data-nameplate-label
                                    className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors truncate"
                                  >
                                    {display.title}
                                  </span>
                                  <VerifiedCheckmark
                                    isVerified={display.isVerified}
                                    primaryBadge={display.primaryBadge}
                                    size="xs"
                                  />
                                  {display.isGroup ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-gray-400 shrink-0">
                                      <Users size={10} />
                                      <span>Group</span>
                                    </span>
                                  ) : isListening ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#1DB954]/15 border border-[#1DB954]/25 text-[10px] text-[#1DB954] font-medium shrink-0"
                                      title={`Listening to ${userActivity?.title || 'music'}`}
                                    >
                                      <SpotifyBrandIcon size={10} />
                                      <span className="truncate max-w-[120px]">
                                        {userActivity?.title || 'Spotify'}
                                      </span>
                                    </span>
                                  ) : isGaming ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#23a55a]/15 border border-[#23a55a]/25 text-[10px] text-[#23a55a] font-medium shrink-0"
                                      title={`Playing ${userActivity?.title || 'game'}`}
                                    >
                                      <DiscordGamepadIcon size={10} />
                                      <span className="truncate max-w-[120px]">
                                        {userActivity?.title || 'Gaming'}
                                      </span>
                                    </span>
                                  ) : null}
                                </div>

                                <div className="text-xs text-gray-400 truncate mt-0.5">
                                  {display.otherUserId ? (
                                    <OnlineStatusIndicator
                                      userId={display.otherUserId}
                                      variant="text"
                                      size="sm"
                                      className="text-xs"
                                    />
                                  ) : display.isGroup ? (
                                    `${conv.participants.length} members${
                                      conv.lastMessage
                                        ? ` • ${conv.lastMessage.body || 'Shared media'}`
                                        : ''
                                    }`
                                  ) : (
                                    conv.lastMessage?.body || 'No messages yet'
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-gray-500 font-medium">
                                  {formatMessageTime(new Date(activityAt))}
                                </span>
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-gray-400 group-hover:text-white group-hover:bg-sky-500 transition-colors">
                                  <ChevronRight size={13} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Recent Chat Media (Strictly visual media, shown in 'all' and 'media') */}
                {(tab === 'all' || tab === 'media') && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                      <span className="flex items-center gap-1.5 text-gray-300">
                        <ImageIcon size={13} className="text-purple-400" />
                        Recent Chat Media
                      </span>
                      <span className="text-[10px] text-gray-500 font-normal">Last received</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {displayedImages.map((img) => {
                        const itemIndex = getItemIndex(`recent-media-${img.id}`);
                        const isNavSelected = selectedIndex === itemIndex;
                        return (
                          <div
                            key={img.id}
                            data-search-nav-id={`recent-media-${img.id}`}
                            data-result-index={itemIndex}
                            onClick={() => {
                              if (img.conversationId) {
                                handleSelectConversation(img.conversationId, img.messageId);
                              }
                            }}
                            onMouseMove={(e) => {
                              if (itemIndex >= 0 && (e.movementX !== 0 || e.movementY !== 0)) {
                                setSelectedIndex(itemIndex);
                              }
                            }}
                            className={`group relative aspect-[4/3] rounded-2xl overflow-hidden bg-white/5 cursor-pointer transition-all duration-200 shadow-sm border ${
                              isNavSelected
                                ? 'ring-2 ring-purple-400 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-[1.03]'
                                : 'border-white/10 hover:border-purple-500/40 hover:shadow-lg'
                            }`}
                          >
                            {renderMediaPreview(img)}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5 pointer-events-none">
                              <p className="text-xs font-semibold text-white truncate">
                                {img.fileName || 'Media'}
                              </p>
                              {img.senderName && (
                                <p className="text-[10px] text-gray-300 truncate">
                                  from {img.senderName}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Recently Played Songs (Strictly songs, shown in 'all' and 'music') */}
                {(tab === 'all' || tab === 'music') && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                      <span className="flex items-center gap-1.5 text-gray-300">
                        <Music size={13} className="text-purple-400" />
                        Recently Played
                      </span>
                      <span className="text-[10px] text-gray-500 font-normal">Music Hub</span>
                    </div>

                    <div className="space-y-1.5">
                      {displayedTracks.map((track) => {
                        const isCurrent = Boolean(
                          currentTrack && isSameTrackId(currentTrack.id, track.id),
                        );
                        const isThisPlaying = isCurrent && isPlaying;
                        const platform = getTrackPlatform(track);
                        const isSoundCloud = platform === 'soundcloud';
                        const itemIndex = getItemIndex(`recent-track-${track.id}`);
                        const isNavSelected = selectedIndex === itemIndex;

                        return (
                          <div
                            key={track.id}
                            data-search-nav-id={`recent-track-${track.id}`}
                            data-result-index={itemIndex}
                            onClick={() => handlePlayTrack(track)}
                            onMouseMove={(e) => {
                              if (itemIndex >= 0 && (e.movementX !== 0 || e.movementY !== 0)) {
                                setSelectedIndex(itemIndex);
                              }
                            }}
                            className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all border ${
                              isNavSelected
                                ? 'glass-card bg-purple-500/20 border-purple-400/50 shadow-[0_0_18px_rgba(168,85,247,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)] scale-[1.012]'
                                : isCurrent
                                  ? 'bg-purple-500/10 border-purple-500/30'
                                  : 'bg-white/2 hover:bg-white/6 border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Cover with Play/Pause overlay */}
                              <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-white/5 shadow-xs">
                                {track.albumArt ? (
                                  <img
                                    src={track.albumArt}
                                    alt={track.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-purple-950/40 text-purple-300">
                                    <Music size={18} />
                                  </div>
                                )}
                                <div
                                  className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity ${
                                    isThisPlaying
                                      ? 'opacity-100'
                                      : 'opacity-0 group-hover:opacity-100'
                                  }`}
                                >
                                  {isThisPlaying ? (
                                    <Pause size={15} className="text-white fill-white" />
                                  ) : (
                                    <Play size={15} className="text-white fill-white ml-0.5" />
                                  )}
                                </div>
                              </div>

                              {/* Title & Author & Brand */}
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm font-semibold truncate transition-colors ${
                                    isCurrent
                                      ? 'text-purple-300 font-bold'
                                      : 'text-white group-hover:text-purple-300'
                                  }`}
                                >
                                  {track.title}
                                </p>
                                <p className="text-xs text-gray-400 truncate flex items-center gap-1.5 mt-0.5">
                                  <span className="truncate max-w-[180px]">{track.artist}</span>
                                  <span className="opacity-40 shrink-0">•</span>
                                  {isSoundCloud ? (
                                    <span className="inline-flex items-center gap-1 text-[#FF5500] text-[10px] font-semibold shrink-0">
                                      <SoundCloudBrandIcon size={10} />
                                      <span>SoundCloud</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[#1DB954] text-[10px] font-semibold shrink-0">
                                      <SpotifyBrandIcon size={10} />
                                      <span>Spotify</span>
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Right side: Duration */}
                            <span className="text-xs font-mono text-gray-400 group-hover:text-gray-300 font-medium shrink-0 ml-3">
                              {formatSongDuration(track.durationMs)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Query provided, but 0 results found */}
            {!isSearching && query && totalResults === 0 && (
              <div className="text-center py-16 text-gray-500 space-y-2">
                <Search size={36} className="mx-auto opacity-40" />
                <p className="text-sm font-medium">No results found for "{query}"</p>
                <p className="text-xs text-gray-600">
                  Try searching for messages, users, photos, or music tracks
                </p>
              </div>
            )}

            {/* Query provided, results available */}
            {!isSearching && query && totalResults > 0 && (
              <>
                {/* 1. People & Contacts Results (FIRST, with known contacts at the top) */}
                {(tab === 'all' || tab === 'people') && sortedPeople.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                      People & Contacts ({sortedPeople.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sortedPeople.map((person) => {
                        const isKnown = knownUserIds.has(person.id);
                        const itemIndex = getItemIndex(`person-${person.id}`);
                        const isNavSelected = selectedIndex === itemIndex;
                        return (
                          <div
                            key={person.id}
                            data-search-nav-id={`person-${person.id}`}
                            data-result-index={itemIndex}
                            onClick={() => handleStartDirectChat(person.id)}
                            onMouseMove={(e) => {
                              if (itemIndex >= 0 && (e.movementX !== 0 || e.movementY !== 0)) {
                                setSelectedIndex(itemIndex);
                              }
                            }}
                            className={`nameplate-row flex items-center gap-3 p-2.5 rounded-2xl transition-all cursor-pointer group border ${
                              isNavSelected
                                ? 'glass-card bg-white/12 border-sky-400/40 shadow-[0_0_18px_rgba(56,189,248,0.2),inset_0_1px_1px_rgba(255,255,255,0.3)] scale-[1.012]'
                                : 'bg-white/3 hover:bg-white/8 border-white/5 hover:border-white/15'
                            }`}
                          >
                            <Nameplate nameplate={person.activeNameplate} alwaysPlay={true} />
                            <div className="relative shrink-0">
                              <Avatar
                                src={person.avatar}
                                decoration={(person as any).activeDecoration}
                                userId={person.id}
                                size="md"
                              />
                              {person.isOnline && (
                                <OnlineStatusIndicator userId={person.id} variant="dot" />
                              )}
                            </div>
                            <div data-nameplate-text className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p
                                  data-nameplate-label
                                  className="text-sm font-medium text-white truncate"
                                >
                                  {person.displayName || person.username}
                                </p>
                                {isKnown && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/25 text-[10px] text-sky-400 font-medium shrink-0">
                                    In your chats
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">@{person.username}</p>
                            </div>
                            <button
                              type="button"
                              title="Chat"
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-gray-400 group-hover:text-white group-hover:bg-primary-500 transition-colors"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Messages Results */}
                {(tab === 'all' || tab === 'messages') && (results?.messages.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                      Messages ({results!.messages.length})
                    </h3>
                    <div className="space-y-1.5">
                      {results!.messages.map((msg) => {
                        const itemIndex = getItemIndex(`msg-${msg.id}`);
                        const isNavSelected = selectedIndex === itemIndex;
                        return (
                          <div
                            key={msg.id}
                            data-search-nav-id={`msg-${msg.id}`}
                            data-result-index={itemIndex}
                            onClick={() => handleSelectConversation(msg.conversationId, msg.id)}
                            onMouseMove={(e) => {
                              if (itemIndex >= 0 && (e.movementX !== 0 || e.movementY !== 0)) {
                                setSelectedIndex(itemIndex);
                              }
                            }}
                            className={`flex items-start gap-3 p-3 rounded-2xl transition-all cursor-pointer border group ${
                              isNavSelected
                                ? 'glass-card bg-white/12 border-sky-400/40 shadow-[0_0_18px_rgba(56,189,248,0.2),inset_0_1px_1px_rgba(255,255,255,0.3)] scale-[1.012]'
                                : 'bg-white/2 hover:bg-white/6 border-white/5'
                            }`}
                          >
                            <Avatar
                              src={msg.conversationAvatar || msg.senderAvatar}
                              decoration={(msg as any).activeDecoration}
                              userId={(msg as any).senderId}
                              size="md"
                              className="shrink-0 mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-gray-200 truncate">
                                  {msg.conversationTitle}
                                </span>
                                <span className="text-[11px] text-gray-500 shrink-0">
                                  {formatMessageTime(msg.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-primary-400 font-medium truncate mt-0.5">
                                {msg.senderName}:
                              </p>
                              <p className="text-sm text-gray-300 mt-0.5 line-clamp-2 leading-relaxed">
                                {msg.highlightSnippet || msg.body}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Media Results (Strictly visual photos/videos, NO songs) */}
                {(tab === 'all' || tab === 'media') && (results?.media.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                      Media ({results!.media.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {results!.media.map((item) => {
                        const itemIndex = getItemIndex(`media-${item.id}`);
                        const isNavSelected = selectedIndex === itemIndex;
                        return (
                          <div
                            key={item.id}
                            data-search-nav-id={`media-${item.id}`}
                            data-result-index={itemIndex}
                            onClick={() =>
                              handleSelectConversation(item.conversationId, item.messageId)
                            }
                            onMouseMove={(e) => {
                              if (itemIndex >= 0 && (e.movementX !== 0 || e.movementY !== 0)) {
                                setSelectedIndex(itemIndex);
                              }
                            }}
                            className={`relative group aspect-square rounded-2xl overflow-hidden bg-white/5 cursor-pointer transition-all duration-200 shadow-sm border ${
                              isNavSelected
                                ? 'ring-2 ring-purple-400 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-[1.03]'
                                : 'border-white/10 hover:border-purple-500/40 hover:shadow-lg'
                            }`}
                          >
                            {renderMediaPreview(item)}

                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 pointer-events-none">
                              <p className="text-[11px] text-white truncate">
                                {item.fileName || 'Media'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Music: Tracks Results (Music Hub style) */}
                {(tab === 'all' || tab === 'music') && musicResults.tracks.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                      <span className="flex items-center gap-1.5 text-gray-300">
                        <Music size={13} className="text-purple-400" />
                        Tracks ({musicResults.tracks.length})
                      </span>
                      {tab === 'all' && (
                        <button
                          type="button"
                          onClick={() => setTab('music')}
                          className="text-[10px] text-purple-400 hover:text-purple-300 font-medium transition-colors cursor-pointer"
                        >
                          View all tracks →
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {musicResults.tracks.map((track) => {
                        const isCurrent = Boolean(
                          currentTrack && isSameTrackId(currentTrack.id, track.id),
                        );
                        const isThisPlaying = isCurrent && isPlaying;
                        const platform = getTrackPlatform(track);
                        const isSoundCloud = platform === 'soundcloud';
                        const itemIndex = getItemIndex(`track-${track.id}`);
                        const isNavSelected = selectedIndex === itemIndex;

                        return (
                          <div
                            key={track.id}
                            data-search-nav-id={`track-${track.id}`}
                            data-result-index={itemIndex}
                            onClick={() => handlePlayTrack(track)}
                            onMouseMove={(e) => {
                              if (itemIndex >= 0 && (e.movementX !== 0 || e.movementY !== 0)) {
                                setSelectedIndex(itemIndex);
                              }
                            }}
                            className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all border ${
                              isNavSelected
                                ? 'glass-card bg-purple-500/20 border-purple-400/50 shadow-[0_0_18px_rgba(168,85,247,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)] scale-[1.012]'
                                : isCurrent
                                  ? 'bg-purple-500/10 border-purple-500/30'
                                  : 'bg-white/2 hover:bg-white/6 border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Cover with Play/Pause overlay */}
                              <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-white/5 shadow-xs">
                                {track.albumArt ? (
                                  <img
                                    src={track.albumArt}
                                    alt={track.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-purple-950/40 text-purple-300">
                                    <Music size={18} />
                                  </div>
                                )}
                                <div
                                  className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity ${
                                    isThisPlaying
                                      ? 'opacity-100'
                                      : 'opacity-0 group-hover:opacity-100'
                                  }`}
                                >
                                  {isThisPlaying ? (
                                    <Pause size={15} className="text-white fill-white" />
                                  ) : (
                                    <Play size={15} className="text-white fill-white ml-0.5" />
                                  )}
                                </div>
                              </div>

                              {/* Title & Author & Brand */}
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm font-semibold truncate transition-colors ${
                                    isCurrent
                                      ? 'text-purple-300 font-bold'
                                      : 'text-white group-hover:text-purple-300'
                                  }`}
                                >
                                  {track.title}
                                </p>
                                <p className="text-xs text-gray-400 truncate flex items-center gap-1.5 mt-0.5">
                                  <span className="truncate max-w-[180px]">{track.artist}</span>
                                  <span className="opacity-40 shrink-0">•</span>
                                  {isSoundCloud ? (
                                    <span className="inline-flex items-center gap-1 text-[#FF5500] text-[10px] font-semibold shrink-0">
                                      <SoundCloudBrandIcon size={10} />
                                      <span>SoundCloud</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[#1DB954] text-[10px] font-semibold shrink-0">
                                      <SpotifyBrandIcon size={10} />
                                      <span>Spotify</span>
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Right side: Duration */}
                            <span className="text-xs font-mono text-gray-400 group-hover:text-gray-300 font-medium shrink-0 ml-3">
                              {formatSongDuration(track.durationMs)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. Music: Playlists Results */}
                {(tab === 'all' || tab === 'music') && musicResults.playlists.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                      <span className="flex items-center gap-1.5 text-gray-300">
                        <ListMusic size={13} className="text-purple-400" />
                        Playlists ({musicResults.playlists.length})
                      </span>
                      <span className="text-[10px] text-gray-500 font-normal">Music Hub</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {musicResults.playlists.map((pl) => {
                        const isSoundCloud = pl.source === 'soundcloud' || pl.id.startsWith('sc-');
                        const itemIndex = getItemIndex(`playlist-${pl.id}`);
                        const isNavSelected = selectedIndex === itemIndex;

                        return (
                          <div
                            key={pl.id}
                            data-search-nav-id={`playlist-${pl.id}`}
                            data-result-index={itemIndex}
                            onClick={() => {
                              useMusicHubStore.getState().setSelectedPlaylistId(pl.id);
                              navigate(`/music/playlist/${encodeURIComponent(pl.id)}`);
                              onClose();
                            }}
                            onMouseMove={(e) => {
                              if (itemIndex >= 0 && (e.movementX !== 0 || e.movementY !== 0)) {
                                setSelectedIndex(itemIndex);
                              }
                            }}
                            className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all cursor-pointer group border ${
                              isNavSelected
                                ? 'glass-card bg-purple-500/20 border-purple-400/50 shadow-[0_0_18px_rgba(168,85,247,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)] scale-[1.012]'
                                : 'bg-white/3 hover:bg-white/8 border-white/5 hover:border-purple-500/30'
                            }`}
                          >
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-white/5 shadow-xs">
                              {pl.coverUrl ? (
                                <img
                                  src={pl.coverUrl}
                                  alt={pl.title}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex items-center justify-center text-purple-300"
                                  style={{
                                    background:
                                      pl.gradient ||
                                      'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                  }}
                                >
                                  <ListMusic size={18} />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
                                {pl.title}
                              </p>
                              <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate mt-0.5">
                                <span className="truncate max-w-[120px]">
                                  {pl.creator || 'Music Hub'}
                                </span>
                                {pl.trackCount !== undefined && pl.trackCount > 0 && (
                                  <>
                                    <span className="opacity-40 shrink-0">•</span>
                                    <span className="shrink-0">{pl.trackCount} tracks</span>
                                  </>
                                )}
                                <span className="opacity-40 shrink-0">•</span>
                                {isSoundCloud ? (
                                  <span className="inline-flex items-center gap-1 text-[#FF5500] text-[10px] font-semibold shrink-0">
                                    <SoundCloudBrandIcon size={10} />
                                    <span>SoundCloud</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[#1DB954] text-[10px] font-semibold shrink-0">
                                    <SpotifyBrandIcon size={10} />
                                    <span>Spotify</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <ChevronRight
                              size={16}
                              className="text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
