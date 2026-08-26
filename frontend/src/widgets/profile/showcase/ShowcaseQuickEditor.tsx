import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Search,
  Plus,
  Trash2,
  Check,
  Star,
  Flame,
  Gamepad2,
  Tv,
  Film,
  Sparkles,
  Lock,
  Globe,
  Users,
  MoveUp,
  MoveDown,
  Music2,
  Bookmark,
  Play,
  Pause,
  Clock,
  Eye,
} from 'lucide-react';
import {
  ShowcaseMediaType,
  ShowcasePrivacy,
  type ProfileShowcaseDto,
  type ShowcaseMediaItemDto,
  type SpotlightMediaDto,
  type ProfileAnthemDto,
  type UpdateShowcaseDto,
  type MediaSearchResultDto,
} from '@backend/common/contracts';
import {
  useMediaSearch,
  useTrackSearch,
  useUpdateShowcase,
} from '@/entities/showcase/model/useShowcase';
import { useDebounce } from '@/shared/lib/useDebounce';
import { audioCoordinator } from '@/shared/lib/audioCoordinator';
import { SpotifyBrandIcon } from '@/shared/ui/BrandIcons';

interface ShowcaseQuickEditorProps {
  isOpen: boolean;
  onClose: () => void;
  showcase: ProfileShowcaseDto;
  initialTab?: 'media' | 'spotlight' | 'meta' | 'activity' | 'privacy' | 'anthem' | 'wishlist';
  initialMediaType?: ShowcaseMediaType;
}

const PRESET_TAGS = {
  GAME: [
    '🎮 Looking for teammates',
    '🏆 100% achievements',
    '🔥 Main',
    '👑 High Skill',
    '💖 Favorite',
    '⚡ Ranked Grinder',
  ],
  ANIME: ['🍿 Rewatching', '✨ Favorite Title', '👀 Ongoing', '💫 Masterpiece', '🌸 Comfort Show'],
  MOVIE: ['🍿 Rewatching', '✨ Favorite Title', '💫 Masterpiece', '🎬 Cinema Classic'],
  SERIES: ['🍿 Rewatching', '✨ Favorite Title', '👀 Ongoing', '💫 Masterpiece'],
};

const WISHLIST_PRESET_TAGS = [
  '⏳ Anticipated Release',
  '🎮 Want to Play',
  '👀 Plan to Watch',
  '🔥 High Priority',
  '⭐ Must Play',
  '🕹️ Backlog',
];

const ACCENT_COLORS = [
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

const TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Kyiv',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Asia/Singapore',
  'Australia/Sydney',
];

