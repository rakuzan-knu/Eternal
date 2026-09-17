import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Check,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Gamepad2,
  Trophy,
  Layers,
  Star,
  GitFork,
  Radio,
  Eye,
  EyeOff,
  Unlink,
  Pencil,
  Users,
  Music,
  Search,
  RefreshCw,
  Play,
  Pause,
} from 'lucide-react';
import { RobloxBrandIcon, Dota2BrandIcon, CS2BrandIcon } from '@/shared/ui/BrandIcons';
import {
  DotaRankMedal,
  CS2PremierBadge,
  ShowcaseIntegrationCard,
  integrationsApi,
} from '@/entities/showcase';
import { SteamLevelBadge } from '@/shared/ui/SteamLevelBadge';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useQueryClient } from '@tanstack/react-query';
import { USER_KEY } from '@/shared/api/queryKeys';
import { UnlinkConfirmationModal } from './UnlinkConfirmationModal';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { isSpotifyUrl, isTrustedMessageOrigin, sanitizeImageUrl } from '@/shared/lib/urlSecurity';
import type { PlatformConfig } from './platforms';

export type { PlatformConfig };

interface ConfigureIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: PlatformConfig | null;
  initialData?: Record<string, any> | null;
  onSaveSuccess: (platformId: string, data: Record<string, any>) => void;
}