export const ShowcaseQuickEditor: React.FC<ShowcaseQuickEditorProps> = ({
  isOpen,
  onClose,
  showcase,
  initialTab = 'media',
  initialMediaType = ShowcaseMediaType.GAME,
}) => {
  const [activeTab, setActiveTab] = useState<
    'media' | 'spotlight' | 'meta' | 'activity' | 'privacy' | 'anthem' | 'wishlist'
  >(initialTab);
  const [selectedMediaType, setSelectedMediaType] = useState<ShowcaseMediaType>(initialMediaType);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [trackSearchQuery, setTrackSearchQuery] = useState('');
  const debouncedTrackSearch = useDebounce(trackSearchQuery, 400);

  const { data: searchResults = [], isFetching: isSearching } = useMediaSearch(
    debouncedSearch,
    selectedMediaType,
  );

  const { data: trackResults = [], isFetching: isSearchingTracks } =
    useTrackSearch(debouncedTrackSearch);

  // Audio preview state
  const [previewTrackUrl, setPreviewTrackUrl] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    previewAudioRef.current = audio;

    const handleEnded = () => setPreviewTrackUrl(null);
    audio.addEventListener('ended', handleEnded);

    const handleGlobalPlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail.id !== 'editor-track-preview') {
        if (previewAudioRef.current) {
          previewAudioRef.current.pause();
        }
        setPreviewTrackUrl(null);
      }
    };

    window.addEventListener('app:audio-play', handleGlobalPlay);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      window.removeEventListener('app:audio-play', handleGlobalPlay);
      audio.pause();
      audio.src = '';
      previewAudioRef.current = null;
    };
  }, []);

  const toggleTrackPreview = (url?: string | null) => {
    if (!url || !previewAudioRef.current) return;

    if (previewTrackUrl === url) {
      previewAudioRef.current.pause();
      setPreviewTrackUrl(null);
      audioCoordinator.stop('editor-track-preview');
    } else {
      previewAudioRef.current.src = url;
      audioCoordinator.play(previewAudioRef.current, 'editor-track-preview');
      previewAudioRef.current
        .play()
        .then(() => setPreviewTrackUrl(url))
        .catch(() => setPreviewTrackUrl(null));
    }
  };

  // Local state initialized from showcase
  const [accentColor, setAccentColor] = useState(showcase.accentColor || '#6366f1');
  const [privacyMeta, setPrivacyMeta] = useState(showcase.privacyMeta || ShowcasePrivacy.PUBLIC);
  const [privacyActivity, setPrivacyActivity] = useState(
    showcase.privacyActivity || ShowcasePrivacy.PUBLIC,
  );
  const [privacyShowcase, setPrivacyShowcase] = useState(
    showcase.privacyShowcase || ShowcasePrivacy.PUBLIC,
  );
  const [privacyLinks, setPrivacyLinks] = useState(showcase.privacyLinks || ShowcasePrivacy.PUBLIC);

  const [showAge, setShowAge] = useState(showcase.showAge ?? false);
  const [showBirthdate, setShowBirthdate] = useState(showcase.showBirthdate ?? true);
  const [showGender, setShowGender] = useState(showcase.showGender ?? true);
  const [showTimezone, setShowTimezone] = useState(showcase.showTimezone ?? true);
  const [pronouns, setPronouns] = useState(showcase.pronouns || '');
  const [timezone, setTimezone] = useState(showcase.timezone || 'UTC');

  const [connectedAccounts, setConnectedAccounts] = useState({
    github: showcase.connectedAccounts?.github || '',
    steam: showcase.connectedAccounts?.steam || '',
    spotify: showcase.connectedAccounts?.spotify || '',
    discord: showcase.connectedAccounts?.discord || '',
    twitch: showcase.connectedAccounts?.twitch || '',
  });

  const [spotlightMedia, setSpotlightMedia] = useState<SpotlightMediaDto | null>(
    showcase.spotlightMedia || null,
  );
  const [anthemTrack, setAnthemTrack] = useState<ProfileAnthemDto | null>(
    showcase.anthemTrack || null,
  );
  const [mediaItems, setMediaItems] = useState<ShowcaseMediaItemDto[]>(showcase.mediaItems || []);

  const [customTagInput, setCustomTagInput] = useState('');

  const updateMutation = useUpdateShowcase();

  const currentCategoryMedia = useMemo(() => {
    return mediaItems.filter((m) => m.type === selectedMediaType && m.isWishlist !== true);
  }, [mediaItems, selectedMediaType]);

  const currentCategoryWishlist = useMemo(() => {
    return mediaItems.filter((m) => m.type === selectedMediaType && m.isWishlist === true);
  }, [mediaItems, selectedMediaType]);

  if (!isOpen) return null;

  const handleAddMediaToCategory = (item: MediaSearchResultDto, isWishlist: boolean = false) => {
    const existing = mediaItems.filter(
      (m) => m.type === selectedMediaType && Boolean(m.isWishlist) === isWishlist,
    );
    if (existing.length >= 5) return;

    const newItem: ShowcaseMediaItemDto = {
      type: selectedMediaType,
      isWishlist,
      title: item.title,
      posterUrl: item.posterUrl,
      externalId: item.id,
      externalUrl: item.externalUrl,
      rating: item.rating,
      releaseYear: item.releaseYear,
      position: existing.length,
      tags: isWishlist ? ['⏳ Anticipated Release'] : [],
    };

    setMediaItems((prev) => [...prev, newItem]);
    setSearchQuery('');
  };

  const handleRemoveMediaItem = (
    title: string,
    type: ShowcaseMediaType,
    isWishlist: boolean = false,
  ) => {
    setMediaItems((prev) =>
      prev
        .filter(
          (m) => !(m.title === title && m.type === type && Boolean(m.isWishlist) === isWishlist),
        )
        .map((m, idx) => ({ ...m, position: idx })),
    );
  };

  const handleToggleWishlistTag = (itemTitle: string, tag: string) => {
    setMediaItems((prev) =>
      prev.map((m) => {
        if (m.title === itemTitle && m.isWishlist === true) {
          const currentTags = m.tags || [];
          const updated = currentTags.includes(tag)
            ? currentTags.filter((t) => t !== tag)
            : [...currentTags, tag].slice(0, 3);
          return { ...m, tags: updated };
        }
        return m;
      }),
    );
  };

  const handleUpdateWishlistComment = (itemTitle: string, comment: string) => {
    setMediaItems((prev) =>
      prev.map((m) => {
        if (m.title === itemTitle && m.isWishlist === true) {
          return { ...m, userComment: comment };
        }
        return m;
      }),
    );
  };

  const handleMoveMedia = (
    index: number,
    direction: 'up' | 'down',
    isWishlist: boolean = false,
  ) => {
    const list = isWishlist ? currentCategoryWishlist : currentCategoryMedia;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const items = [...list];
    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;

    // Re-assign positions
    const otherItems = mediaItems.filter(
      (m) => !(m.type === selectedMediaType && Boolean(m.isWishlist) === isWishlist),
    );
    const updatedCategory = items.map((m, pos) => ({ ...m, position: pos }));
    setMediaItems([...otherItems, ...updatedCategory]);
  };

  const handleSetSpotlight = (item: MediaSearchResultDto) => {
    setSpotlightMedia({
      title: item.title,
      posterUrl: item.posterUrl,
      type: selectedMediaType,
      rating: item.rating,
      externalUrl: item.externalUrl,
      subtitle: 'Favorite Title',
      tags: PRESET_TAGS[selectedMediaType]?.slice(0, 2) || [],
      customBannerUrl: null,
    });
    setSearchQuery('');
  };

  const handleToggleSpotlightTag = (tag: string) => {
    if (!spotlightMedia) return;
    const currentTags = spotlightMedia.tags || [];
    const updated = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag].slice(0, 5);

    setSpotlightMedia({ ...spotlightMedia, tags: updated });
  };

  const handleAddCustomSpotlightTag = () => {
    if (!spotlightMedia || !customTagInput.trim()) return;
    const clean = customTagInput.trim();
    const currentTags = spotlightMedia.tags || [];
    if (!currentTags.includes(clean)) {
      setSpotlightMedia({
        ...spotlightMedia,
        tags: [...currentTags, clean].slice(0, 5),
      });
    }
    setCustomTagInput('');
  };

  const handleSave = async () => {
    const payload: UpdateShowcaseDto = {
      accentColor,
      privacyMeta,
      privacyActivity,
      privacyShowcase,
      privacyLinks,
      showAge,
      showBirthdate,
      showGender,
      showTimezone,
      pronouns: pronouns.trim() || null,
      timezone,
      connectedAccounts: {
        github: connectedAccounts.github.trim() || null,
        steam: connectedAccounts.steam.trim() || null,
        spotify: connectedAccounts.spotify.trim() || null,
        discord: connectedAccounts.discord.trim() || null,
        twitch: connectedAccounts.twitch.trim() || null,
      },
      spotlightMedia,
      anthemTrack,
      mediaItems,
    };

    await updateMutation.mutateAsync(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-[#0e0e11] border border-white/[0.1] rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-white overflow-hidden"
        style={{
          boxShadow: `0 0 50px -10px ${accentColor}40`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-3 h-3 rounded-full shadow-[0_0_10px]"
              style={{ backgroundColor: accentColor, color: accentColor }}
            />
            <h3 className="text-lg font-bold text-white tracking-wide">
              Customize Profile Showcase
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'media'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Gamepad2 size={13} />
            <span>Top 5 Board</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wishlist')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'wishlist'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Bookmark size={13} className="text-indigo-400" />
            <span>Wishlist Backlog</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('anthem')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'anthem'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Music2 size={13} className="text-emerald-400" />
            <span>Profile Anthem</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('spotlight')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'spotlight'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Flame size={13} className="text-amber-400" />
            <span>Spotlight Hero</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('meta')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'meta'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles size={13} />
            <span>Personal Meta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'activity'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Globe size={13} />
            <span>Accounts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Lock size={13} />
            <span>Privacy</span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1">
          {/* PROFILE ANTHEM TAB */}
          {activeTab === 'anthem' && (
            <div className="flex flex-col gap-4">
              {anthemTrack ? (
                <div className="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Music2 size={14} /> Active Profile Anthem
                    </span>
                    <button
                      type="button"
                      onClick={() => setAnthemTrack(null)}
                      className="text-xs text-red-400 hover:underline cursor-pointer"
                    >
                      Remove Anthem
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md">
                      <img
                        src={anthemTrack.albumArt}
                        alt={anthemTrack.title}
                        className="w-full h-full object-cover"
                      />
                      {anthemTrack.previewUrl && (
                        <button
                          type="button"
                          onClick={() => toggleTrackPreview(anthemTrack.previewUrl)}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/60 transition-colors"
                        >
                          {previewTrackUrl === anthemTrack.previewUrl ? (
                            <Pause size={18} className="text-white fill-white" />
                          ) : (
                            <Play size={18} className="text-white fill-white ml-0.5" />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-bold text-white truncate">
                        {anthemTrack.title}
                      </span>
                      <span className="text-xs text-gray-400 truncate">{anthemTrack.artist}</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <SpotifyBrandIcon size={13} />
                        <span className="text-[10px] text-emerald-400 font-semibold">
                          Spotify Verified Track
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400 p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center">
                  No anthem selected. Search for any song below to pin it to your profile.
                </div>
              )}

              {/* Track Search Section */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-300">Search Song or Artist:</span>
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={trackSearchQuery}
                    onChange={(e) => setTrackSearchQuery(e.target.value)}
                    placeholder="Search Spotify / iTunes tracks (e.g. Starboy, After Dark)..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                  />
                </div>

                {/* Track Results List */}
                {trackResults.length > 0 && (
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                    {trackResults.map((track) => (
                      <div
                        key={`${track.title}-${track.artist}`}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10">
                            <img
                              src={track.albumArt}
                              alt={track.title}
                              crossOrigin="anonymous"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=80';
                              }}
                              className="w-full h-full object-cover"
                            />
                            {track.previewUrl && (
                              <button
                                type="button"
                                onClick={() => toggleTrackPreview(track.previewUrl)}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer hover:bg-black/60"
                              >
                                {previewTrackUrl === track.previewUrl ? (
                                  <Pause size={12} className="text-white fill-white" />
                                ) : (
                                  <Play size={12} className="text-white fill-white ml-0.5" />
                                )}
                              </button>
                            )}
                          </div>

                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-bold text-white truncate">
                              {track.title}
                            </span>
                            <span className="text-[11px] text-gray-400 truncate">
                              {track.artist}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setAnthemTrack(track);
                            if (previewAudioRef.current) {
                              previewAudioRef.current.pause();
                            }
                            setPreviewTrackUrl(null);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all cursor-pointer shrink-0"
                        >
                          Set Anthem
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WISHLIST BACKLOG TAB */}
          {activeTab === 'wishlist' && (
            <div className="flex flex-col gap-4">
              {/* Media Type Filter */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMediaType(ShowcaseMediaType.GAME)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedMediaType === ShowcaseMediaType.GAME
                      ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 shadow-sm'
                      : 'bg-white/[0.04] text-gray-400 hover:text-white'
                  }`}
                >
                  <Gamepad2 size={14} />
                  <span>Games</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMediaType(ShowcaseMediaType.ANIME)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedMediaType === ShowcaseMediaType.ANIME
                      ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 shadow-sm'
                      : 'bg-white/[0.04] text-gray-400 hover:text-white'
                  }`}
                >
                  <Tv size={14} />
                  <span>Anime</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMediaType(ShowcaseMediaType.MOVIE)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedMediaType === ShowcaseMediaType.MOVIE
                      ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 shadow-sm'
                      : 'bg-white/[0.04] text-gray-400 hover:text-white'
                  }`}
                >
                  <Film size={14} />
                  <span>Cinema</span>
                </button>
              </div>

              {/* Current Wishlist Items */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
                  <span>Planned Titles ({currentCategoryWishlist.length}/5):</span>
                </div>

                <div className="flex flex-col gap-2">
                  {currentCategoryWishlist.map((item, idx) => (
                    <div
                      key={item.title}
                      className="flex flex-col gap-2 p-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img
                            src={item.posterUrl}
                            alt={item.title}
                            crossOrigin="anonymous"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80';
                            }}
                            className="w-9 h-12 rounded-lg object-cover shrink-0"
                          />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-bold text-white truncate">
                              {item.title}
                            </span>
                            <input
                              type="text"
                              value={item.userComment || ''}
                              onChange={(e) =>
                                handleUpdateWishlistComment(item.title, e.target.value)
                              }
                              placeholder="Add note (e.g. Play on stream, Waiting for patch)..."
                              maxLength={100}
                              className="bg-transparent border-none text-[11px] text-gray-400 placeholder-gray-600 outline-none p-0"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveMedia(idx, 'up', true)}
                            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            <MoveUp size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === currentCategoryWishlist.length - 1}
                            onClick={() => handleMoveMedia(idx, 'down', true)}
                            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            <MoveDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMediaItem(item.title, item.type, true)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Expectation Tag Selector */}
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-white/[0.04]">
                        {WISHLIST_PRESET_TAGS.map((tag) => {
                          const isSelected = item.tags?.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleToggleWishlistTag(item.title, tag)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-200'
                                  : 'bg-white/[0.03] text-gray-400 hover:text-gray-200'
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {currentCategoryWishlist.length === 0 && (
                    <div className="text-xs text-gray-500 text-center py-4">
                      No backlog items in this category. Search below to add up to 5 titles.
                    </div>
                  )}
                </div>
              </div>

              {/* Search & Add Wishlist */}
              {currentCategoryWishlist.length < 5 && (
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${selectedMediaType.toLowerCase()} to add to wishlist...`}
                      className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                      {searchResults.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleAddMediaToCategory(item, true)}
                          className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] cursor-pointer transition-colors group"
                        >
                          <img
                            src={item.posterUrl}
                            alt={item.title}
                            crossOrigin="anonymous"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80';
                            }}
                            className="w-8 h-11 rounded-lg object-cover shrink-0"
                          />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-semibold text-gray-200 group-hover:text-white truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-gray-500 truncate">
                              {item.releaseYear || 'Title'}
                            </span>
                          </div>
                          <Plus size={14} className="text-indigo-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 1. TOP 5 SHOWCASE TAB */}
          {activeTab === 'media' && (
            <div className="flex flex-col gap-4">
              {/* Category Selector */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Select Category:
                </span>
                <div className="flex items-center gap-1">
                  {(
                    [
                      ShowcaseMediaType.GAME,
                      ShowcaseMediaType.ANIME,
                      ShowcaseMediaType.MOVIE,
                    ] as ShowcaseMediaType[]
                  ).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedMediaType(type)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedMediaType === type
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white/[0.04] text-gray-400 hover:text-white'
                      }`}
                    >
                      {type === ShowcaseMediaType.GAME
                        ? 'Games'
                        : type === ShowcaseMediaType.ANIME
                          ? 'Anime'
                          : 'Cinema'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Top 5 Slots */}
              <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300">
                    Selected Titles ({currentCategoryMedia.length}/5)
                  </span>
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  {currentCategoryMedia.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          crossOrigin="anonymous"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80';
                          }}
                          className="w-9 h-12 rounded-lg object-cover bg-black/40 shrink-0"
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-bold text-white truncate">
                            {item.title}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Slot #{idx + 1} {item.releaseYear ? `• ${item.releaseYear}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Make Spotlight, Reorder Buttons & Delete */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSpotlightMedia({
                              title: item.title,
                              posterUrl: item.posterUrl,
                              type: item.type,
                              rating: item.rating,
                              externalUrl: item.externalUrl,
                              subtitle: item.userComment || 'Favorite Title',
                              tags:
                                item.tags && item.tags.length > 0
                                  ? item.tags
                                  : PRESET_TAGS[item.type]?.slice(0, 2) || [],
                              customBannerUrl: null,
                            });
                            setActiveTab('spotlight');
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold transition-all cursor-pointer shadow-xs"
                          title="Set as Spotlight Title"
                        >
                          <Star size={11} className="fill-amber-400 text-amber-400" />
                          <span>Make Spotlight</span>
                        </button>

                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveMedia(idx, 'up')}
                          className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        >
                          <MoveUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === currentCategoryMedia.length - 1}
                          onClick={() => handleMoveMedia(idx, 'down')}
                          className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        >
                          <MoveDown size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveMediaItem(item.title, item.type)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {currentCategoryMedia.length === 0 && (
                    <div className="text-xs text-gray-500 text-center py-4">
                      No titles added yet. Search below to add up to 5 items.
                    </div>
                  )}
                </div>
              </div>

              {/* Search & Add Section */}
              {currentCategoryMedia.length < 5 && (
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${selectedMediaType.toLowerCase()} titles...`}
                      className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                      {searchResults.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleAddMediaToCategory(item)}
                          className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] cursor-pointer transition-colors group"
                        >
                          <img
                            src={item.posterUrl}
                            alt={item.title}
                            crossOrigin="anonymous"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80';
                            }}
                            className="w-8 h-11 rounded-lg object-cover shrink-0"
                          />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-semibold text-gray-200 group-hover:text-white truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-gray-500 truncate">
                              {item.releaseYear || 'Title'}
                            </span>
                          </div>
                          <Plus size={14} className="text-indigo-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. SPOTLIGHT HERO TAB */}
          {activeTab === 'spotlight' && (
            <div className="flex flex-col gap-4">
              {spotlightMedia ? (
                <div className="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Flame size={14} /> Active Spotlight Card
                    </span>
                    <button
                      type="button"
                      onClick={() => setSpotlightMedia(null)}
                      className="text-xs text-red-400 hover:underline cursor-pointer"
                    >
                      Remove Spotlight
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={spotlightMedia.customBannerUrl || spotlightMedia.posterUrl}
                      alt={spotlightMedia.title}
                      crossOrigin="anonymous"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80';
                      }}
                      className="w-16 h-20 rounded-xl object-cover shrink-0 border border-white/10"
                    />
                    <div className="flex flex-col min-w-0 flex-1 gap-1.5">
                      <span className="text-sm font-bold text-white truncate">
                        {spotlightMedia.title}
                      </span>
                      <input
                        type="text"
                        value={spotlightMedia.subtitle || ''}
                        onChange={(e) =>
                          setSpotlightMedia({
                            ...spotlightMedia,
                            subtitle: e.target.value,
                          })
                        }
                        placeholder="Custom subtitle / role (e.g. Pos 1 Carry)"
                        maxLength={60}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                      />
                      <input
                        type="url"
                        value={spotlightMedia.customBannerUrl || ''}
                        onChange={(e) =>
                          setSpotlightMedia({
                            ...spotlightMedia,
                            customBannerUrl: e.target.value.trim() || null,
                          })
                        }
                        placeholder="Custom cover art / GIF (URL)..."
                        className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1 text-[11px] text-gray-200 outline-none placeholder-gray-500"
                      />
                    </div>
                  </div>

                  {/* Preset Tag Chips */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.06]">
                    <span className="text-[11px] font-semibold text-gray-400">
                      Preset & Custom Tags (max 5):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(PRESET_TAGS[spotlightMedia.type] || PRESET_TAGS.GAME).map((tag) => {
                        const isSelected = spotlightMedia.tags?.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleToggleSpotlightTag(tag)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                                : 'bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Tag Input */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="text"
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSpotlightTag()}
                        placeholder="Add custom tag (e.g. 2000+ hours)..."
                        maxLength={20}
                        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomSpotlightTag}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-bold cursor-pointer"
                      >
                        Add Tag
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <span className="text-xs text-gray-400">
                    Search and pick a main title for your Spotlight hero card:
                  </span>
                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search title to spotlight..."
                      className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto custom-scrollbar p-1">
                      {searchResults.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSetSpotlight(item)}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] cursor-pointer group"
                        >
                          <img
                            src={item.posterUrl}
                            alt={item.title}
                            className="w-10 h-12 rounded-lg object-cover shrink-0"
                          />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-bold text-white group-hover:text-amber-300 truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-gray-500 truncate">
                              {item.releaseYear || 'Title'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. PERSONAL META TAB */}
          {activeTab === 'meta' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                  <div>
                    <span className="text-xs font-bold text-white block">Show Birthdate</span>
                    <span className="text-[10px] text-gray-500">Displays birth day & month</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showBirthdate}
                    onChange={(e) => setShowBirthdate(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                  <div>
                    <span className="text-xs font-bold text-white block">Show Age</span>
                    <span className="text-[10px] text-gray-500">Calculates age in years</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showAge}
                    onChange={(e) => setShowAge(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                  <div>
                    <span className="text-xs font-bold text-white block">Show Gender</span>
                    <span className="text-[10px] text-gray-500">Registration gender tag</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showGender}
                    onChange={(e) => setShowGender(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                  <div>
                    <span className="text-xs font-bold text-white block">Show Local Clock</span>
                    <span className="text-[10px] text-gray-500">Live ticking timezone time</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showTimezone}
                    onChange={(e) => setShowTimezone(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Custom Pronouns (e.g. they/them, he/him):
                </label>
                <input
                  type="text"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  maxLength={20}
                  placeholder="he/him"
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-300">Timezone Region:</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="bg-[#18181b] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 4. ACTIVITY & ACCOUNTS TAB */}
          {activeTab === 'activity' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Connected User Handles:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-gray-400">Steam ID / Username:</label>
                  <input
                    type="text"
                    value={connectedAccounts.steam}
                    onChange={(e) =>
                      setConnectedAccounts({ ...connectedAccounts, steam: e.target.value })
                    }
                    placeholder="Steam username"
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-gray-400">Spotify Username:</label>
                  <input
                    type="text"
                    value={connectedAccounts.spotify}
                    onChange={(e) =>
                      setConnectedAccounts({ ...connectedAccounts, spotify: e.target.value })
                    }
                    placeholder="Spotify username"
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-gray-400">Discord Handle:</label>
                  <input
                    type="text"
                    value={connectedAccounts.discord}
                    onChange={(e) =>
                      setConnectedAccounts({ ...connectedAccounts, discord: e.target.value })
                    }
                    placeholder="username#0001"
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-gray-400">Twitch Channel:</label>
                  <input
                    type="text"
                    value={connectedAccounts.twitch}
                    onChange={(e) =>
                      setConnectedAccounts({ ...connectedAccounts, twitch: e.target.value })
                    }
                    placeholder="twitch_channel"
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. PRIVACY & THEME TAB */}
          {activeTab === 'privacy' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-300">Accent Glow Theme Color:</label>
                <div className="flex items-center gap-2">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAccentColor(color)}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                      style={{
                        backgroundColor: color,
                        boxShadow: accentColor === color ? `0 0 12px ${color}` : 'none',
                        border: accentColor === color ? '2px solid white' : 'none',
                      }}
                    >
                      {accentColor === color && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular 3-tier Privacy Dropdowns */}
              <div className="flex flex-col gap-2.5 pt-3 border-t border-white/[0.06]">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Granular Privacy Tiers:
                </span>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-xs text-gray-200">Personal Meta Visibility</span>
                  <select
                    value={privacyMeta}
                    onChange={(e) => setPrivacyMeta(e.target.value as ShowcasePrivacy)}
                    className="bg-[#18181b] border border-white/[0.1] rounded-lg px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value={ShowcasePrivacy.PUBLIC}>Public (Everyone)</option>
                    <option value={ShowcasePrivacy.FOLLOWERS}>Followers Only</option>
                    <option value={ShowcasePrivacy.PRIVATE}>Only Me</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-xs text-gray-200">Activity & Live Presence</span>
                  <select
                    value={privacyActivity}
                    onChange={(e) => setPrivacyActivity(e.target.value as ShowcasePrivacy)}
                    className="bg-[#18181b] border border-white/[0.1] rounded-lg px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value={ShowcasePrivacy.PUBLIC}>Public (Everyone)</option>
                    <option value={ShowcasePrivacy.FOLLOWERS}>Followers Only</option>
                    <option value={ShowcasePrivacy.PRIVATE}>Only Me</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-xs text-gray-200">Showcase & Spotlight Grid</span>
                  <select
                    value={privacyShowcase}
                    onChange={(e) => setPrivacyShowcase(e.target.value as ShowcasePrivacy)}
                    className="bg-[#18181b] border border-white/[0.1] rounded-lg px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value={ShowcasePrivacy.PUBLIC}>Public (Everyone)</option>
                    <option value={ShowcasePrivacy.FOLLOWERS}>Followers Only</option>
                    <option value={ShowcasePrivacy.PRIVATE}>Only Me</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-xs text-gray-200">Connected Accounts Strip</span>
                  <select
                    value={privacyLinks}
                    onChange={(e) => setPrivacyLinks(e.target.value as ShowcasePrivacy)}
                    className="bg-[#18181b] border border-white/[0.1] rounded-lg px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value={ShowcasePrivacy.PUBLIC}>Public (Everyone)</option>
                    <option value={ShowcasePrivacy.FOLLOWERS}>Followers Only</option>
                    <option value={ShowcasePrivacy.PRIVATE}>Only Me</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-6 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-lg hover:scale-105 cursor-pointer flex items-center gap-1.5"
            style={{ backgroundColor: accentColor }}
          >
            <Check size={14} />
            <span>Save Showcase</span>
          </button>
        </div>
      </div>
    </div>
  );
};