const DiscordSwitch: React.FC<{
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      onChange(!checked);
    }}
    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 p-0.5 select-none focus:outline-none ${
      checked ? 'bg-[#5865F2]' : 'bg-[#35363c]'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span
      className={`block w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export const ConfigureIntegrationModal: React.FC<ConfigureIntegrationModalProps> = ({
  isOpen,
  onClose,
  platform,
  initialData,
  onSaveSuccess,
}) => {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [featuredGame, setFeaturedGame] = useState<string>('dota2');
  const [featuredGames, setFeaturedGames] = useState<string[]>(['dota2']);
  const [displayOnProfile, setDisplayOnProfile] = useState<boolean>(true);
  const [pinnedRepo, setPinnedRepo] = useState<string>('');
  const [showPinnedRepo, setShowPinnedRepo] = useState<boolean>(true);
  const [showReposCount, setShowReposCount] = useState<boolean>(true);
  const [showStarsCount, setShowStarsCount] = useState<boolean>(true);
  const [showBio, setShowBio] = useState<boolean>(true);
  const [showFollowersCount, setShowFollowersCount] = useState<boolean>(true);
  const [spotifyDisplayMode, setSpotifyDisplayMode] = useState<'tracks' | 'playlists' | 'none'>(
    'tracks',
  );
  const [selectedSpotifyTracks, setSelectedSpotifyTracks] = useState<string[]>([]);
  const [selectedSpotifyPlaylists, setSelectedSpotifyPlaylists] = useState<string[]>([]);
  const [activeData, setActiveData] = useState<Record<string, any> | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [isCustomizingStats, setIsCustomizingStats] = useState(false);
  const popupRef = React.useRef<Window | null>(null);

  // Twitch, YouTube, Roblox settings
  const [showLiveStatus, setShowLiveStatus] = useState<boolean>(true);
  const [showSubscribersCount, setShowSubscribersCount] = useState<boolean>(true);
  const [showTotalViews, setShowTotalViews] = useState<boolean>(true);
  const [showRecentVideos, setShowRecentVideos] = useState<boolean>(true);
  const [showAvatarRender, setShowAvatarRender] = useState<boolean>(true);
  const [showFriends, setShowFriends] = useState<boolean>(true);
  const [showCollectibles, setShowCollectibles] = useState<boolean>(true);
  const [robloxDisplayContent, setRobloxDisplayContent] = useState<
    'auto' | 'collectibles' | 'places'
  >('auto');

  // Roblox Ownership Verification State
  const [robloxUsername, setRobloxUsername] = useState<string>('');
  const [robloxStep, setRobloxStep] = useState<'search' | 'verify'>('search');
  const [robloxUser, setRobloxUser] = useState<{
    id: number;
    username: string;
    displayName: string;
    avatarBustUrl: string;
  } | null>(null);
  const [robloxVerificationCode, setRobloxVerificationCode] = useState<string>('');
  const [isRobloxGenerating, setIsRobloxGenerating] = useState<boolean>(false);
  const [isRobloxVerifying, setIsRobloxVerifying] = useState<boolean>(false);
  const [robloxError, setRobloxError] = useState<string | null>(null);
  const [robloxCopied, setRobloxCopied] = useState<boolean>(false);

  // Spotify Library & Search State
  const [spotifyLibrary, setSpotifyLibrary] = useState<{
    likedSongs: any[];
    playlists: any[];
    topTracks: any[];
    totalLiked: number;
    totalPlaylists: number;
  }>({
    likedSongs: [],
    playlists: [],
    topTracks: [],
    totalLiked: 0,
    totalPlaylists: 0,
  });
  const [isLoadingSpotifyLibrary, setIsLoadingSpotifyLibrary] = useState(false);
  const [spotifySearchQuery, setSpotifySearchQuery] = useState('');
  const [spotifyCatalogResults, setSpotifyCatalogResults] = useState<any[]>([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [playingPreviewUrl, setPlayingPreviewUrl] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const handleToggleAudioPreview = (e: React.MouseEvent, url: string | null, track?: any) => {
    e.stopPropagation();
    if (track) {
      const globalTrack = useSpotifyPlayerStore.getState().currentTrack;
      const globalPlaying = useSpotifyPlayerStore.getState().isPlaying;

      if (globalTrack?.id === track.id && globalPlaying) {
        useSpotifyPlayerStore.getState().pause();
        setPlayingPreviewUrl(null);
      } else {
        useSpotifyPlayerStore.getState().playTrack({
          id: track.id,
          title: track.title || track.name,
          artist: track.artist || 'Spotify Artist',
          albumArt: track.albumArt || track.coverUrl || '',
          durationMs: track.durationMs || 180000,
          previewUrl: url || track.previewUrl || null,
          spotifyUrl:
            track.spotifyUrl && isSpotifyUrl(track.spotifyUrl)
              ? track.spotifyUrl
              : track.id
                ? `https://open.spotify.com/track/${track.id}`
                : 'https://open.spotify.com',
          contextName: 'Spotify Library Picker',
        });
        setPlayingPreviewUrl(url || track.id);
      }
      return;
    }

    if (!url) return;

    if (playingPreviewUrl === url) {
      audioPreviewRef.current?.pause();
      setPlayingPreviewUrl(null);
    } else {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio();
        audioPreviewRef.current.onended = () => setPlayingPreviewUrl(null);
        audioPreviewRef.current.onerror = () => setPlayingPreviewUrl(null);
      }
      audioPreviewRef.current.src = url;
      audioPreviewRef.current
        .play()
        .then(() => setPlayingPreviewUrl(url))
        .catch(() => setPlayingPreviewUrl(null));
    }
  };

  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
    };
  }, []);

  const loadSpotifyLibrary = useCallback(async () => {
    if (platform?.id !== 'spotify') return;
    setIsLoadingSpotifyLibrary(true);
    try {
      const data = await integrationsApi.getSpotifyLibrary();
      if (data) {
        setSpotifyLibrary({
          likedSongs: data.likedSongs || [],
          playlists: data.playlists || [],
          topTracks: data.topTracks || [],
          totalLiked: data.totalLiked || (data.likedSongs || []).length,
          totalPlaylists: data.totalPlaylists || (data.playlists || []).length,
        });
        setActiveData((prev: any) => ({
          ...(prev || {}),
          likedSongs: data.likedSongs,
          playlists: data.playlists,
          topTracks: data.topTracks,
          likedSongsCount: data.totalLiked,
          playlistsCount: data.totalPlaylists,
          username: data.user?.username || prev?.username,
          avatarUrl: data.user?.avatarUrl || prev?.avatarUrl,
        }));
      }
    } catch (err) {
      console.warn('Failed to load Spotify library:', err);
    } finally {
      setIsLoadingSpotifyLibrary(false);
    }
  }, [platform?.id]);

  useEffect(() => {
    if (isOpen && platform?.id === 'spotify') {
      loadSpotifyLibrary();
    }
  }, [isOpen, platform?.id, loadSpotifyLibrary]);

  const handleSearchCatalog = async (query: string) => {
    const q = query.trim();
    if (!q) {
      setSpotifyCatalogResults([]);
      return;
    }
    setIsSearchingCatalog(true);
    try {
      const results = await integrationsApi.searchSpotifyCatalog(q);
      setSpotifyCatalogResults(results || []);
    } catch (err) {
      console.warn('Spotify catalog search error:', err);
      setSpotifyCatalogResults([]);
    } finally {
      setIsSearchingCatalog(false);
    }
  };

  const handleRobloxFindAccount = async () => {
    if (!robloxUsername.trim()) return;
    setIsRobloxGenerating(true);
    setRobloxError(null);
    try {
      const res = await integrationsApi.robloxGenerateCode(robloxUsername.trim());
      if (res?.success && res.robloxUser && res.verificationCode) {
        setRobloxUser(res.robloxUser);
        setRobloxVerificationCode(res.verificationCode);
        setRobloxStep('verify');
      } else {
        setRobloxError(
          `Could not find Roblox user "${robloxUsername.trim()}". Please check the spelling.`,
        );
      }
    } catch (err: any) {
      setRobloxError(
        err?.response?.data?.message ||
          err?.message ||
          `Failed to find Roblox user "${robloxUsername.trim()}". Check username spelling.`,
      );
    } finally {
      setIsRobloxGenerating(false);
    }
  };

  const handleRobloxVerifyOwnership = async () => {
    if (!robloxUser || !robloxVerificationCode) return;
    setIsRobloxVerifying(true);
    setRobloxError(null);
    try {
      const res = await integrationsApi.robloxVerifyCode(
        robloxUser.username,
        robloxVerificationCode,
      );
      if (res?.success && res.data) {
        setActiveData(res.data);
        onSaveSuccess('roblox', res.data);
        queryClient.invalidateQueries({ queryKey: ['showcase'] });
        queryClient.invalidateQueries({ queryKey: [USER_KEY] });
        queryClient.invalidateQueries({ queryKey: ['user'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      } else {
        setRobloxError(
          'Verification incomplete. Please check your bio on roblox.com and try again.',
        );
      }
    } catch (err: any) {
      setRobloxError(
        err?.response?.data?.message ||
          err?.message ||
          'Verification code was not found in your Roblox profile description yet. Please paste the code into your About section on roblox.com, wait a few seconds, and try again.',
      );
    } finally {
      setIsRobloxVerifying(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      setActiveData(initialData);
      if (typeof initialData.displayOnProfile === 'boolean') {
        setDisplayOnProfile(initialData.displayOnProfile);
      } else {
        setDisplayOnProfile(true);
      }
      if (Array.isArray(initialData.featuredGames)) {
        setFeaturedGames(initialData.featuredGames);
      } else if (initialData.featuredGame) {
        setFeaturedGames([initialData.featuredGame]);
      } else {
        setFeaturedGames(['dota2']);
      }
      if (initialData.featuredGame) {
        setFeaturedGame(initialData.featuredGame);
      }
      if (initialData.pinnedRepo?.name) {
        setPinnedRepo(initialData.pinnedRepo.name);
      }
      setShowPinnedRepo(initialData.showPinnedRepo !== false);
      setShowReposCount(initialData.showReposCount !== false);
      setShowStarsCount(initialData.showStarsCount !== false);
      setShowBio(initialData.showBio !== false);
      setShowFollowersCount(initialData.showFollowersCount !== false);
      setShowLiveStatus(initialData.showLiveStatus !== false);
      setShowSubscribersCount(initialData.showSubscribersCount !== false);
      setShowTotalViews(initialData.showTotalViews !== false);
      setShowRecentVideos(initialData.showRecentVideos !== false);
      setShowAvatarRender(initialData.showAvatarRender !== false);
      setShowFriends(initialData.showFriends !== false);
      setShowCollectibles(initialData.showCollectibles !== false);
      setRobloxDisplayContent(initialData.displayContent || 'auto');
      setSpotifyDisplayMode(initialData.displayMode || 'tracks');
      setSelectedSpotifyTracks(
        Array.isArray(initialData.favoriteTracks)
          ? initialData.favoriteTracks
          : (initialData.likedSongs || []).slice(0, 3).map((t: any) => t.id),
      );
      setSelectedSpotifyPlaylists(
        Array.isArray(initialData.favoritePlaylists)
          ? initialData.favoritePlaylists
          : (initialData.playlists || []).slice(0, 3).map((p: any) => p.id),
      );
    } else {
      setActiveData(null);
      setDisplayOnProfile(true);
      setFeaturedGames(['dota2']);
      setShowPinnedRepo(true);
      setShowReposCount(true);
      setShowStarsCount(true);
      setShowBio(true);
      setShowFollowersCount(true);
      setShowLiveStatus(true);
      setShowSubscribersCount(true);
      setShowTotalViews(true);
      setShowRecentVideos(true);
      setShowAvatarRender(true);
      setShowFriends(true);
      setShowCollectibles(true);
      setRobloxDisplayContent('auto');
      setSpotifyDisplayMode('tracks');
      setSelectedSpotifyTracks([]);
      setSelectedSpotifyPlaylists([]);
    }
  }, [initialData, platform]);

  // Listen for OAuth completion popup postMessage & real-time cache refresh
  useEffect(() => {
    const handleAuthMessage = async (event: MessageEvent) => {
      if (!isTrustedMessageOrigin(event.origin)) return;
      if (!platform) return;
      const authPlatform = (event.data?.platform || '').toLowerCase();
      if (authPlatform !== platform.id.toLowerCase()) return;

      if (event.data?.type === 'OAUTH_CODE_RECEIVED' && event.data?.code) {
        setIsAuthenticating(true);
        try {
          const exchangeRes = await integrationsApi.exchangeCode(authPlatform, {
            code: event.data.code,
            redirectUri: event.origin || window.location.origin,
            state: event.data.state || currentUser?.id,
          });
          if (exchangeRes?.data) {
            setActiveData(exchangeRes.data);
            onSaveSuccess(platform.id, exchangeRes.data);
            setIsAuthenticating(false);
            queryClient.invalidateQueries({ queryKey: [USER_KEY] });
            queryClient.invalidateQueries({ queryKey: ['showcase'] });
            queryClient.invalidateQueries({ queryKey: ['user'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            try {
              if (popupRef.current && !popupRef.current.closed) {
                popupRef.current.close();
              }
            } catch {}
          }
        } catch (err) {
          console.error('Failed to exchange OAuth code in opener:', err);
        }
      }

      if (event.data?.type === 'INTEGRATION_AUTH_SUCCESS') {
        setIsAuthenticating(false);
        try {
          if (popupRef.current && !popupRef.current.closed) {
            popupRef.current.close();
          }
        } catch {}

        queryClient.invalidateQueries({ queryKey: [USER_KEY] });
        queryClient.invalidateQueries({ queryKey: ['showcase'] });
        queryClient.invalidateQueries({ queryKey: ['showcase', currentUser?.username] });
        queryClient.invalidateQueries({ queryKey: ['user'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });

        if (event.data.data) {
          setActiveData(event.data.data);
          onSaveSuccess(platform.id, event.data.data);
        } else if (currentUser?.username) {
          try {
            const { showcaseApi } = await import('@/entities/showcase/api/showcaseApi');
            const freshShowcase = await showcaseApi.getShowcase(currentUser.username);
            const freshAccount = (freshShowcase?.connectedAccounts as Record<string, any>)?.[
              platform.id
            ];
            if (freshAccount) {
              setActiveData(freshAccount);
              onSaveSuccess(platform.id, freshAccount);
            }
          } catch (err) {
            console.error('Failed to fetch updated showcase after OAuth:', err);
          }
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [platform, currentUser, onSaveSuccess, queryClient]);

  if (!isOpen || !platform) return null;

  const isConnected = !!activeData;

  const toggleGame = (gameId: string) => {
    setFeaturedGames((prev) =>
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId],
    );
  };

  const updateDotaStat = (field: 'hours' | 'winRate', value: number | null) => {
    setActiveData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        dota2: {
          ...prev.dota2,
          [field]: value,
        },
      };
    });
  };

  const updateCs2Stat = (field: 'hours' | 'winRate', value: number | null) => {
    setActiveData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cs2: {
          ...prev.cs2,
          [field]: value,
        },
      };
    });
  };

  const handleStartOAuth = () => {
    setIsAuthenticating(true);
    const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const baseBackendUrl = rawApiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const currentOrigin = window.location.origin;
    const targetUrl = `${baseBackendUrl}/integrations/${platform.id}/auth?userId=${encodeURIComponent(currentUser?.id || '')}&origin=${encodeURIComponent(currentOrigin)}`;

    const width = 640;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      targetUrl,
      `${platform.id}_oauth_window`,
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`,
    );
    popupRef.current = popup;

    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        setIsAuthenticating(false);
        queryClient.invalidateQueries({ queryKey: ['showcase'] });
        queryClient.invalidateQueries({ queryKey: [USER_KEY] });
      }
    }, 1000);
  };

  const handleUnlink = async () => {
    try {
      await integrationsApi.unlink(platform.id);
      setActiveData(null);
      onSaveSuccess(platform.id, null as any);
      queryClient.invalidateQueries({ queryKey: [USER_KEY] });
      queryClient.invalidateQueries({ queryKey: ['showcase'] });
      queryClient.invalidateQueries({ queryKey: ['showcase', currentUser?.username] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setShowUnlinkConfirm(false);
      onClose();
    } catch (err) {
      console.error('Failed to unlink platform:', err);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!activeData) return;
    setIsSaving(true);
    try {
      const selectedRepo =
        pinnedRepo && pinnedRepo !== 'none'
          ? activeData.repos?.find((r: any) => r.name === pinnedRepo) || activeData.pinnedRepo
          : null;

      const updated = {
        ...activeData,
        displayOnProfile,
        displayMode: spotifyDisplayMode,
        favoriteTracks: selectedSpotifyTracks,
        favoritePlaylists: selectedSpotifyPlaylists,
        featuredGames,
        featuredGame: featuredGames[0] || null,
        pinnedRepo: selectedRepo,
        showPinnedRepo: showPinnedRepo && !!selectedRepo,
        showReposCount,
        showStarsCount,
        showBio,
        showFollowersCount,
        showLiveStatus,
        showSubscribersCount,
        showTotalViews,
        showRecentVideos,
        showAvatarRender,
        showFriends,
        showCollectibles,
        displayContent: robloxDisplayContent,
      };

      if (platform.id === 'spotify') {
        try {
          const { apiClient } = await import('@/shared/api/httpClient');
          await apiClient.post('/integrations/spotify/preferences', {
            displayOnProfile,
            displayMode: spotifyDisplayMode,
            favoriteTracks: selectedSpotifyTracks,
            favoritePlaylists: selectedSpotifyPlaylists,
          });
        } catch (spotifyPrefErr) {
          console.warn('Direct spotify preferences update fallback:', spotifyPrefErr);
        }
      }

      await integrationsApi.link(
        platform.id,
        activeData.username || activeData.steamId || activeData.handle || 'User',
        updated,
      );
      onSaveSuccess(platform.id, updated);
      onClose();
    } catch (err) {
      console.error('Save configuration error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-lg max-h-[88vh] bg-[#0e0e11] border border-white/[0.1] rounded-3xl shadow-2xl flex flex-col text-white overflow-hidden">
        {/* Pinned Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0 bg-[#0e0e11]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              {platform.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                {platform.name} Integration
              </h3>
              <p className="text-xs text-gray-400">{platform.description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
          {/* 1. NOT CONNECTED STATE */}
          {!isConnected ? (
            platform.id === 'roblox' ? (
              /* Dedicated Roblox Account Ownership Verification Flow */
              robloxStep === 'search' ? (
                <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] gap-4 my-auto w-full">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,255,255,0.08)]">
                    <RobloxBrandIcon size={32} />
                  </div>

                  <div className="flex flex-col gap-1.5 max-w-sm">
                    <h4 className="text-sm font-bold text-white">
                      Verify Roblox Account Ownership
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      To prevent impersonation, ownership is securely verified via a one-time
                      verification code placed in your Roblox profile bio.
                    </p>
                  </div>

                  {robloxError && (
                    <div className="w-full p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left">
                      {robloxError}
                    </div>
                  )}

                  <div className="w-full flex flex-col gap-2 pt-1">
                    <input
                      type="text"
                      value={robloxUsername}
                      onChange={(e) => {
                        setRobloxUsername(e.target.value);
                        setRobloxError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRobloxFindAccount();
                      }}
                      placeholder="Enter your Roblox Username"
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#5865F2] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleRobloxFindAccount}
                      disabled={isRobloxGenerating || !robloxUsername.trim()}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition-all shadow-[0_4px_16px_rgba(88,101,242,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isRobloxGenerating ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Searching Roblox Account...</span>
                        </>
                      ) : (
                        <>
                          <span>Proceed to Verification</span>
                          <Check size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] gap-4 my-auto w-full">
                  {/* Found User Profile Header */}
                  {robloxUser && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] w-full text-left">
                      <img
                        src={robloxUser.avatarBustUrl || '/icons/brands/roblox.png'}
                        alt={robloxUser.username}
                        className="w-12 h-12 rounded-xl object-cover bg-black/40 border border-white/10 shrink-0"
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-bold text-white truncate">
                          {robloxUser.displayName || robloxUser.username}
                        </span>
                        <span className="text-[11px] text-gray-400 truncate">
                          @{robloxUser.username}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 shrink-0">
                        Verification Required
                      </span>
                    </div>
                  )}

                  {robloxError && (
                    <div className="w-full p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left leading-relaxed">
                      {robloxError}
                    </div>
                  )}

                  {/* Verification Instructions & Code */}
                  <div className="flex flex-col gap-2 w-full text-left">
                    <span className="text-xs text-gray-300 font-medium leading-relaxed">
                      Add this one-time code to the <b>About</b> section of your Roblox profile:
                    </span>

                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/40 border border-white/10">
                      <code className="flex-1 font-mono text-xs font-bold text-[#5865F2] select-all tracking-wider">
                        {robloxVerificationCode}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(robloxVerificationCode);
                          setRobloxCopied(true);
                          setTimeout(() => setRobloxCopied(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-[11px] font-semibold text-white transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        {robloxCopied ? <Check size={12} className="text-emerald-400" /> : null}
                        <span>{robloxCopied ? 'Copied!' : 'Copy Code'}</span>
                      </button>
                    </div>

                    <a
                      href="https://www.roblox.com/my/account"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#5865F2] hover:underline flex items-center gap-1 self-start"
                    >
                      <span>Open Roblox Account Settings</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 w-full mt-1">
                    <button
                      type="button"
                      onClick={handleRobloxVerifyOwnership}
                      disabled={isRobloxVerifying}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition-all shadow-[0_4px_16px_rgba(88,101,242,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isRobloxVerifying ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Checking Profile Bio on Roblox...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={15} />
                          <span>Verify Ownership</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRobloxStep('search');
                        setRobloxError(null);
                      }}
                      disabled={isRobloxVerifying}
                      className="w-full py-1.5 text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer text-center"
                    >
                      Use a different Roblox account
                    </button>
                  </div>

                  <p className="text-[10px] text-gray-500 leading-relaxed text-center pt-2 border-t border-white/[0.06] w-full">
                    Roblox is a registered trademark of Roblox Corporation. This integration uses
                    Roblox Open Cloud and is not affiliated with or endorsed by Roblox Corporation.
                  </p>
                </div>
              )
            ) : (
              /* Universal OAuth Connection Card (YouTube, Twitch, Steam, GitHub, Spotify, etc.) */
              <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] gap-4 my-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/20 flex items-center justify-center text-[#5865F2] shadow-[0_0_20px_rgba(88,101,242,0.15)]">
                  <ShieldCheck size={28} />
                </div>

                <div className="flex flex-col gap-1.5 max-w-sm">
                  <h4 className="text-sm font-bold text-white">
                    Authenticate with {platform.name}
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Connect and securely verify your account directly through{' '}
                    {platform.authProviderName}. We only request read-only statistics and ranks.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStartOAuth}
                  disabled={isAuthenticating}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition-all shadow-[0_4px_16px_rgba(88,101,242,0.35)] flex items-center justify-center gap-2 cursor-pointer hover:scale-102 active:scale-98 disabled:opacity-50"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Connecting to {platform.name}...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in through {platform.name}</span>
                      <ExternalLink size={13} />
                    </>
                  )}
                </button>

                {/* Developer Policy & Compliance Disclaimers */}
                <div className="text-[10px] text-gray-400/80 leading-relaxed border-t border-white/[0.06] pt-3 mt-1 w-full text-left flex flex-col gap-1.5">
                  {platform.id === 'youtube' && (
                    <p>
                      By connecting your YouTube account, you agree to be bound by the{' '}
                      <a
                        href="https://www.youtube.com/t/terms"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                      >
                        YouTube Terms of Service
                      </a>{' '}
                      and acknowledge the{' '}
                      <a
                        href="https://policies.google.com/privacy"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                      >
                        Google Privacy Policy
                      </a>
                      . You may revoke access at any time via{' '}
                      <a
                        href="https://security.google.com/settings/security/permissions"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                      >
                        Google Security Settings
                      </a>
                      .
                    </p>
                  )}
                  {platform.id === 'spotify' && (
                    <p>
                      Uses the Spotify Web API. All artist, album, and playback metadata is provided
                      courtesy of Spotify AB and its licensors. You can manage or revoke access at
                      any time in your{' '}
                      <a
                        href="https://www.spotify.com/account/apps/"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                      >
                        Spotify Account Apps
                      </a>
                      .
                    </p>
                  )}
                  {platform.id === 'twitch' && (
                    <p>
                      Uses Twitch Developer Services subject to the{' '}
                      <a
                        href="https://www.twitch.tv/p/legal/terms-of-service/"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-purple-400 hover:underline inline-flex items-center gap-0.5"
                      >
                        Twitch Terms of Service
                      </a>
                      . You can manage or disconnect this app at any time via{' '}
                      <a
                        href="https://www.twitch.tv/settings/connections"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-purple-400 hover:underline inline-flex items-center gap-0.5"
                      >
                        Twitch Connections
                      </a>
                      .
                    </p>
                  )}
                  {platform.id === 'steam' && (
                    <p>
                      Powered by Steam. Valve, the Valve logo, Steam, and the Steam logo are
                      trademarks and/or registered trademarks of Valve Corporation in the U.S.
                      and/or other countries. Not affiliated with Valve Corporation.
                    </p>
                  )}
                  {platform.id === 'github' && (
                    <p>
                      Uses GitHub REST API. GitHub and the Octocat logo are trademarks of GitHub,
                      Inc. Not affiliated with GitHub, Inc. You can revoke access at any time in{' '}
                      <a
                        href="https://github.com/settings/applications"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-gray-300 hover:underline inline-flex items-center gap-0.5"
                      >
                        GitHub Authorized OAuth Apps
                      </a>
                      .
                    </p>
                  )}
                </div>
              </div>
            )
          ) : (
            /* 2. CONNECTED STATE */
            <div className="flex flex-col gap-3.5">
              {/* Account Info Header */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <img
                    src={sanitizeImageUrl(
                      activeData.avatarUrl,
                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
                    )}
                    alt={activeData.username || 'User'}
                    className="w-9 h-9 rounded-full object-cover border border-white/20 shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                      {activeData.username ||
                        activeData.handle ||
                        activeData.riotId ||
                        activeData.steamId}
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1 shrink-0">
                        <ShieldCheck size={10} /> Verified
                      </span>
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Linked via {platform.authProviderName}
                    </span>
                  </div>
                </div>

                <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white/[0.06] text-gray-300 shrink-0">
                  {platform.name}
                </span>
              </div>

              {/* STEAM CONFIGURATION */}
              {platform.id === 'steam' && (
                <div className="flex flex-col gap-3.5">
                  {/* Setting 1: Display on profile toggle */}
                  <div
                    onClick={() => setDisplayOnProfile(!displayOnProfile)}
                    className="p-3 rounded-2xl bg-[#1e1f22]/70 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        Display on profile
                      </span>
                      <span className="text-[11px] text-gray-400 mt-0.5">
                        Show your Steam account and game statistics in your profile showcase widget.
                      </span>
                    </div>
                    <DiscordSwitch
                      checked={displayOnProfile}
                      onChange={(val) => setDisplayOnProfile(val)}
                    />
                  </div>

                  {/* Setting 2: Featured Games Multi-Selection */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Featured Games & Activity
                      </span>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setIsCustomizingStats((prev) => !prev)}
                          className="text-[10px] text-[#5865F2] hover:text-[#7983f5] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Pencil size={10} />
                          {isCustomizingStats ? 'Done editing' : 'Edit stats'}
                        </button>
                        <span className="text-[10px] text-gray-400">
                          {featuredGames.length} selected
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Dota 2 Option */}
                      <div
                        onClick={() => toggleGame('dota2')}
                        className={`p-2.5 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer select-none ${
                          featuredGames.includes('dota2')
                            ? 'bg-white/[0.04] border-white/20 shadow-sm'
                            : 'bg-white/[0.01] border-white/[0.05] opacity-60 hover:opacity-90 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Dota2BrandIcon size={32} />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-white leading-tight">
                                Dota 2
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <DotaRankMedal
                                  rankIcon={activeData.dota2?.rankIcon}
                                  rankTier={activeData.dota2?.rankTier}
                                  size="sm"
                                />
                                <span className="text-[11px] font-bold text-white">
                                  {activeData.dota2?.rankTier || 'Unranked'}
                                </span>
                                {activeData.dota2?.winRate && (
                                  <span className="text-[10px] text-emerald-400 font-semibold">
                                    • {activeData.dota2.winRate}% WR
                                  </span>
                                )}
                                {activeData.dota2?.hours && activeData.dota2.hours > 0 ? (
                                  <span className="text-[10px] text-gray-400">
                                    • {activeData.dota2.hours.toLocaleString()} hrs
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <DiscordSwitch
                            checked={featuredGames.includes('dota2')}
                            onChange={() => toggleGame('dota2')}
                          />
                        </div>

                        {isCustomizingStats && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-2 border-t border-white/[0.08] flex items-center gap-3 flex-wrap"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400">Hours:</span>
                              <input
                                type="number"
                                value={activeData.dota2?.hours ?? ''}
                                onChange={(e) =>
                                  updateDotaStat(
                                    'hours',
                                    e.target.value ? parseInt(e.target.value, 10) : null,
                                  )
                                }
                                placeholder="e.g. 2400"
                                className="w-24 px-2 py-0.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#5865F2]"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400">Winrate:</span>
                              <input
                                type="number"
                                step="0.01"
                                value={activeData.dota2?.winRate ?? ''}
                                onChange={(e) =>
                                  updateDotaStat(
                                    'winRate',
                                    e.target.value ? parseFloat(e.target.value) : null,
                                  )
                                }
                                placeholder="e.g. 54.2"
                                className="w-20 px-2 py-0.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#5865F2]"
                              />
                              <span className="text-[10px] text-gray-400">%</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* CS2 Option */}
                      <div
                        onClick={() => toggleGame('cs2')}
                        className={`p-2.5 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer select-none ${
                          featuredGames.includes('cs2')
                            ? 'bg-white/[0.04] border-white/20 shadow-sm'
                            : 'bg-white/[0.01] border-white/[0.05] opacity-60 hover:opacity-90 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <CS2BrandIcon size={32} />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-white leading-tight">
                                Counter-Strike 2
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {activeData.cs2?.premierRating ? (
                                  <CS2PremierBadge rating={activeData.cs2.premierRating} />
                                ) : (
                                  <span className="text-[10px] font-bold text-gray-300">
                                    {activeData.cs2?.rankTier || 'Unranked'}
                                  </span>
                                )}
                                {activeData.cs2?.winRate && (
                                  <span className="text-[10px] text-emerald-400 font-semibold">
                                    • {activeData.cs2.winRate}% WR
                                  </span>
                                )}
                                {activeData.cs2?.hours && activeData.cs2.hours > 0 ? (
                                  <span className="text-[10px] text-gray-400">
                                    • {activeData.cs2.hours.toLocaleString()} hrs
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <DiscordSwitch
                            checked={featuredGames.includes('cs2')}
                            onChange={() => toggleGame('cs2')}
                          />
                        </div>

                        {isCustomizingStats && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-2 border-t border-white/[0.08] flex items-center gap-3 flex-wrap"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400">Hours:</span>
                              <input
                                type="number"
                                value={activeData.cs2?.hours ?? ''}
                                onChange={(e) =>
                                  updateCs2Stat(
                                    'hours',
                                    e.target.value ? parseInt(e.target.value, 10) : null,
                                  )
                                }
                                placeholder="e.g. 1800"
                                className="w-24 px-2 py-0.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#5865F2]"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400">Winrate:</span>
                              <input
                                type="number"
                                step="0.01"
                                value={activeData.cs2?.winRate ?? ''}
                                onChange={(e) =>
                                  updateCs2Stat(
                                    'winRate',
                                    e.target.value ? parseFloat(e.target.value) : null,
                                  )
                                }
                                placeholder="e.g. 52.0"
                                className="w-20 px-2 py-0.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#5865F2]"
                              />
                              <span className="text-[10px] text-gray-400">%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Real Live Game Showcase Preview */}
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.08] flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <Eye size={12} className="text-[#5865F2]" />
                        Profile Showcase Preview
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {!displayOnProfile
                          ? 'Hidden from profile'
                          : featuredGames.length === 0
                            ? 'No games active'
                            : `${featuredGames.length} ${featuredGames.length === 1 ? 'game' : 'games'} active`}
                      </span>
                    </div>

                    {!displayOnProfile ? (
                      <div className="py-4 px-3 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-1">
                        <EyeOff size={18} className="text-gray-500" />
                        <span className="text-xs font-semibold text-gray-400">
                          Hidden from Profile Showcase
                        </span>
                        <span className="text-[10px] text-gray-400 max-w-xs leading-relaxed">
                          This Steam account will stay connected to your profile, but will not be
                          visible in your showcase widget.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {/* Steam Profile Bar */}
                        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#1b2838]/60 border border-[#2a475e]/40">
                          <div className="flex items-center gap-2.5">
                            <SteamLevelBadge level={activeData.level ?? 0} size="sm" />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white leading-tight">
                                Steam Profile
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {(activeData.gamesCount ?? 0).toLocaleString()} Games
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Toggled Games Preview */}
                        {featuredGames.length === 0 ? (
                          <div className="py-2 px-3 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center text-[10px] text-gray-400">
                            No games selected. Only your general Steam level & games count will be
                            shown.
                          </div>
                        ) : (
                          featuredGames.map((gameId) => {
                            if (gameId === 'dota2' && activeData.dota2) {
                              return (
                                <div
                                  key="dota2"
                                  className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-[#14151a] to-[#0c0d10] border border-white/[0.08]"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <Dota2BrandIcon size={30} />
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-white leading-tight">
                                        Dota 2
                                      </span>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <DotaRankMedal
                                          rankIcon={activeData.dota2?.rankIcon}
                                          rankTier={activeData.dota2?.rankTier}
                                          size="sm"
                                        />
                                        <span className="text-[11px] font-bold text-white">
                                          {activeData.dota2?.rankTier || 'Unranked'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {activeData.dota2?.winRate && (
                                      <span className="text-[10px] font-bold text-emerald-400">
                                        {activeData.dota2.winRate}% WR
                                      </span>
                                    )}
                                    {activeData.dota2?.hours && activeData.dota2.hours > 0 ? (
                                      <div className="text-[9px] text-gray-400">
                                        {activeData.dota2.hours.toLocaleString()} hrs
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            }

                            if (gameId === 'cs2' && activeData.cs2) {
                              return (
                                <div
                                  key="cs2"
                                  className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-[#14151a] to-[#0c0d10] border border-white/[0.08]"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <CS2BrandIcon size={30} />
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-white leading-tight">
                                        Counter-Strike 2
                                      </span>
                                      {activeData.cs2?.premierRating ? (
                                        <div className="mt-0.5">
                                          <CS2PremierBadge rating={activeData.cs2.premierRating} />
                                        </div>
                                      ) : activeData.cs2?.hours && activeData.cs2.hours > 0 ? (
                                        <span className="text-[10px] text-gray-400 font-medium">
                                          {activeData.cs2.hours.toLocaleString()} hrs played
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {activeData.cs2?.winRate ? (
                                      <span className="text-[10px] font-bold text-emerald-400">
                                        {activeData.cs2.winRate}% WR
                                      </span>
                                    ) : (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-gray-400 font-semibold">
                                        {activeData.cs2?.rankTier || 'Unranked'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            return null;
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* GITHUB CONFIGURATION (Discord-Style) */}
              {platform.id === 'github' && (
                <div className="flex flex-col gap-3.5">
                  {/* Master Toggle: Display on profile */}
                  <div
                    onClick={() => setDisplayOnProfile(!displayOnProfile)}
                    className="p-3.5 rounded-2xl bg-[#1e1f22]/80 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        Display on profile
                      </span>
                      <span className="text-[11px] text-gray-400 mt-0.5">
                        Show this connected account on your profile showcase.
                      </span>
                    </div>
                    <DiscordSwitch
                      checked={displayOnProfile}
                      onChange={(val) => setDisplayOnProfile(val)}
                    />
                  </div>

                  {/* Detailed Settings (visible when displayOnProfile is true) */}
                  {displayOnProfile && (
                    <div className="flex flex-col gap-3 pt-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                        Profile Card Details
                      </span>

                      {/* Feature Pinned Repository Section */}
                      <div className="p-3.5 rounded-2xl bg-[#1e1f22]/60 border border-white/[0.08] flex flex-col gap-3">
                        <div
                          onClick={() => setShowPinnedRepo(!showPinnedRepo)}
                          className="flex items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              Feature Pinned Repository
                            </span>
                            <span className="text-[11px] text-gray-400 mt-0.5">
                              Highlight a selected open-source project on your profile card.
                            </span>
                          </div>
                          <DiscordSwitch
                            checked={showPinnedRepo}
                            onChange={(val) => setShowPinnedRepo(val)}
                          />
                        </div>

                        {showPinnedRepo && activeData.repos && activeData.repos.length > 0 && (
                          <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
                            <label className="text-[11px] font-semibold text-gray-300">
                              Choose Repository to Feature:
                            </label>
                            <select
                              value={pinnedRepo}
                              onChange={(e) => setPinnedRepo(e.target.value)}
                              className="w-full bg-[#141417] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-[#5865F2] transition-colors"
                            >
                              <option value="none">-- Do not feature any repository --</option>
                              {activeData.repos.map((repo: any) => (
                                <option key={repo.name} value={repo.name}>
                                  {repo.name} ({repo.stars || 0}★ • {repo.language || 'Code'})
                                </option>
                              ))}
                            </select>

                            {/* Live mini preview of chosen repository */}
                            {pinnedRepo &&
                              pinnedRepo !== 'none' &&
                              (() => {
                                const found = activeData.repos.find(
                                  (r: any) => r.name === pinnedRepo,
                                );
                                if (!found) return null;
                                return (
                                  <div className="mt-1 p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col gap-1.5 text-left">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 truncate">
                                        <Layers size={13} />
                                        {found.name}
                                      </span>
                                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                        <span className="text-amber-300 flex items-center gap-0.5 font-bold">
                                          <Star
                                            size={10}
                                            className="fill-amber-400 text-amber-400"
                                          />
                                          {found.stars ?? 0}
                                        </span>
                                        <span className="flex items-center gap-0.5">
                                          <GitFork size={10} />
                                          {found.forks ?? 0}
                                        </span>
                                      </div>
                                    </div>
                                    {found.description && (
                                      <p className="text-[10px] text-gray-400 line-clamp-1">
                                        {found.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                      <span>{found.language || 'Code'}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                          </div>
                        )}
                      </div>

                      {/* Display Elements Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Toggle: Show Bio */}
                        <div
                          onClick={() => setShowBio(!showBio)}
                          className="p-3 rounded-xl bg-[#1e1f22]/60 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-2 cursor-pointer select-none"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-200">
                              Show Profile Bio
                            </span>
                            <span className="text-[10px] text-gray-400">Display summary text</span>
                          </div>
                          <DiscordSwitch checked={showBio} onChange={(val) => setShowBio(val)} />
                        </div>

                        {/* Toggle: Show Repos Count */}
                        <div
                          onClick={() => setShowReposCount(!showReposCount)}
                          className="p-3 rounded-xl bg-[#1e1f22]/60 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-2 cursor-pointer select-none"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-200">
                              Show Repositories
                            </span>
                            <span className="text-[10px] text-gray-400">Public repo count</span>
                          </div>
                          <DiscordSwitch
                            checked={showReposCount}
                            onChange={(val) => setShowReposCount(val)}
                          />
                        </div>

                        {/* Toggle: Show Stars Count */}
                        <div
                          onClick={() => setShowStarsCount(!showStarsCount)}
                          className="p-3 rounded-xl bg-[#1e1f22]/60 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-2 cursor-pointer select-none"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-200">
                              Show Stars Count
                            </span>
                            <span className="text-[10px] text-gray-400">Total earned stars</span>
                          </div>
                          <DiscordSwitch
                            checked={showStarsCount}
                            onChange={(val) => setShowStarsCount(val)}
                          />
                        </div>

                        {/* Toggle: Show Followers Count */}
                        <div
                          onClick={() => setShowFollowersCount(!showFollowersCount)}
                          className="p-3 rounded-xl bg-[#1e1f22]/60 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-2 cursor-pointer select-none"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-200">
                              Show Followers
                            </span>
                            <span className="text-[10px] text-gray-400">
                              Community follower count
                            </span>
                          </div>
                          <DiscordSwitch
                            checked={showFollowersCount}
                            onChange={(val) => setShowFollowersCount(val)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* RIOT GAMES CONFIG */}
              {platform.id === 'riot' && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-300">Featured Riot Game:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFeaturedGame('lol')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        featuredGame === 'lol'
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50'
                          : 'bg-white/[0.03] text-gray-400 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      <span>League of Legends</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeaturedGame('val')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        featuredGame === 'val' || featuredGame === 'valorant'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                          : 'bg-white/[0.03] text-gray-400 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      <span>Valorant</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SPOTIFY CONFIG */}
              {platform.id === 'spotify' && (
                <div className="flex flex-col gap-3.5">
                  {/* Setting 1: Master Toggle Display on profile */}
                  <div
                    onClick={() => setDisplayOnProfile(!displayOnProfile)}
                    className="p-3.5 rounded-2xl bg-[#1e1f22]/70 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        Display on profile
                      </span>
                      <span className="text-[11px] text-gray-400 mt-0.5">
                        Show your Spotify profile card and favorite music in your profile showcase
                        widget.
                      </span>
                    </div>
                    <DiscordSwitch
                      checked={displayOnProfile}
                      onChange={(val) => setDisplayOnProfile(val)}
                    />
                  </div>

                  {displayOnProfile &&
                    (() => {
                      const allLikedSongs =
                        (spotifyLibrary.likedSongs.length > 0
                          ? spotifyLibrary.likedSongs
                          : activeData?.likedSongs) || [];
                      const allPlaylists =
                        (spotifyLibrary.playlists.length > 0
                          ? spotifyLibrary.playlists
                          : activeData?.playlists) || [];

                      const filteredLikedSongs = allLikedSongs.filter(
                        (t: any) =>
                          !spotifySearchQuery.trim() ||
                          t.title?.toLowerCase().includes(spotifySearchQuery.toLowerCase()) ||
                          t.artist?.toLowerCase().includes(spotifySearchQuery.toLowerCase()),
                      );

                      const filteredPlaylists = allPlaylists.filter(
                        (p: any) =>
                          !spotifySearchQuery.trim() ||
                          p.name?.toLowerCase().includes(spotifySearchQuery.toLowerCase()),
                      );

                      const formatTrackDuration = (ms?: number) => {
                        if (!ms) return '';
                        const totalSec = Math.floor(ms / 1000);
                        const m = Math.floor(totalSec / 60);
                        const s = totalSec % 60;
                        return `${m}:${s < 10 ? '0' : ''}${s}`;
                      };

                      return (
                        <div className="flex flex-col gap-3.5">
                          {/* Display Mode Selector with Library Sync Button */}
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between px-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Display Mode
                              </span>
                              <button
                                type="button"
                                onClick={() => loadSpotifyLibrary()}
                                disabled={isLoadingSpotifyLibrary}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] text-xs font-semibold border border-[#1DB954]/30 transition-all cursor-pointer disabled:opacity-50"
                                title="Sync your authentic library from Spotify Web API"
                              >
                                <RefreshCw
                                  size={12}
                                  className={isLoadingSpotifyLibrary ? 'animate-spin' : ''}
                                />
                                <span>
                                  {isLoadingSpotifyLibrary ? 'Syncing...' : 'Sync Spotify'}
                                </span>
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => setSpotifyDisplayMode('tracks')}
                                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                  spotifyDisplayMode === 'tracks'
                                    ? 'bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/50 shadow-[0_0_12px_rgba(29,185,84,0.15)]'
                                    : 'bg-white/[0.03] text-gray-400 hover:text-white border border-white/[0.06]'
                                }`}
                              >
                                <Music size={13} />
                                <span>Favorite Tracks</span>
                                <span className="text-[10px] px-1.5 py-0.2 bg-black/40 rounded-full font-mono font-normal">
                                  {allLikedSongs.length}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSpotifyDisplayMode('playlists')}
                                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                  spotifyDisplayMode === 'playlists'
                                    ? 'bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/50 shadow-[0_0_12px_rgba(29,185,84,0.15)]'
                                    : 'bg-white/[0.03] text-gray-400 hover:text-white border border-white/[0.06]'
                                }`}
                              >
                                <Layers size={13} />
                                <span>Playlists</span>
                                <span className="text-[10px] px-1.5 py-0.2 bg-black/40 rounded-full font-mono font-normal">
                                  {allPlaylists.length}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSpotifyDisplayMode('none')}
                                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                  spotifyDisplayMode === 'none'
                                    ? 'bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/50 shadow-[0_0_12px_rgba(29,185,84,0.15)]'
                                    : 'bg-white/[0.03] text-gray-400 hover:text-white border border-white/[0.06]'
                                }`}
                              >
                                <Radio size={13} />
                                <span>Overview Only</span>
                              </button>
                            </div>
                          </div>

                          {/* Favorite Tracks Picker */}
                          {spotifyDisplayMode === 'tracks' && (
                            <div className="flex flex-col gap-2">
                              {/* Search Filter Bar */}
                              <div className="relative">
                                <Search
                                  size={14}
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                  type="text"
                                  value={spotifySearchQuery}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSpotifySearchQuery(val);
                                    if (val.trim().length >= 2) {
                                      handleSearchCatalog(val);
                                    }
                                  }}
                                  placeholder={`Search ${allLikedSongs.length} liked tracks or type to search catalog...`}
                                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-[#1DB954]/50 text-xs text-white placeholder-gray-500 focus:outline-hidden transition-all"
                                />
                                {isSearchingCatalog ? (
                                  <Loader2
                                    size={12}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
                                  />
                                ) : spotifySearchQuery ? (
                                  <button
                                    type="button"
                                    onClick={() => setSpotifySearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 cursor-pointer"
                                  >
                                    <X size={12} />
                                  </button>
                                ) : null}
                              </div>

                              <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                  Choose up to 3 Favorite Tracks ({selectedSpotifyTracks.length}/3)
                                </span>
                                {selectedSpotifyTracks.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSpotifyTracks([])}
                                    className="text-[10px] text-gray-400 hover:text-white cursor-pointer"
                                  >
                                    Clear all
                                  </button>
                                )}
                              </div>

                              {/* Pinned Selected Tracks Chips */}
                              {selectedSpotifyTracks.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/25">
                                  {selectedSpotifyTracks.map((id) => {
                                    const track =
                                      allLikedSongs.find((t: any) => t.id === id) ||
                                      spotifyCatalogResults.find((t: any) => t.id === id);
                                    return (
                                      <span
                                        key={id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-[#1DB954]/40 text-[11px] text-white shadow-xs"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />
                                        <span className="max-w-[130px] truncate font-semibold">
                                          {track?.title || id}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setSelectedSpotifyTracks(
                                              selectedSpotifyTracks.filter((tId) => tId !== id),
                                            )
                                          }
                                          className="text-gray-400 hover:text-red-400 ml-0.5 cursor-pointer"
                                        >
                                          <X size={11} />
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Loading Skeleton */}
                              {isLoadingSpotifyLibrary ? (
                                <div className="flex flex-col gap-1.5 py-2">
                                  {[1, 2, 3].map((n) => (
                                    <div
                                      key={n}
                                      className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] animate-pulse"
                                    >
                                      <div className="w-9 h-9 rounded-lg bg-white/10 shrink-0" />
                                      <div className="flex flex-col gap-1 flex-1">
                                        <div className="h-3 w-32 bg-white/10 rounded-sm" />
                                        <div className="h-2 w-20 bg-white/5 rounded-sm" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : filteredLikedSongs.length === 0 &&
                                spotifyCatalogResults.length === 0 ? (
                                <div className="p-5 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-1.5 text-xs text-gray-400">
                                  <Music size={24} className="text-gray-500 mb-1 opacity-50" />
                                  <span className="font-semibold text-gray-300">
                                    {spotifySearchQuery
                                      ? 'No tracks found matching search'
                                      : 'No liked songs in your Spotify library'}
                                  </span>
                                  <span className="text-[11px] text-gray-500">
                                    {spotifySearchQuery
                                      ? 'Try searching for another track name above'
                                      : 'Like songs in your Spotify app or use the search bar to feature any track'}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
                                  {/* Matched Liked Songs */}
                                  {filteredLikedSongs.map((track: any) => {
                                    const isSelected = selectedSpotifyTracks.includes(track.id);
                                    const isPlayingThis = playingPreviewUrl === track.previewUrl;
                                    return (
                                      <div
                                        key={track.id}
                                        onClick={() => {
                                          if (isSelected) {
                                            setSelectedSpotifyTracks(
                                              selectedSpotifyTracks.filter((id) => id !== track.id),
                                            );
                                          } else if (selectedSpotifyTracks.length < 3) {
                                            setSelectedSpotifyTracks([
                                              ...selectedSpotifyTracks,
                                              track.id,
                                            ]);
                                          }
                                        }}
                                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none group/item ${
                                          isSelected
                                            ? 'bg-[#1DB954]/15 border-[#1DB954]/40 shadow-xs'
                                            : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.05]'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-black/40 shrink-0 border border-white/10 group/art">
                                            <img
                                              src={sanitizeImageUrl(
                                                track.albumArt,
                                                '/icons/brands/spotify.png',
                                              )}
                                              alt={track.title}
                                              className="w-full h-full object-cover"
                                            />
                                            {track.previewUrl && (
                                              <button
                                                type="button"
                                                onClick={(e) =>
                                                  handleToggleAudioPreview(
                                                    e,
                                                    track.previewUrl,
                                                    track,
                                                  )
                                                }
                                                className={`absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center transition-opacity text-white cursor-pointer ${
                                                  isPlayingThis
                                                    ? 'opacity-100 text-[#1DB954]'
                                                    : 'opacity-0 group-hover/art:opacity-100'
                                                }`}
                                                title={
                                                  isPlayingThis
                                                    ? 'Pause preview'
                                                    : 'Play 30s preview'
                                                }
                                              >
                                                {isPlayingThis ? (
                                                  <Pause size={14} />
                                                ) : (
                                                  <Play size={14} className="translate-x-0.2" />
                                                )}
                                              </button>
                                            )}
                                          </div>

                                          <div className="flex flex-col min-w-0">
                                            <span
                                              className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}
                                            >
                                              {track.title}
                                            </span>
                                            <span className="text-[10px] text-gray-400 truncate">
                                              {track.artist}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                          {track.durationMs && (
                                            <span className="text-[10px] font-mono text-gray-400">
                                              {formatTrackDuration(track.durationMs)}
                                            </span>
                                          )}
                                          <div
                                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                              isSelected
                                                ? 'bg-[#1DB954] border-[#1DB954] text-black shadow-[0_0_8px_rgba(29,185,84,0.4)]'
                                                : 'border-white/20 bg-black/20 group-hover/item:border-white/40'
                                            }`}
                                          >
                                            {isSelected && <Check size={12} strokeWidth={3} />}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Spotify Catalog Global Search Results */}
                                  {spotifyCatalogResults.length > 0 && (
                                    <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.08]">
                                      <span className="text-[10px] font-bold text-[#1DB954] uppercase tracking-wider px-1">
                                        Spotify Catalog Search
                                      </span>
                                      {spotifyCatalogResults.map((track: any) => {
                                        const isSelected = selectedSpotifyTracks.includes(track.id);
                                        const isPlayingThis =
                                          playingPreviewUrl === track.previewUrl;
                                        return (
                                          <div
                                            key={track.id}
                                            onClick={() => {
                                              if (isSelected) {
                                                setSelectedSpotifyTracks(
                                                  selectedSpotifyTracks.filter(
                                                    (id) => id !== track.id,
                                                  ),
                                                );
                                              } else if (selectedSpotifyTracks.length < 3) {
                                                setSelectedSpotifyTracks([
                                                  ...selectedSpotifyTracks,
                                                  track.id,
                                                ]);
                                              }
                                            }}
                                            className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none group/item ${
                                              isSelected
                                                ? 'bg-[#1DB954]/15 border-[#1DB954]/40 shadow-xs'
                                                : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.05]'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-black/40 shrink-0 border border-white/10 group/art">
                                                <img
                                                  src={
                                                    track.albumArt || '/icons/brands/spotify.png'
                                                  }
                                                  alt={track.title}
                                                  className="w-full h-full object-cover"
                                                />
                                                {track.previewUrl && (
                                                  <button
                                                    type="button"
                                                    onClick={(e) =>
                                                      handleToggleAudioPreview(
                                                        e,
                                                        track.previewUrl,
                                                        track,
                                                      )
                                                    }
                                                    className={`absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center transition-opacity text-white cursor-pointer ${
                                                      isPlayingThis
                                                        ? 'opacity-100 text-[#1DB954]'
                                                        : 'opacity-0 group-hover/art:opacity-100'
                                                    }`}
                                                    title={
                                                      isPlayingThis
                                                        ? 'Pause preview'
                                                        : 'Play 30s preview'
                                                    }
                                                  >
                                                    {isPlayingThis ? (
                                                      <Pause size={14} />
                                                    ) : (
                                                      <Play size={14} className="translate-x-0.2" />
                                                    )}
                                                  </button>
                                                )}
                                              </div>

                                              <div className="flex flex-col min-w-0">
                                                <span
                                                  className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}
                                                >
                                                  {track.title}
                                                </span>
                                                <span className="text-[10px] text-gray-400 truncate">
                                                  {track.artist}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                              {track.durationMs && (
                                                <span className="text-[10px] font-mono text-gray-400">
                                                  {formatTrackDuration(track.durationMs)}
                                                </span>
                                              )}
                                              <div
                                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                                  isSelected
                                                    ? 'bg-[#1DB954] border-[#1DB954] text-black shadow-[0_0_8px_rgba(29,185,84,0.4)]'
                                                    : 'border-white/20 bg-black/20 group-hover/item:border-white/40'
                                                }`}
                                              >
                                                {isSelected && <Check size={12} strokeWidth={3} />}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Favorite Playlists Picker */}
                          {spotifyDisplayMode === 'playlists' && (
                            <div className="flex flex-col gap-2">
                              {/* Search Filter Bar */}
                              <div className="relative">
                                <Search
                                  size={14}
                                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                  type="text"
                                  value={spotifySearchQuery}
                                  onChange={(e) => setSpotifySearchQuery(e.target.value)}
                                  placeholder={`Search in ${allPlaylists.length} playlists...`}
                                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-[#1DB954]/50 text-xs text-white placeholder-gray-500 focus:outline-hidden transition-all"
                                />
                                {spotifySearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setSpotifySearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 cursor-pointer"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                  Choose up to 3 Featured Playlists (
                                  {selectedSpotifyPlaylists.length}/3)
                                </span>
                                {selectedSpotifyPlaylists.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSpotifyPlaylists([])}
                                    className="text-[10px] text-gray-400 hover:text-white cursor-pointer"
                                  >
                                    Clear all
                                  </button>
                                )}
                              </div>

                              {/* Pinned Selected Playlists Chips */}
                              {selectedSpotifyPlaylists.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/25">
                                  {selectedSpotifyPlaylists.map((id) => {
                                    const pl = allPlaylists.find((p: any) => p.id === id);
                                    return (
                                      <span
                                        key={id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-[#1DB954]/40 text-[11px] text-white shadow-xs"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />
                                        <span className="max-w-[130px] truncate font-semibold">
                                          {pl?.name || id}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setSelectedSpotifyPlaylists(
                                              selectedSpotifyPlaylists.filter((pId) => pId !== id),
                                            )
                                          }
                                          className="text-gray-400 hover:text-red-400 ml-0.5 cursor-pointer"
                                        >
                                          <X size={11} />
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {isLoadingSpotifyLibrary ? (
                                <div className="flex flex-col gap-1.5 py-2">
                                  {[1, 2, 3].map((n) => (
                                    <div
                                      key={n}
                                      className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] animate-pulse"
                                    >
                                      <div className="w-9 h-9 rounded-lg bg-white/10 shrink-0" />
                                      <div className="flex flex-col gap-1 flex-1">
                                        <div className="h-3 w-32 bg-white/10 rounded-sm" />
                                        <div className="h-2 w-20 bg-white/5 rounded-sm" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : filteredPlaylists.length === 0 ? (
                                <div className="p-5 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-1.5 text-xs text-gray-400">
                                  <Layers size={24} className="text-gray-500 mb-1 opacity-50" />
                                  <span className="font-semibold text-gray-300">
                                    {spotifySearchQuery
                                      ? 'No playlists found matching search'
                                      : 'No playlists found in your Spotify account'}
                                  </span>
                                  <span className="text-[11px] text-gray-500">
                                    Create or follow playlists in your Spotify app, then click "Sync
                                    Spotify" above
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
                                  {filteredPlaylists.map((pl: any) => {
                                    const isSelected = selectedSpotifyPlaylists.includes(pl.id);
                                    return (
                                      <div
                                        key={pl.id}
                                        onClick={() => {
                                          if (isSelected) {
                                            setSelectedSpotifyPlaylists(
                                              selectedSpotifyPlaylists.filter((id) => id !== pl.id),
                                            );
                                          } else if (selectedSpotifyPlaylists.length < 3) {
                                            setSelectedSpotifyPlaylists([
                                              ...selectedSpotifyPlaylists,
                                              pl.id,
                                            ]);
                                          }
                                        }}
                                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none group/pl ${
                                          isSelected
                                            ? 'bg-[#1DB954]/15 border-[#1DB954]/40 shadow-xs'
                                            : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.05]'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          {pl.coverUrl ? (
                                            <img
                                              src={sanitizeImageUrl(
                                                pl.coverUrl,
                                                '/icons/brands/spotify.png',
                                              )}
                                              alt={pl.name}
                                              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-white/10"
                                            />
                                          ) : (
                                            <div className="w-9 h-9 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-gray-400 shrink-0">
                                              <Layers size={16} />
                                            </div>
                                          )}
                                          <div className="flex flex-col min-w-0">
                                            <span
                                              className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}
                                            >
                                              {pl.name}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                              {pl.tracksCount || 0} tracks
                                            </span>
                                          </div>
                                        </div>

                                        <div className="shrink-0 ml-2">
                                          <div
                                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                              isSelected
                                                ? 'bg-[#1DB954] border-[#1DB954] text-black shadow-[0_0_8px_rgba(29,185,84,0.4)]'
                                                : 'border-white/20 bg-black/20 group-hover/pl:border-white/40'
                                            }`}
                                          >
                                            {isSelected && <Check size={12} strokeWidth={3} />}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Live Mini Preview */}
                          <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.08] flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                <Eye size={12} className="text-[#1DB954]" />
                                Spotify Card Preview
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {spotifyDisplayMode === 'tracks'
                                  ? `${selectedSpotifyTracks.length || (allLikedSongs.length ? Math.min(3, allLikedSongs.length) : 0)} tracks`
                                  : spotifyDisplayMode === 'playlists'
                                    ? `${selectedSpotifyPlaylists.length || (allPlaylists.length ? Math.min(3, allPlaylists.length) : 0)} playlists`
                                    : 'Overview only'}
                              </span>
                            </div>

                            <ShowcaseIntegrationCard
                              platform="spotify"
                              data={{
                                ...activeData,
                                displayOnProfile: true,
                                displayMode: spotifyDisplayMode,
                                favoriteTracks: selectedSpotifyTracks,
                                favoritePlaylists: selectedSpotifyPlaylists,
                                likedSongs: allLikedSongs,
                                playlists: allPlaylists,
                              }}
                              isOwner={false}
                            />
                          </div>
                        </div>
                      );
                    })()}
                </div>
              )}

              {/* TWITCH CONFIGURATION */}
              {platform.id === 'twitch' && (
                <div className="flex flex-col gap-3.5">
                  {/* Master Toggle: Display on profile */}
                  <div
                    onClick={() => setDisplayOnProfile(!displayOnProfile)}
                    className="p-3.5 rounded-2xl bg-[#1e1f22]/80 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        Display on profile
                      </span>
                      <span className="text-[11px] text-gray-400 mt-0.5">
                        Show your Twitch channel and broadcast stats on your profile showcase.
                      </span>
                    </div>
                    <DiscordSwitch
                      checked={displayOnProfile}
                      onChange={(val) => setDisplayOnProfile(val)}
                    />
                  </div>

                  {displayOnProfile && (
                    <div className="flex flex-col gap-3 pt-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                        Twitch Showcase Options
                      </span>

                      {/* Toggle: Announce Live Stream */}
                      <div
                        onClick={() => setShowLiveStatus(!showLiveStatus)}
                        className="p-3.5 rounded-2xl bg-[#1e1f22]/60 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Radio size={13} className="text-[#9146FF]" />
                            Announce Live Stream
                          </span>
                          <span className="text-[11px] text-gray-400 mt-0.5">
                            Highlight your stream with live viewer count, title, and game category
                            when you go live.
                          </span>
                        </div>
                        <DiscordSwitch
                          checked={showLiveStatus}
                          onChange={(val) => setShowLiveStatus(val)}
                        />
                      </div>

                      {/* Toggle: Show Followers Count */}
                      <div
                        onClick={() => setShowFollowersCount(!showFollowersCount)}
                        className="p-3.5 rounded-2xl bg-[#1e1f22]/60 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Users size={13} className="text-[#9146FF]" />
                            Show Followers Count
                          </span>
                          <span className="text-[11px] text-gray-400 mt-0.5">
                            Display total community followers on your Twitch card.
                          </span>
                        </div>
                        <DiscordSwitch
                          checked={showFollowersCount}
                          onChange={(val) => setShowFollowersCount(val)}
                        />
                      </div>

                      {/* Live Preview */}
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.08] flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                            <Eye size={12} className="text-[#9146FF]" />
                            Twitch Card Preview
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {activeData?.isLive ? 'Currently Live' : 'Offline'}
                          </span>
                        </div>

                        <ShowcaseIntegrationCard
                          platform="twitch"
                          data={{
                            ...activeData,
                            displayOnProfile: true,
                            showLiveStatus,
                            showFollowersCount,
                          }}
                          isOwner={false}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* YOUTUBE CONFIGURATION */}
              {platform.id === 'youtube' && (
                <div className="flex flex-col gap-3.5">
                  {/* Master Toggle: Display on profile */}
                  <div
                    onClick={() => setDisplayOnProfile(!displayOnProfile)}
                    className="p-3.5 rounded-2xl bg-[#1e1f22]/80 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        Display on profile
                      </span>
                      <span className="text-[11px] text-gray-400 mt-0.5">
                        Show your YouTube channel, subscribers, and videos on your profile showcase.
                      </span>
                    </div>
                    <DiscordSwitch
                      checked={displayOnProfile}
                      onChange={(val) => setDisplayOnProfile(val)}
                    />
                  </div>

                  {displayOnProfile && (
                    <div className="flex flex-col gap-3 pt-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                        YouTube Showcase Options
                      </span>

                      {/* Toggle: Show Subscribers Count */}
                      <div
                        onClick={() => setShowSubscribersCount(!showSubscribersCount)}
                        className="p-3.5 rounded-2xl bg-[#1e1f22]/60 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Users size={13} className="text-[#FF0000]" />
                            Show Subscribers Count
                          </span>
                          <span className="text-[11px] text-gray-400 mt-0.5">
                            Display authentic public subscriber count on your profile card.
                          </span>
                        </div>
                        <DiscordSwitch
                          checked={showSubscribersCount}
                          onChange={(val) => setShowSubscribersCount(val)}
                        />
                      </div>

                      {/* Toggle: Show Total Views */}
                      <div
                        onClick={() => setShowTotalViews(!showTotalViews)}
                        className="p-3.5 rounded-2xl bg-[#1e1f22]/60 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Eye size={13} className="text-[#FF0000]" />
                            Show Total Channel Views
                          </span>
                          <span className="text-[11px] text-gray-400 mt-0.5">
                            Display aggregate views across all public video uploads.
                          </span>
                        </div>
                        <DiscordSwitch
                          checked={showTotalViews}
                          onChange={(val) => setShowTotalViews(val)}
                        />
                      </div>

                      {/* Toggle: Show Recent Video Uploads */}
                      <div
                        onClick={() => setShowRecentVideos(!showRecentVideos)}
                        className="p-3.5 rounded-2xl bg-[#1e1f22]/60 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Play size={13} className="text-[#FF0000]" />
                            Feature Recent Video Uploads
                          </span>
                          <span className="text-[11px] text-gray-400 mt-0.5">
                            Display 3 interactive video thumbnails with durations and click-to-watch
                            links.
                          </span>
                        </div>
                        <DiscordSwitch
                          checked={showRecentVideos}
                          onChange={(val) => setShowRecentVideos(val)}
                        />
                      </div>

                      {/* Live Preview */}
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.08] flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                            <Eye size={12} className="text-[#FF0000]" />
                            YouTube Card Preview
                          </span>
                        </div>

                        <ShowcaseIntegrationCard
                          platform="youtube"
                          data={{
                            ...activeData,
                            displayOnProfile: true,
                            showSubscribersCount,
                            showTotalViews,
                            showRecentVideos,
                          }}
                          isOwner={false}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ROBLOX CONFIGURATION */}
              {platform.id === 'roblox' && (
                <div className="flex flex-col gap-3.5">
                  {/* Master Toggle: Display on profile */}
                  <div
                    onClick={() => setDisplayOnProfile(!displayOnProfile)}
                    className="p-3.5 rounded-2xl bg-[#1e1f22]/80 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        Display on profile
                      </span>
                      <span className="text-[11px] text-gray-400 mt-0.5">
                        Show your Roblox avatar, collectibles, and stats on your profile showcase.
                      </span>
                    </div>
                    <DiscordSwitch
                      checked={displayOnProfile}
                      onChange={(val) => setDisplayOnProfile(val)}
                    />
                  </div>

                  {displayOnProfile && (
                    <div className="flex flex-col gap-3 pt-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                        Roblox Showcase Options
                      </span>

                      {/* Toggle: Show 3D Avatar Render */}
                      <div
                        onClick={() => setShowAvatarRender(!showAvatarRender)}
                        className="p-3.5 rounded-2xl bg-[#1e1f22]/60 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Gamepad2 size={13} className="text-white" />
                            Show 3D Avatar Render
                          </span>
                          <span className="text-[11px] text-gray-400 mt-0.5">
                            Display your full Roblox avatar pose and outfit render.
                          </span>
                        </div>
                        <DiscordSwitch
                          checked={showAvatarRender}
                          onChange={(val) => setShowAvatarRender(val)}
                        />
                      </div>

                      {/* Toggle: Show Friends & Followers */}
                      <div
                        onClick={() => setShowFriends(!showFriends)}
                        className="p-3.5 rounded-2xl bg-[#1e1f22]/60 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Users size={13} className="text-white" />
                            Show Friends & Followers Count
                          </span>
                          <span className="text-[11px] text-gray-400 mt-0.5">
                            Display your social network metrics on Roblox.
                          </span>
                        </div>
                        <DiscordSwitch
                          checked={showFriends}
                          onChange={(val) => setShowFriends(val)}
                        />
                      </div>

                      {/* Toggle: Show Collectibles & Places */}
                      <div
                        onClick={() => setShowCollectibles(!showCollectibles)}
                        className="p-3.5 rounded-2xl bg-[#1e1f22]/60 border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Trophy size={13} className="text-white" />
                            Show Collectibles & Favorite Games
                          </span>
                          <span className="text-[11px] text-gray-400 mt-0.5">
                            Display top inventory items and favorite experiences.
                          </span>
                        </div>
                        <DiscordSwitch
                          checked={showCollectibles}
                          onChange={(val) => setShowCollectibles(val)}
                        />
                      </div>

                      {/* Showcase Display Mode: Collectibles vs Favorite Places */}
                      {showCollectibles &&
                        activeData?.places?.length > 0 &&
                        activeData?.items?.length > 0 && (
                          <div className="p-3.5 rounded-2xl bg-[#1e1f22]/60 border border-white/[0.08] flex flex-col gap-2.5">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Trophy size={13} className="text-amber-400" />
                                Showcase Content Selection
                              </span>
                              <span className="text-[11px] text-gray-400 mt-0.5">
                                Choose whether to display your top collectibles or favorite places.
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
                              <button
                                type="button"
                                onClick={() => setRobloxDisplayContent('collectibles')}
                                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                                  robloxDisplayContent === 'collectibles' ||
                                  robloxDisplayContent === 'auto'
                                    ? 'bg-white/15 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                Collectibles ({activeData.items.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setRobloxDisplayContent('places')}
                                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                                  robloxDisplayContent === 'places'
                                    ? 'bg-white/15 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                Favorite Places ({activeData.places.length})
                              </button>
                            </div>
                          </div>
                        )}

                      {/* Live Preview */}
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.08] flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                            <Eye size={12} className="text-white" />
                            Roblox Card Preview
                          </span>
                        </div>

                        <ShowcaseIntegrationCard
                          platform="roblox"
                          data={{
                            ...activeData,
                            displayOnProfile: true,
                            showAvatarRender,
                            showFriends,
                            showCollectibles,
                            displayContent: robloxDisplayContent,
                          }}
                          isOwner={false}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pinned Footer Actions */}
        {isConnected && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/[0.08] shrink-0 bg-[#0e0e11]">
            <button
              type="button"
              onClick={() => setShowUnlinkConfirm(true)}
              className="text-red-400 hover:text-red-300 text-xs font-semibold hover:underline transition cursor-pointer flex items-center gap-1.5"
            >
              <Unlink size={13} />
              <span>Disconnect Account</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-gray-300 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfiguration}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#5865F2] hover:bg-[#4752C4] text-white transition-all shadow-[0_4px_16px_rgba(88,101,242,0.35)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:scale-102 active:scale-98"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <UnlinkConfirmationModal
        isOpen={showUnlinkConfirm}
        platformName={platform.name}
        onConfirm={handleUnlink}
        onCancel={() => setShowUnlinkConfirm(false)}
      />
    </div>
  );
};
