import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Link as LinkIcon,
  Loader2,
  Cloud,
  Heart,
  MapPin,
  Home,
  Briefcase,
  GraduationCap,
  Languages,
  Calendar,
  UserCheck,
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
  type FamilyMemberDto,
  type PersonalInfoTogglesDto,
} from '@backend/common/contracts';
import {
  getLanguageFlag,
  POPULAR_LANGUAGES,
  FAMILY_ROLES,
  WORKPLACE_STATUSES,
  EDUCATION_STATUSES,
  RELATIONSHIP_CONFIG,
  formatRelationshipDuration,
} from '@/entities/showcase/lib/personalInfoUtils';
import { apiClient as api } from '@/shared/api/httpClient';
import {
  useMediaSearch,
  useTrackSearch,
  useUpdateShowcase,
} from '@/entities/showcase/model/useShowcase';
import { useDebounce } from '@/shared/lib/useDebounce';
import { audioCoordinator } from '@/shared/lib/audioCoordinator';
import { SpotifyBrandIcon, SoundCloudBrandIcon } from '@/shared/ui/BrandIcons';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import {
  extractSpotifyTrackId,
  unescapeHtml,
  getSafeSpotifyTrackUrl,
  sanitizeImageUrl,
  isTrustedMessageOrigin,
} from '@/shared/lib/spotifyUrl';
import { useUIStore } from '@/shared/model/useUIStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useQueryClient } from '@tanstack/react-query';
import { USER_KEY } from '@/shared/api/queryKeys';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';
import { userApi } from '@/entities/profile/api/userApi';
import {
  ConfigureIntegrationModal,
  PLATFORMS_LIST,
  type PlatformConfig,
} from '@/features/profile/ui/integrations/ConfigureIntegrationModal';
import { UnlinkConfirmationModal } from '@/features/profile/ui/integrations/UnlinkConfirmationModal';
import { MarqueeText } from '@/shared/ui/MarqueeText';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';

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

interface DiscordToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

const DiscordToggle: React.FC<DiscordToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled,
}) => {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-center justify-between p-3 rounded-2xl bg-[#1e1f22]/70 hover:bg-[#1e1f22] border border-white/[0.06] transition-all cursor-pointer select-none group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <div className="flex flex-col pr-3 min-w-0">
        <span className="text-xs font-semibold text-white group-hover:text-gray-100 transition-colors">
          {label}
        </span>
        {description && (
          <span className="text-[10px] text-gray-400 group-hover:text-gray-300 transition-colors">
            {description}
          </span>
        )}
      </div>
      <div
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.4)]' : 'bg-[#4e5058]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  );
};

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

  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (initialMediaType) setSelectedMediaType(initialMediaType);
    }
  }, [isOpen, initialTab, initialMediaType]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [trackSearchQuery, setTrackSearchQuery] = useState('');
  const debouncedTrackSearch = useDebounce(trackSearchQuery, 250);

  const { data: searchResults = [], isFetching: isSearching } = useMediaSearch(
    debouncedSearch,
    selectedMediaType,
  );

  const { data: trackResults = [], isFetching: isSearchingTracks } =
    useTrackSearch(debouncedTrackSearch);

  const isTrackSearchActive = trackSearchQuery.trim().length > 0;
  const isTrackDebouncing = trackSearchQuery.trim() !== debouncedTrackSearch.trim();
  const isTrackSearchPending = isSearchingTracks || isTrackDebouncing;

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

  const [showAge, setShowAge] = useState(showcase.showAge === true);
  const [showBirthdate, setShowBirthdate] = useState(showcase.showBirthdate === true);
  const [showGender, setShowGender] = useState(showcase.showGender === true);
  const [showTimezone, setShowTimezone] = useState(showcase.showTimezone === true);
  const [showZodiac, setShowZodiac] = useState(
    showcase.showZodiac === true || showcase.personalInfo?.toggles?.showZodiac === true,
  );
  const [pronouns, setPronouns] = useState(showcase.pronouns || '');
  const [timezone, setTimezone] = useState(showcase.timezone || 'UTC');

  // Fine-grained toggles for personal info
  const pInfoToggles = showcase.personalInfo?.toggles || {};
  const [showRelationship, setShowRelationship] = useState(pInfoToggles.showRelationship === true);
  const [showLivesIn, setShowLivesIn] = useState(pInfoToggles.showLivesIn === true);
  const [showHometown, setShowHometown] = useState(pInfoToggles.showHometown === true);
  const [showWorkplace, setShowWorkplace] = useState(pInfoToggles.showWorkplace === true);
  const [showEducation, setShowEducation] = useState(pInfoToggles.showEducation === true);
  const [showLanguages, setShowLanguages] = useState(pInfoToggles.showLanguages === true);
  const [showFamily, setShowFamily] = useState(pInfoToggles.showFamily === true);
  const [showPronouns, setShowPronouns] = useState(pInfoToggles.showPronouns === true);

  // Personal Information (Facebook-style)
  const [relationshipStatus, setRelationshipStatus] = useState<string>(
    showcase.personalInfo?.relationshipStatus || '',
  );
  const [partner, setPartner] = useState<string>(showcase.personalInfo?.partner || '');
  const [partnerUserId, setPartnerUserId] = useState<string | null>(
    showcase.personalInfo?.partnerUserId || null,
  );
  const [relationshipSince, setRelationshipSince] = useState<string>(
    showcase.personalInfo?.relationshipSince || '',
  );
  const [livesIn, setLivesIn] = useState<string>(showcase.personalInfo?.livesIn || '');
  const [hometown, setHometown] = useState<string>(showcase.personalInfo?.hometown || '');
  const [workplace, setWorkplace] = useState<string>(showcase.personalInfo?.workplace || '');
  const [workplaceRole, setWorkplaceRole] = useState<string>(
    showcase.personalInfo?.workplaceRole || '',
  );
  const [workplaceStatus, setWorkplaceStatus] = useState<string>(
    showcase.personalInfo?.workplaceStatus || 'Employed',
  );
  const [education, setEducation] = useState<string>(showcase.personalInfo?.education || '');
  const [educationStatus, setEducationStatus] = useState<string>(
    showcase.personalInfo?.educationStatus || "Student '28",
  );

  // Languages list (up to 10)
  const initialLanguages = useMemo(() => {
    const raw = showcase.personalInfo?.languages;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim()) {
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }, [showcase.personalInfo?.languages]);
  const [languagesList, setLanguagesList] = useState<string[]>(initialLanguages);
  const [newLanguageInput, setNewLanguageInput] = useState('');

  // Family members list
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberDto[]>(
    showcase.personalInfo?.familyMembers || [],
  );
  const [isAddingFamily, setIsAddingFamily] = useState(false);
  const [familySearchQuery, setFamilySearchQuery] = useState('');
  const [familyRole, setFamilyRole] = useState<string>('Brother');
  const [familyCustomName, setFamilyCustomName] = useState('');
  const [familyUserSuggestions, setFamilyUserSuggestions] = useState<any[]>([]);
  const [isFamilySearching, setIsFamilySearching] = useState(false);

  const { openEditProfile } = useUIStore();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  // Gender selection
  const rawGender =
    showcase.personalInfo?.gender || showcase.gender || currentUser?.gender || 'Male';
  const [gender, setGender] = useState<string>(
    ['Male', 'Female'].includes(rawGender) ? rawGender : 'Custom',
  );
  const [customGenderInput, setCustomGenderInput] = useState<string>(
    !['Male', 'Female'].includes(rawGender) ? rawGender : '',
  );

  const [activePlatformModal, setActivePlatformModal] = useState<PlatformConfig | null>(null);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<{ id: string; name: string } | null>(null);

  const tabsNavRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Isolate horizontal wheel scroll on tabs from background scroll
  useEffect(() => {
    const el = tabsNavRef.current;
    if (!el || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        e.stopPropagation();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen]);

  // Real-time OAuth popup listener
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (!isTrustedMessageOrigin(event.origin)) return;
      if (event.data?.type === 'INTEGRATION_AUTH_SUCCESS') {
        queryClient.invalidateQueries({ queryKey: [USER_KEY] });
        queryClient.invalidateQueries({ queryKey: ['showcase'] });
        queryClient.invalidateQueries({ queryKey: ['user'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [queryClient]);

  const handleOpenPlatformModal = (platform: PlatformConfig) => {
    setActivePlatformModal(platform);
    setIsPlatformModalOpen(true);
  };

  const handleUnlinkPlatform = async (platformId: string) => {
    try {
      if (platformId === 'github' && currentUser?.githubUsername) {
        await userApi.unlinkGithub();
      }
      await integrationsApi.unlink(platformId);
      queryClient.invalidateQueries({ queryKey: [USER_KEY] });
      queryClient.invalidateQueries({ queryKey: ['showcase'] });
    } catch (err) {
      console.error('Failed to unlink integration', err);
    }
  };

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

  const gamesCount = useMemo(
    () => mediaItems.filter((m) => m.type === ShowcaseMediaType.GAME && !m.isWishlist).length,
    [mediaItems],
  );
  const animeCount = useMemo(
    () => mediaItems.filter((m) => m.type === ShowcaseMediaType.ANIME && !m.isWishlist).length,
    [mediaItems],
  );
  const cinemaCount = useMemo(
    () =>
      mediaItems.filter(
        (m) =>
          (m.type === ShowcaseMediaType.MOVIE || m.type === ShowcaseMediaType.SERIES) &&
          !m.isWishlist,
      ).length,
    [mediaItems],
  );

  const availableItems = useMemo(() => {
    const selectedTitles = new Set(currentCategoryMedia.map((m) => m.title.toLowerCase().trim()));
    const selectedIds = new Set(currentCategoryMedia.map((m) => m.externalId).filter(Boolean));
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isBleachSelected = currentCategoryMedia.some((m) =>
      m.title.toLowerCase().includes('bleach'),
    );

    const seen = new Set<string>();
    const list: MediaSearchResultDto[] = [];

    for (const item of searchResults) {
      const itemLower = item.title.toLowerCase().trim();
      const norm = normalize(item.title);

      // Exclude if already selected in the 5 slots
      if (selectedTitles.has(itemLower)) continue;
      if (item.id && selectedIds.has(item.id)) continue;
      if (currentCategoryMedia.some((m) => normalize(m.title) === norm)) continue;
      if (isBleachSelected && norm.includes('bleach')) continue;

      // Deduplicate inside catalog list
      if (seen.has(norm)) continue;
      if (norm.includes('bleach') && Array.from(seen).some((s) => s.includes('bleach'))) continue;

      seen.add(norm);
      list.push(item);
    }
    return list;
  }, [searchResults, currentCategoryMedia]);

  const availableWishlistItems = useMemo(() => {
    const selectedTitles = new Set(
      currentCategoryWishlist.map((m) => m.title.toLowerCase().trim()),
    );
    const selectedIds = new Set(currentCategoryWishlist.map((m) => m.externalId).filter(Boolean));
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const seen = new Set<string>();
    const list: MediaSearchResultDto[] = [];

    for (const item of searchResults) {
      const itemLower = item.title.toLowerCase().trim();
      const norm = normalize(item.title);

      if (selectedTitles.has(itemLower)) continue;
      if (item.id && selectedIds.has(item.id)) continue;
      if (currentCategoryWishlist.some((m) => normalize(m.title) === norm)) continue;

      if (seen.has(norm)) continue;
      seen.add(norm);
      list.push(item);
    }
    return list;
  }, [searchResults, currentCategoryWishlist]);

  const globalSpotifyTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isGlobalSpotifyPlaying = useSpotifyPlayerStore((s) => s.isPlaying);

  const isAnthemSoundCloud = Boolean(
    (anthemTrack as any)?.source === 'soundcloud' ||
    (anthemTrack as any)?.id?.startsWith('sc-') ||
    (anthemTrack as any)?.trackId?.startsWith('sc-'),
  );

  const safeAnthemTrackId = anthemTrack
    ? isAnthemSoundCloud
      ? anthemTrack.id || (anthemTrack as any).trackId
      : extractSpotifyTrackId(anthemTrack) || anthemTrack.id || (anthemTrack as any).trackId
    : null;

  const isAnthemTrackMatch = Boolean(
    anthemTrack &&
    globalSpotifyTrack &&
    ((safeAnthemTrackId && globalSpotifyTrack.id === safeAnthemTrackId) ||
      (globalSpotifyTrack.spotifyUrl &&
        anthemTrack.spotifyUrl &&
        globalSpotifyTrack.spotifyUrl === anthemTrack.spotifyUrl) ||
      (globalSpotifyTrack.title.toLowerCase() === unescapeHtml(anthemTrack.title).toLowerCase() &&
        globalSpotifyTrack.artist.toLowerCase() ===
          unescapeHtml(anthemTrack.artist).toLowerCase())),
  );
  const isAnthemPlaying = isGlobalSpotifyPlaying && isAnthemTrackMatch;

  const handleToggleAnthemPlay = () => {
    if (!anthemTrack) return;
    if (isAnthemPlaying) {
      useSpotifyPlayerStore.getState().pause();
    } else if (isAnthemTrackMatch && !isGlobalSpotifyPlaying) {
      useSpotifyPlayerStore.getState().resume();
    } else {
      useSpotifyPlayerStore.getState().playTrack({
        id: safeAnthemTrackId || `track-${Date.now()}`,
        title: unescapeHtml(anthemTrack.title),
        artist: unescapeHtml(anthemTrack.artist),
        albumArt: anthemTrack.albumArt,
        durationMs: (anthemTrack as any).durationMs || 180000,
        previewUrl: anthemTrack.previewUrl || null,
        spotifyUrl:
          anthemTrack.spotifyUrl ||
          (isAnthemSoundCloud ? 'https://soundcloud.com' : getSafeSpotifyTrackUrl(anthemTrack)),
        contextName: 'Profile Anthem',
        source: isAnthemSoundCloud ? 'soundcloud' : 'spotify',
        streamUrl: (anthemTrack as any).streamUrl,
      });
    }
  };

  const isSearchResultMatch = (t: any) => {
    const isSC =
      t.source === 'soundcloud' || t.id?.startsWith('sc-') || t.trackId?.startsWith('sc-');
    const safeId = isSC ? t.id || t.trackId : extractSpotifyTrackId(t) || t.id || t.trackId;
    return Boolean(
      globalSpotifyTrack &&
      ((safeId && globalSpotifyTrack.id === safeId) ||
        (globalSpotifyTrack.title.toLowerCase() === unescapeHtml(t.title).toLowerCase() &&
          globalSpotifyTrack.artist.toLowerCase() === unescapeHtml(t.artist).toLowerCase())),
    );
  };

  const isSearchResultPlaying = (t: any) => isGlobalSpotifyPlaying && isSearchResultMatch(t);

  const handleToggleResultPlay = (t: any) => {
    const isSC =
      t.source === 'soundcloud' || t.id?.startsWith('sc-') || t.trackId?.startsWith('sc-');
    const safeId = isSC ? t.id || t.trackId : extractSpotifyTrackId(t) || t.id || t.trackId;
    if (isSearchResultPlaying(t)) {
      useSpotifyPlayerStore.getState().pause();
    } else if (isSearchResultMatch(t) && !isGlobalSpotifyPlaying) {
      useSpotifyPlayerStore.getState().resume();
    } else {
      useSpotifyPlayerStore.getState().playTrack({
        id: safeId || `track-${Date.now()}`,
        title: unescapeHtml(t.title),
        artist: unescapeHtml(t.artist),
        albumArt: t.albumArt,
        durationMs: t.durationMs || 180000,
        previewUrl: t.previewUrl || null,
        spotifyUrl: t.spotifyUrl || (isSC ? 'https://soundcloud.com' : getSafeSpotifyTrackUrl(t)),
        contextName: 'Showcase Search',
        source: isSC ? 'soundcloud' : 'spotify',
        streamUrl: t.streamUrl,
      });
    }
  };

  if (!isOpen) return null;

  const handleAddMediaToCategory = (item: MediaSearchResultDto, isWishlist: boolean = false) => {
    const existing = mediaItems.filter(
      (m) => m.type === selectedMediaType && Boolean(m.isWishlist) === isWishlist,
    );
    if (existing.length >= 5) return;
    if (existing.some((m) => m.title.toLowerCase() === item.title.toLowerCase())) return;

    const cleanExternalUrl =
      item.externalUrl && item.externalUrl.trim().startsWith('http')
        ? item.externalUrl.trim()
        : null;

    const newItem: ShowcaseMediaItemDto = {
      type: selectedMediaType,
      isWishlist,
      title: item.title,
      posterUrl: item.posterUrl,
      externalId: item.id,
      externalUrl: cleanExternalUrl,
      rating: item.rating,
      releaseYear: item.releaseYear,
      position: existing.length,
      tags: isWishlist ? ['⏳ Anticipated Release'] : [],
    };

    setMediaItems((prev) => [...prev, newItem]);
  };

  const handleRemoveMediaItem = (
    title: string,
    type: ShowcaseMediaType,
    isWishlist: boolean = false,
  ) => {
    setMediaItems((prev) => {
      const otherItems = prev.filter(
        (m) => !(m.type === type && Boolean(m.isWishlist) === isWishlist),
      );
      const remainingCategoryItems = prev
        .filter((m) => m.type === type && Boolean(m.isWishlist) === isWishlist && m.title !== title)
        .map((m, idx) => ({ ...m, position: idx }));
      return [...otherItems, ...remainingCategoryItems];
    });
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

  const debouncedFamilySearch = useDebounce(familySearchQuery, 300);

  useEffect(() => {
    let cancelled = false;
    const clean = debouncedFamilySearch.trim().replace(/^@+/, '');
    if (!clean) {
      setFamilyUserSuggestions([]);
      setIsFamilySearching(false);
      return;
    }

    setIsFamilySearching(true);
    api
      .get('/users/mention-suggestions', { params: { q: clean } })
      .then((res) => {
        if (!cancelled) {
          const list = Array.isArray(res.data) ? res.data : [];
          setFamilyUserSuggestions(list.slice(0, 6));
        }
      })
      .catch(() => {
        if (!cancelled) setFamilyUserSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setIsFamilySearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedFamilySearch]);

  const handleAddLanguage = (lang: string) => {
    const clean = lang.trim();
    if (!clean || languagesList.length >= 10) return;
    if (!languagesList.some((l) => l.toLowerCase() === clean.toLowerCase())) {
      setLanguagesList((prev) => [...prev, clean].slice(0, 10));
    }
    setNewLanguageInput('');
  };

  const handleRemoveLanguage = (lang: string) => {
    setLanguagesList((prev) => prev.filter((l) => l !== lang));
  };

  const handleAddFamilyMember = (user?: any) => {
    const name = user ? user.displayName || user.username : familyCustomName.trim();
    if (!name) return;
    const newMember: FamilyMemberDto = {
      id: `fam-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: user?.id || null,
      username: user?.username || null,
      name,
      avatarUrl: user?.avatarUrl || user?.avatar || null,
      role: familyRole,
      isConfirmed: user ? user.id === currentUser?.id : true,
    };
    setFamilyMembers((prev) => [...prev, newMember]);
    setFamilySearchQuery('');
    setFamilyCustomName('');
    setFamilyUserSuggestions([]);
    setIsAddingFamily(false);
  };

  const handleRemoveFamilyMember = (id: string) => {
    setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSave = async () => {
    let targetWidgetOrder =
      showcase.widgetOrder && showcase.widgetOrder.length > 0
        ? [...showcase.widgetOrder]
        : ['spotlight', 'media', 'meta'];

    if (spotlightMedia && !targetWidgetOrder.includes('spotlight')) {
      targetWidgetOrder = ['spotlight', ...targetWidgetOrder];
    }
    if (mediaItems.some((m) => !m.isWishlist) && !targetWidgetOrder.includes('media')) {
      targetWidgetOrder = [...targetWidgetOrder, 'media'];
    }
    const resolvedGender = gender === 'Custom' ? customGenderInput.trim() || 'Custom' : gender;
    const hasPersonalDetails = Boolean(
      relationshipStatus ||
      partner.trim() ||
      livesIn.trim() ||
      hometown.trim() ||
      workplace.trim() ||
      education.trim() ||
      languagesList.length > 0 ||
      familyMembers.length > 0,
    );

    if (
      (pronouns.trim() ||
        showBirthdate ||
        showAge ||
        showGender ||
        showTimezone ||
        hasPersonalDetails) &&
      !targetWidgetOrder.includes('meta')
    ) {
      targetWidgetOrder = [...targetWidgetOrder, 'meta'];
    }

    // Normalize positions strictly per category (0..4) and sanitize URLs
    const categoryPositions: Record<string, number> = {};
    const normalizedMediaItems = mediaItems.map((item) => {
      const groupKey = `${item.type}:${Boolean(item.isWishlist)}`;
      const pos = categoryPositions[groupKey] ?? 0;
      categoryPositions[groupKey] = pos + 1;
      return {
        ...item,
        position: pos,
        externalUrl:
          item.externalUrl && item.externalUrl.trim().startsWith('http')
            ? item.externalUrl.trim()
            : null,
      };
    });

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
      showZodiac,
      pronouns: pronouns.trim() || null,
      timezone,
      personalInfo: {
        relationshipStatus: relationshipStatus || null,
        partner: partner.trim() || null,
        partnerUserId: partnerUserId || null,
        relationshipSince: relationshipSince || null,
        livesIn: livesIn.trim() || null,
        hometown: hometown.trim() || null,
        workplace: workplace.trim() || null,
        workplaceRole: workplaceRole.trim() || null,
        workplaceStatus: workplace.trim() ? workplaceStatus : null,
        education: education.trim() || null,
        educationStatus: education.trim() ? educationStatus : null,
        languages: languagesList,
        familyMembers,
        gender: resolvedGender,
        toggles: {
          showRelationship,
          showLivesIn,
          showHometown,
          showWorkplace,
          showEducation,
          showLanguages,
          showFamily,
          showZodiac,
          showPronouns,
        },
      },
      connectedAccounts: {
        ...((showcase.connectedAccounts as Record<string, any> | undefined) || {}),
      },
      spotlightMedia,
      anthemTrack: anthemTrack
        ? {
            ...anthemTrack,
            id:
              extractSpotifyTrackId(anthemTrack) || anthemTrack.id || (anthemTrack as any).trackId,
            trackId:
              extractSpotifyTrackId(anthemTrack) || (anthemTrack as any).trackId || anthemTrack.id,
            title: unescapeHtml(anthemTrack.title),
            artist: unescapeHtml(anthemTrack.artist),
            spotifyUrl: anthemTrack.spotifyUrl || getSafeSpotifyTrackUrl(anthemTrack),
          }
        : null,
      mediaItems: normalizedMediaItems,
      widgetOrder: targetWidgetOrder,
    };

    try {
      await updateMutation.mutateAsync(payload);
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}`,
        conversationId: '',
        messageId: '',
        title: 'Showcase Updated',
        body: 'Your profile showcase has been saved successfully.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to save showcase', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to save showcase';
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}`,
        conversationId: '',
        messageId: '',
        title: 'Save Failed',
        body: Array.isArray(errorMsg) ? errorMsg.join(', ') : String(errorMsg),
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn overscroll-contain">
      <div
        className="relative w-full max-w-5xl h-[88vh] max-h-[860px] bg-[#111214] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white overflow-hidden overscroll-contain"
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
        <div
          ref={tabsNavRef}
          className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto tabs-scrollbar shrink-0 pb-1.5 overscroll-contain"
        >
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
            <span>Favorite</span>
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
            <span>Personal Information</span>
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
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md group/cover">
                      <img
                        src={sanitizeImageUrl(anthemTrack.albumArt)}
                        alt={anthemTrack.title}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleToggleAnthemPlay}
                        className={`absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer transition-opacity ${
                          isAnthemPlaying
                            ? 'opacity-100'
                            : 'opacity-0 group-hover/cover:opacity-100'
                        }`}
                        title={isAnthemPlaying ? 'Pause' : 'Listen in Liquid Dock'}
                      >
                        {isAnthemPlaying ? (
                          <Pause size={18} className="text-white fill-white" />
                        ) : (
                          <Play size={18} className="text-white fill-white ml-0.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-bold text-white truncate">
                        {unescapeHtml(anthemTrack.title)}
                      </span>
                      <span className="text-xs text-gray-400 truncate">
                        {unescapeHtml(anthemTrack.artist)}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        {isAnthemSoundCloud ? (
                          <>
                            <SoundCloudBrandIcon size={14} />
                            <span className="text-[10px] text-orange-400 font-semibold">
                              SoundCloud Verified Track
                            </span>
                          </>
                        ) : (
                          <>
                            <SpotifyBrandIcon size={13} />
                            <span className="text-[10px] text-emerald-400 font-semibold">
                              Spotify Verified Track
                            </span>
                          </>
                        )}
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
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-300">
                    Search on Spotify & SoundCloud:
                  </span>
                  {isTrackSearchActive && isTrackSearchPending && (
                    <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1">
                      <Loader2 size={11} className="animate-spin text-emerald-400" />
                      <span>Searching...</span>
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={trackSearchQuery}
                    onChange={(e) => setTrackSearchQuery(e.target.value)}
                    placeholder="Search tracks on Spotify & SoundCloud..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500 rounded-xl pl-9 pr-14 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {isTrackSearchPending && (
                      <Loader2 size={13} className="animate-spin text-emerald-400" />
                    )}
                    {trackSearchQuery.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setTrackSearchQuery('')}
                        className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                        title="Clear search"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtitle / Header for the Results Section */}
                <div className="flex items-center justify-between pt-0.5">
                  {isTrackSearchActive ? (
                    <span className="text-[11px] font-semibold text-gray-400 truncate">
                      Results for &ldquo;{trackSearchQuery}&rdquo;:
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-300">
                      <Flame size={13} className="text-amber-400 fill-amber-400" />
                      <span>Top 10 Most Streamed Tracks:</span>
                    </div>
                  )}
                  {isTrackSearchActive && (
                    <span className="text-[10px] text-gray-500 shrink-0">
                      {trackResults.length} tracks
                    </span>
                  )}
                </div>

                {/* Results List */}
                {isTrackSearchActive && isTrackSearchPending && trackResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center gap-2">
                    <Loader2 size={18} className="animate-spin text-emerald-400" />
                    <span className="text-xs text-gray-300">Searching tracks in catalog...</span>
                    <span className="text-[11px] text-gray-500">
                      Loading songs from Spotify & SoundCloud
                    </span>
                  </div>
                ) : isTrackSearchActive && !isTrackSearchPending && trackResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-7 px-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center gap-1">
                    <span className="text-xs font-semibold text-gray-300">
                      No tracks found in catalog
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Try entering a different song title, artist name, or track URL
                    </span>
                  </div>
                ) : !isTrackSearchActive && isSearchingTracks && trackResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center gap-2">
                    <Loader2 size={18} className="animate-spin text-emerald-400" />
                    <span className="text-xs text-gray-300">Loading Top 10 tracks...</span>
                  </div>
                ) : trackResults.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                    {trackResults.map((track, idx) => {
                      const isPlaying = isSearchResultPlaying(track);
                      const isTopTen = !isTrackSearchActive;
                      const isSelected = Boolean(
                        anthemTrack &&
                        ((anthemTrack.id &&
                          (anthemTrack.id === track.id ||
                            anthemTrack.id === (track as any).trackId)) ||
                          (anthemTrack.spotifyUrl &&
                            track.spotifyUrl &&
                            anthemTrack.spotifyUrl === track.spotifyUrl) ||
                          (anthemTrack.title.toLowerCase() === track.title.toLowerCase() &&
                            anthemTrack.artist.toLowerCase() === track.artist.toLowerCase())),
                      );

                      const handleSelectAnthem = () => {
                        const isSC = track.source === 'soundcloud' || track.id?.startsWith('sc-');
                        const safeId = isSC
                          ? track.id
                          : extractSpotifyTrackId(track) || track.id || (track as any).trackId;
                        const safeTrack = {
                          ...track,
                          id: safeId,
                          trackId: safeId,
                          title: unescapeHtml(track.title),
                          artist: unescapeHtml(track.artist),
                          spotifyUrl:
                            track.spotifyUrl ||
                            (isSC ? 'https://soundcloud.com' : getSafeSpotifyTrackUrl(track)),
                          source: isSC ? ('soundcloud' as const) : ('spotify' as const),
                          streamUrl: track.streamUrl,
                        };
                        setAnthemTrack(safeTrack);
                      };

                      return (
                        <div
                          key={`${track.id || track.title}-${track.artist}-${idx}`}
                          onClick={handleSelectAnthem}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-xl transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/[0.08] border border-emerald-500/30'
                              : 'bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {isTopTen && (
                              <span
                                className={`w-5 text-center text-xs font-black shrink-0 ${
                                  idx === 0
                                    ? 'text-amber-400'
                                    : idx === 1
                                      ? 'text-slate-300'
                                      : idx === 2
                                        ? 'text-amber-600'
                                        : 'text-gray-500'
                                }`}
                              >
                                #{idx + 1}
                              </span>
                            )}
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10 group/thumb">
                              <img
                                src={sanitizeImageUrl(track.albumArt)}
                                alt={track.title}
                                crossOrigin="anonymous"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=80';
                                }}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleResultPlay(track);
                                }}
                                className={`absolute inset-0 flex items-center justify-center cursor-pointer transition-all ${
                                  isPlaying
                                    ? 'bg-black/60 opacity-100'
                                    : 'bg-black/40 opacity-0 group-hover/thumb:opacity-100'
                                }`}
                                title={isPlaying ? 'Pause' : 'Listen in Liquid Dock'}
                              >
                                {isPlaying ? (
                                  <Pause size={13} className="text-[#1DB954] fill-[#1DB954]" />
                                ) : (
                                  <Play size={13} className="text-white fill-white ml-0.5" />
                                )}
                              </button>
                            </div>

                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-bold text-white truncate">
                                  {unescapeHtml(track.title)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                                <span className="text-[11px] text-gray-400 truncate">
                                  {unescapeHtml(track.artist)}
                                </span>
                                {track.source === 'soundcloud' || track.id?.startsWith('sc-') ? (
                                  <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-[#FF5500]/20 text-[#FF5500] border border-[#FF5500]/30 leading-tight flex items-center gap-1">
                                    <SoundCloudBrandIcon size={10} />
                                    <span>SoundCloud</span>
                                  </span>
                                ) : (
                                  <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30 leading-tight flex items-center gap-1">
                                    <SpotifyBrandIcon size={10} />
                                    <span>Spotify</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isSelected ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shrink-0">
                              <Check size={12} className="stroke-[2.5]" />
                              <span>Selected</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAnthem();
                              }}
                              className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer shrink-0"
                            >
                              Select
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
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
                            src={sanitizeImageUrl(item.posterUrl)}
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
                  <div className="relative flex items-center">
                    <Search
                      size={14}
                      className="absolute left-3.5 text-gray-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${selectedMediaType.toLowerCase()} to add to wishlist...`}
                      className="w-full bg-[#111214] border border-white/[0.08] focus:border-indigo-500 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {availableWishlistItems.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 min-h-[160px] max-h-72 overflow-y-auto custom-scrollbar p-1">
                      {availableWishlistItems.map((item) => (
                        <div
                          key={item.id || item.title}
                          onClick={() => handleAddMediaToCategory(item, true)}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-[#2b2d31]/70 hover:bg-[#2b2d31] border border-white/[0.06] hover:border-indigo-500/40 cursor-pointer transition-colors group"
                        >
                          <img
                            src={sanitizeImageUrl(item.posterUrl)}
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
                          <Plus
                            size={14}
                            className="text-indigo-400 shrink-0 group-hover:scale-110 transition-transform"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 1. TOP 5 SHOWCASE TAB (Discord-Grade Two-Panel Master-Detail Layout) */}
          {activeTab === 'media' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
              {/* LEFT PANEL: 5 Slots Showcase Board (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col p-4 rounded-2xl bg-[#1e1f22]/70 border border-white/[0.08] shadow-inner gap-3">
                {/* Header with Slot count & Progress */}
                <div className="flex flex-col gap-2 pb-2.5 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {selectedMediaType === ShowcaseMediaType.GAME ? (
                          <Gamepad2 size={15} />
                        ) : selectedMediaType === ShowcaseMediaType.ANIME ? (
                          <Tv size={15} />
                        ) : (
                          <Film size={15} />
                        )}
                      </div>
                      <span className="text-xs font-bold text-white tracking-wide">
                        Showcase Slots
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                      {currentCategoryMedia.length} / 5
                    </span>
                  </div>

                  {/* Visual 5-segment progress bar */}
                  <div className="grid grid-cols-5 gap-1.5 w-full mt-0.5">
                    {[0, 1, 2, 3, 4].map((slotIdx) => (
                      <div
                        key={slotIdx}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          slotIdx < currentCategoryMedia.length
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                            : 'bg-white/[0.06]'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* The 5 Slot Cards (always exactly 5 cards rendered so user sees slots 1..5) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-0.5 min-h-[350px]">
                  {[0, 1, 2, 3, 4].map((slotIdx) => {
                    const item = currentCategoryMedia[slotIdx];
                    if (item) {
                      const isFavorite =
                        spotlightMedia?.title.toLowerCase() === item.title.toLowerCase() &&
                        spotlightMedia?.type === item.type;

                      return (
                        <div
                          key={item.id || item.title || slotIdx}
                          className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-[#2b2d31]/80 hover:bg-[#2b2d31] border border-white/[0.06] transition-all group/item shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="relative w-9 h-12 rounded-lg overflow-hidden bg-black/40 shrink-0 border border-white/[0.08]">
                              <img
                                src={sanitizeImageUrl(item.posterUrl)}
                                alt={item.title}
                                crossOrigin="anonymous"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80';
                                }}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] font-mono text-center text-gray-300 font-bold">
                                #{slotIdx + 1}
                              </span>
                            </div>

                            <div className="flex flex-col min-w-0 flex-1">
                              <span
                                className="text-xs font-bold text-white truncate"
                                title={item.title}
                              >
                                {item.title}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                                {item.releaseYear && <span>{item.releaseYear}</span>}
                                {item.rating && (
                                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                                    ★ {item.rating}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions (Discord style) */}
                          <div className="flex items-center gap-1 shrink-0">
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
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isFavorite
                                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                  : 'text-gray-400 hover:text-amber-300 hover:bg-amber-400/10'
                              }`}
                              title={isFavorite ? 'Active Favorite' : 'Make Favorite'}
                            >
                              <Star
                                size={12}
                                className={isFavorite ? 'fill-amber-400 text-amber-400' : ''}
                              />
                            </button>

                            <button
                              type="button"
                              disabled={slotIdx === 0}
                              onClick={() => handleMoveMedia(slotIdx, 'up')}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                              title="Move Up"
                            >
                              <MoveUp size={12} />
                            </button>

                            <button
                              type="button"
                              disabled={slotIdx === currentCategoryMedia.length - 1}
                              onClick={() => handleMoveMedia(slotIdx, 'down')}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-colors"
                              title="Move Down"
                            >
                              <MoveDown size={12} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveMediaItem(item.title, item.type)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                              title="Remove from Showcase"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // Empty slot placeholder
                    return (
                      <div
                        key={`empty-${slotIdx}`}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.01] transition-colors"
                      >
                        <div className="w-9 h-12 rounded-lg border border-dashed border-white/[0.15] flex flex-col items-center justify-center text-gray-500 shrink-0 bg-white/[0.02]">
                          <Plus size={13} className="text-gray-500" />
                          <span className="text-[8px] font-mono text-gray-500 mt-0.5">
                            #{slotIdx + 1}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-gray-400">
                            Slot #{slotIdx + 1} Available
                          </span>
                          <span className="text-[10px] text-gray-500">
                            Choose from the catalog on the right
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT PANEL: Search & Catalog Library (lg:col-span-7) */}
              <div className="lg:col-span-7 flex flex-col p-4 rounded-2xl bg-[#1e1f22]/70 border border-white/[0.08] shadow-inner gap-3">
                {/* Header with Category switcher */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-300">Browse & Add Titles</span>

                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[#111214] border border-white/[0.06]">
                    {(
                      [
                        ShowcaseMediaType.GAME,
                        ShowcaseMediaType.ANIME,
                        ShowcaseMediaType.MOVIE,
                      ] as ShowcaseMediaType[]
                    ).map((type) => {
                      const count =
                        type === ShowcaseMediaType.GAME
                          ? gamesCount
                          : type === ShowcaseMediaType.ANIME
                            ? animeCount
                            : cinemaCount;
                      const label =
                        type === ShowcaseMediaType.GAME
                          ? 'Games'
                          : type === ShowcaseMediaType.ANIME
                            ? 'Anime'
                            : 'Cinema';
                      const Icon =
                        type === ShowcaseMediaType.GAME
                          ? Gamepad2
                          : type === ShowcaseMediaType.ANIME
                            ? Tv
                            : Film;

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSelectedMediaType(type)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            selectedMediaType === type
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                          }`}
                        >
                          <Icon size={12} />
                          <span>{label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                              selectedMediaType === type
                                ? 'bg-white/20 text-white'
                                : 'bg-white/[0.06] text-gray-400'
                            }`}
                          >
                            {count}/5
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative flex items-center">
                  <Search
                    size={14}
                    className="absolute left-3.5 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${selectedMediaType.toLowerCase()} titles (e.g. Naruto, Bleach, Dark Souls)...`}
                    className="w-full bg-[#111214] border border-white/[0.08] focus:border-indigo-500 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Full-Height Catalog Grid */}
                <div className="flex-1 min-h-[350px] max-h-[440px] overflow-y-auto custom-scrollbar pr-1">
                  {availableItems.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {availableItems.map((item) => {
                        const isFull = currentCategoryMedia.length >= 5;

                        return (
                          <div
                            key={item.id || item.title}
                            onClick={() => !isFull && handleAddMediaToCategory(item)}
                            className={`group relative flex flex-col p-2 rounded-xl bg-[#2b2d31]/60 hover:bg-[#2b2d31] border border-white/[0.06] hover:border-indigo-500/40 transition-all duration-200 shadow-xs ${
                              isFull
                                ? 'opacity-50 cursor-not-allowed'
                                : 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5'
                            }`}
                          >
                            {/* Poster container with aspect ratio */}
                            <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-black/40 mb-2 border border-white/[0.06]">
                              <img
                                src={sanitizeImageUrl(item.posterUrl)}
                                alt={item.title}
                                crossOrigin="anonymous"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80';
                                }}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />

                              {/* Badges */}
                              {item.rating && (
                                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-amber-300 font-bold text-[10px] flex items-center gap-0.5 border border-amber-500/30 shadow-xs">
                                  ★ {item.rating}
                                </span>
                              )}

                              {item.releaseYear && (
                                <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-gray-300 font-mono text-[9px] border border-white/10 shadow-xs">
                                  {item.releaseYear}
                                </span>
                              )}

                              {/* Hover Add Overlay */}
                              {!isFull && (
                                <div className="absolute inset-0 bg-indigo-600/35 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-md flex items-center gap-1">
                                    <Plus size={13} />
                                    <span>Add</span>
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Title & info */}
                            <span
                              className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate"
                              title={item.title}
                            >
                              {item.title}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate mt-0.5">
                              {item.releaseYear || 'Title'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                      {searchQuery ? (
                        <>
                          <Search size={24} className="text-gray-500 opacity-60" />
                          <p className="font-semibold text-gray-300">
                            No titles found matching "{searchQuery}"
                          </p>
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="text-indigo-400 hover:underline text-xs cursor-pointer mt-1"
                          >
                            Clear search filter
                          </button>
                        </>
                      ) : currentCategoryMedia.length >= 5 ? (
                        <>
                          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                            <Check size={20} />
                          </div>
                          <p className="font-bold text-gray-200">
                            All 5 slots are currently filled!
                          </p>
                          <p className="text-[11px] text-gray-400 max-w-xs">
                            Remove an item from the left panel if you want to add a different title.
                          </p>
                        </>
                      ) : (
                        <p className="text-gray-500">Loading catalog titles...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. SPOTLIGHT HERO TAB */}
          {activeTab === 'spotlight' && (
            <div className="flex flex-col gap-4">
              {spotlightMedia ? (
                <div className="flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Flame size={14} /> Active Favorite Card
                    </span>
                    <button
                      type="button"
                      onClick={() => setSpotlightMedia(null)}
                      className="text-xs text-red-400 hover:underline cursor-pointer"
                    >
                      Remove Favorite
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={
                        sanitizeImageUrl(spotlightMedia.customBannerUrl) ||
                        sanitizeImageUrl(spotlightMedia.posterUrl) ||
                        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80'
                      }
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
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setSpotlightMedia({
                            ...spotlightMedia,
                            customBannerUrl: val || null,
                          });
                        }}
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
                      placeholder="Search title to set as favorite..."
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
                            src={sanitizeImageUrl(item.posterUrl)}
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

          {/* 3. PERSONAL INFORMATION TAB */}
          {activeTab === 'meta' && (
            <div className="flex flex-col gap-4 max-h-[62vh] overflow-y-auto pr-1.5 tabs-scrollbar">
              {/* Relationship Status Section */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-sm">
                    <span>
                      {relationshipStatus
                        ? RELATIONSHIP_CONFIG[relationshipStatus]?.icon || '❤️'
                        : '❤️'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Relationship Status</span>
                    <span className="text-[10px] text-gray-500">
                      Facebook-style relationship state & anniversary
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-gray-300">State</label>
                    <select
                      value={relationshipStatus}
                      onChange={(e) => setRelationshipStatus(e.target.value)}
                      className="bg-[#18181b] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-indigo-500 transition-colors"
                    >
                      <option value="">Not specified</option>
                      <option value="single">Without steam</option>
                      <option value="in_relationship">In a relationship</option>
                      <option value="engaged">Engaged</option>
                      <option value="married">Married</option>
                      <option value="civil_marriage">In a civil marriage</option>
                      <option value="shared_accommodation">Shared accommodation</option>
                      <option value="open_relationship">In an open relationship</option>
                      <option value="complicated">Everything is complicated.</option>
                      <option value="separated">They broke up.</option>
                      <option value="divorced">Divorced</option>
                      <option value="widowed">Widower/widow</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-gray-300">
                      Partner (optional)
                    </label>
                    <input
                      type="text"
                      value={partner}
                      onChange={(e) => {
                        setPartner(e.target.value);
                        if (!e.target.value.trim()) setPartnerUserId(null);
                      }}
                      placeholder="e.g. @username or Name"
                      maxLength={50}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Anniversary Date (Since) */}
                {relationshipStatus && (
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-white/[0.05]">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                        <Calendar size={12} className="text-rose-400" /> Since (Anniversary Date)
                      </label>
                      {relationshipSince && formatRelationshipDuration(relationshipSince) && (
                        <span className="text-[10px] text-rose-300 font-medium bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          {formatRelationshipDuration(relationshipSince)}
                        </span>
                      )}
                    </div>
                    <input
                      type="date"
                      value={relationshipSince}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setRelationshipSince(e.target.value)}
                      className="bg-[#18181b] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Places Section */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <MapPin size={14} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Places</span>
                    <span className="text-[10px] text-gray-500">
                      Current residence and hometown
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                      <MapPin size={12} className="text-red-400" /> Lives in
                    </label>
                    <input
                      type="text"
                      value={livesIn}
                      onChange={(e) => setLivesIn(e.target.value)}
                      placeholder="e.g. Cherkasy, Ukraine"
                      maxLength={60}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                      <Home size={12} className="text-amber-400" /> Originally from
                    </label>
                    <input
                      type="text"
                      value={hometown}
                      onChange={(e) => setHometown(e.target.value)}
                      placeholder="e.g. Bratislava, Slovakia"
                      maxLength={60}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Work & Education Section */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Briefcase size={14} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Work & Education</span>
                    <span className="text-[10px] text-gray-500">
                      Career, workplace, and education hubs
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Workplace */}
                  <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.01] border border-white/[0.05]">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                        <Briefcase size={12} className="text-blue-400" /> Works at (Company)
                      </label>
                      <input
                        type="text"
                        value={workplace}
                        onChange={(e) => setWorkplace(e.target.value)}
                        placeholder="e.g. Google, Valve"
                        maxLength={70}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400">Position / Role</label>
                      <input
                        type="text"
                        value={workplaceRole}
                        onChange={(e) => setWorkplaceRole(e.target.value)}
                        placeholder="e.g. Lead Designer"
                        maxLength={50}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {WORKPLACE_STATUSES.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setWorkplaceStatus(status)}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                            workplaceStatus === status
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold'
                              : 'bg-white/[0.03] text-gray-400 border-white/[0.06] hover:text-white'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Education */}
                  <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.01] border border-white/[0.05]">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                        <GraduationCap size={12} className="text-indigo-400" /> Studied at (School /
                        University)
                      </label>
                      <input
                        type="text"
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                        placeholder="e.g. MIT, Stanford"
                        maxLength={70}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1 mt-auto pt-2">
                      {EDUCATION_STATUSES.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setEducationStatus(status)}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                            educationStatus === status
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold'
                              : 'bg-white/[0.03] text-gray-400 border-white/[0.06] hover:text-white'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Languages Section (Screenshot 1 - up to 10 with flags) */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                      <Languages size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Languages</span>
                      <span className="text-[10px] text-gray-500">
                        Languages you speak (up to 10)
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-gray-300">
                    {languagesList.length}/10
                  </span>
                </div>

                {/* Selected Languages Chips Box */}
                <div className="min-h-[44px] p-2 rounded-xl bg-black/40 border border-white/[0.08] flex flex-wrap items-center gap-1.5">
                  {languagesList.length === 0 ? (
                    <span className="text-xs text-gray-500 italic px-1">
                      No languages added yet. Click suggestions below or type your language.
                    </span>
                  ) : (
                    languagesList.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 text-white border border-indigo-500/30 text-xs font-medium group/chip animate-fadeIn"
                      >
                        <span>{getLanguageFlag(lang)}</span>
                        <span>{lang}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLanguage(lang)}
                          className="text-gray-400 hover:text-red-400 transition-colors ml-0.5 cursor-pointer"
                          title={`Remove ${lang}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Add Custom Language Input */}
                {languagesList.length < 10 && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newLanguageInput}
                      onChange={(e) => setNewLanguageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddLanguage(newLanguageInput);
                        }
                      }}
                      placeholder="Type a language (e.g. English, Ukrainian, German)..."
                      maxLength={40}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddLanguage(newLanguageInput)}
                      disabled={!newLanguageInput.trim()}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Add</span>
                    </button>
                  </div>
                )}

                {/* Quick Add Suggestions */}
                {languagesList.length < 10 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] text-gray-500 mr-1">Popular:</span>
                    {POPULAR_LANGUAGES.filter(
                      (p) => !languagesList.some((l) => l.toLowerCase() === p.toLowerCase()),
                    )
                      .slice(0, 7)
                      .map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleAddLanguage(p)}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 hover:text-white transition-all cursor-pointer"
                        >
                          <span>{getLanguageFlag(p)}</span>
                          <span>{p}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Family Members Section (Screenshot 2 - interactive with search) */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                      <Users size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Family Members</span>
                      <span className="text-[10px] text-gray-500">
                        Add relatives with platform profile links
                      </span>
                    </div>
                  </div>

                  {!isAddingFamily && (
                    <button
                      type="button"
                      onClick={() => setIsAddingFamily(true)}
                      className="px-2.5 py-1 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Add Member</span>
                    </button>
                  )}
                </div>

                {/* Add Member Form */}
                {isAddingFamily && (
                  <div className="p-3.5 rounded-2xl bg-black/50 border border-teal-500/30 flex flex-col gap-3 animate-fadeIn">
                    <span className="text-xs font-bold text-white">Add Family Relation:</span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Search user on platform */}
                      <div className="relative flex flex-col gap-1">
                        <label className="text-[10px] text-gray-400">
                          Search user on platform (@username):
                        </label>
                        <input
                          type="text"
                          value={familySearchQuery}
                          onChange={(e) => setFamilySearchQuery(e.target.value)}
                          placeholder="Type @username or name..."
                          className="bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-teal-500 transition-colors"
                        />

                        {/* Search Suggestions Dropdown */}
                        {familyUserSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl bg-[#18181b] border border-white/[0.1] shadow-2xl p-1 flex flex-col gap-1 max-h-40 overflow-y-auto">
                            {familyUserSuggestions.map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => handleAddFamilyMember(u)}
                                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer text-left w-full"
                              >
                                {u.avatarUrl || u.avatar ? (
                                  <img
                                    src={sanitizeImageUrl(u.avatarUrl || u.avatar)}
                                    alt={u.username}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 font-bold text-[10px] flex items-center justify-center">
                                    {(u.displayName || u.username).charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-semibold text-white truncate">
                                    {u.displayName || u.username}
                                  </span>
                                  <span className="text-[10px] text-gray-400 truncate">
                                    @{u.username}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Relationship Role */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-gray-400">Relationship Role:</label>
                        <select
                          value={familyRole}
                          onChange={(e) => setFamilyRole(e.target.value)}
                          className="bg-[#18181b] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer focus:border-teal-500 transition-colors"
                        >
                          {FAMILY_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Or Manual Name Input */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400">
                        Or enter relative's name manually (if not on platform):
                      </label>
                      <input
                        type="text"
                        value={familyCustomName}
                        onChange={(e) => setFamilyCustomName(e.target.value)}
                        placeholder="e.g. Maryna Mykhaylenko"
                        maxLength={50}
                        className="bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-teal-500 transition-colors"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingFamily(false);
                          setFamilySearchQuery('');
                          setFamilyCustomName('');
                          setFamilyUserSuggestions([]);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-gray-300 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddFamilyMember()}
                        disabled={!familyCustomName.trim() && !familySearchQuery.trim()}
                        className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white transition-colors cursor-pointer"
                      >
                        Save Relation
                      </button>
                    </div>
                  </div>
                )}

                {/* Family Members List */}
                <div className="flex flex-col gap-1.5">
                  {familyMembers.length === 0 ? (
                    <span className="text-xs text-gray-500 italic p-1">
                      No family members added yet.
                    </span>
                  ) : (
                    familyMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {member.avatarUrl ? (
                            <img
                              src={sanitizeImageUrl(member.avatarUrl)}
                              alt={member.name || member.customName || 'Relative'}
                              className="w-7 h-7 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center border border-teal-500/30">
                              {(member.name || member.customName || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-white truncate">
                                {member.name || member.customName || 'Relative'}
                              </span>
                              {member.username && (
                                <span className="text-[10px] text-teal-300 truncate">
                                  @{member.username}
                                </span>
                              )}
                              {member.isConfirmed === false && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                                  Pending
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400">{member.role}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFamilyMember(member.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
                          title="Remove member"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Gender, Pronouns & Timezone */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <UserCheck size={14} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Identity & Timezone</span>
                    <span className="text-[10px] text-gray-500">
                      Gender, pronouns, and timezone region
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Gender Selector */}
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/[0.01] border border-white/[0.05]">
                    <label className="text-xs font-semibold text-gray-300">Gender:</label>
                    <div className="flex items-center gap-2">
                      {['Male', 'Female', 'Custom'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            gender === g
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
                              : 'bg-white/[0.03] text-gray-400 border-white/[0.06] hover:text-white'
                          }`}
                        >
                          {g === 'Male' ? 'Male' : g === 'Female' ? 'Female' : 'Custom'}
                        </button>
                      ))}
                    </div>
                    {gender === 'Custom' && (
                      <input
                        type="text"
                        value={customGenderInput}
                        onChange={(e) => setCustomGenderInput(e.target.value)}
                        placeholder="e.g. Non-binary, Genderqueer"
                        maxLength={40}
                        className="mt-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500 transition-colors"
                      />
                    )}
                  </div>

                  {/* Custom Pronouns */}
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/[0.01] border border-white/[0.05]">
                    <label className="text-xs font-semibold text-gray-300">Custom Pronouns:</label>
                    <input
                      type="text"
                      value={pronouns}
                      onChange={(e) => setPronouns(e.target.value)}
                      maxLength={20}
                      placeholder="e.g. he/him, they/them"
                      className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Timezone Region */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-300">Timezone Region:</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="bg-[#18181b] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-indigo-500 transition-colors"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Display Toggles (Discord-Style Grouped Toggles) */}
              <div className="flex flex-col gap-4 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                    Display Toggles:
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Toggle profile visibility in 1 click
                  </span>
                </div>

                {/* 1. Identity & Bio Toggles */}
                <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                    Identity & Bio
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <DiscordToggle
                      checked={showBirthdate}
                      onChange={setShowBirthdate}
                      label="Show Birthdate"
                      description="Displays birth day & month"
                    />
                    <DiscordToggle
                      checked={showAge}
                      onChange={setShowAge}
                      label="Show Age"
                      description="Calculates age in years"
                    />
                    <DiscordToggle
                      checked={showZodiac}
                      onChange={setShowZodiac}
                      label="Show Zodiac Sign"
                      description="Astrological sign from birthdate"
                    />
                    <DiscordToggle
                      checked={showGender}
                      onChange={setShowGender}
                      label="Show Gender"
                      description="Displays gender tag"
                    />
                    <DiscordToggle
                      checked={showPronouns}
                      onChange={setShowPronouns}
                      label="Show Pronouns"
                      description="Displays custom pronouns"
                    />
                  </div>
                </div>

                {/* 2. Relationship & Places Toggles */}
                <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                    Relationship & Places
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <DiscordToggle
                      checked={showRelationship}
                      onChange={setShowRelationship}
                      label="Show Relationship"
                      description="Displays status & anniversary"
                    />
                    <DiscordToggle
                      checked={showLivesIn}
                      onChange={setShowLivesIn}
                      label="Show Current City"
                      description="Displays 'Lives in' location"
                    />
                    <DiscordToggle
                      checked={showHometown}
                      onChange={setShowHometown}
                      label="Show Hometown"
                      description="Displays 'Originally from'"
                    />
                  </div>
                </div>

                {/* 3. Career & Social Toggles */}
                <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">
                    Work, Education & Family
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <DiscordToggle
                      checked={showWorkplace}
                      onChange={setShowWorkplace}
                      label="Show Workplace"
                      description="Displays 'Works at' information"
                    />
                    <DiscordToggle
                      checked={showEducation}
                      onChange={setShowEducation}
                      label="Show Education"
                      description="Displays 'Studied at' school"
                    />
                    <DiscordToggle
                      checked={showLanguages}
                      onChange={setShowLanguages}
                      label="Show Languages"
                      description="Displays spoken languages list"
                    />
                    <DiscordToggle
                      checked={showFamily}
                      onChange={setShowFamily}
                      label="Show Family Members"
                      description="Displays linked family relatives"
                    />
                  </div>
                </div>

                {/* 4. Activity & Time Toggles */}
                <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    Presence & Time
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <DiscordToggle
                      checked={showTimezone}
                      onChange={setShowTimezone}
                      label="Show Local Clock"
                      description="Live ticking clock with Slack-style context"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. ACTIVITY & ACCOUNTS TAB */}
          {activeTab === 'activity' &&
            (() => {
              const connectedAccountsMap =
                (showcase?.connectedAccounts as Record<string, any> | undefined) || {};
              const connectedPlatforms = PLATFORMS_LIST.filter((p) => {
                if (p.id === 'github' && currentUser?.githubUsername) return true;
                return Boolean(connectedAccountsMap[p.id]);
              });
              const availablePlatforms = PLATFORMS_LIST.filter((p) => {
                if (p.id === 'github' && currentUser?.githubUsername) return false;
                return !connectedAccountsMap[p.id];
              });

              if (connectedPlatforms.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08]">
                    <div className="w-12 h-12 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/30 flex items-center justify-center text-[#5865F2] mb-3 shadow-[0_0_20px_rgba(88,101,242,0.2)]">
                      <Globe size={24} />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">No Connected Integrations</h4>
                    <p className="text-xs text-gray-400 max-w-sm mb-4 leading-relaxed">
                      Connect and authenticate your Steam, Spotify, YouTube, Twitch, Roblox, or
                      GitHub accounts to showcase real-time stats and profile cards.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        openEditProfile('sec-integrations');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] shadow-[0_4px_16px_rgba(88,101,242,0.35)] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:scale-102 active:scale-98"
                    >
                      <span>Connect Integrations</span>
                    </button>
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Connected Accounts:
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {connectedPlatforms.map((p) => {
                      const connectedData =
                        p.id === 'github' && currentUser?.githubUsername
                          ? {
                              username: currentUser.githubUsername,
                              mergedPrsCount: currentUser.mergedPrsCount,
                              ...(connectedAccountsMap.github || {}),
                            }
                          : connectedAccountsMap[p.id];

                      return (
                        <div
                          key={p.id}
                          className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between gap-3 hover:border-white/[0.14] transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                              {p.icon}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1 justify-center">
                              <span className="text-white font-bold text-sm truncate leading-tight">
                                {p.name}
                              </span>
                              <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                                <Check
                                  size={13}
                                  className="text-emerald-400 shrink-0 stroke-[2.5]"
                                />
                                <span className="text-emerald-400 text-xs font-medium truncate">
                                  {connectedData?.username ||
                                    connectedData?.handle ||
                                    connectedData?.riotId ||
                                    connectedData?.channel ||
                                    connectedData?.battleTag ||
                                    'Connected'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenPlatformModal(p)}
                              className="bg-white/[0.06] hover:bg-white/[0.12] text-white px-3 py-1.5 rounded-xl border border-white/[0.08] transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              Configure
                            </button>
                            <button
                              type="button"
                              onClick={() => setUnlinkTarget({ id: p.id, name: p.name })}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer shadow-sm"
                              title="Disconnect platform"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Add Integration button (Only if user hasn't connected all platforms yet) */}
                  {availablePlatforms.length > 0 && (
                    <div className="pt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          openEditProfile('sec-integrations');
                        }}
                        className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/20 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm flex items-center gap-2 hover:scale-102 active:scale-98"
                      >
                        <Plus size={14} className="text-indigo-400 font-bold" />
                        <span>Connect More Platforms</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

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
                  <span className="text-xs text-gray-200">Personal Information Visibility</span>
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
            className="px-6 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-lg hover:scale-105 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ backgroundColor: accentColor }}
          >
            {updateMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            <span>{updateMutation.isPending ? 'Saving...' : 'Save Showcase'}</span>
          </button>
        </div>
      </div>

      {activePlatformModal && (
        <ConfigureIntegrationModal
          isOpen={isPlatformModalOpen}
          onClose={() => setIsPlatformModalOpen(false)}
          platform={activePlatformModal}
          initialData={
            (showcase?.connectedAccounts as Record<string, any> | undefined)?.[
              activePlatformModal.id
            ]
          }
          onSaveSuccess={() => {
            queryClient.invalidateQueries({ queryKey: [USER_KEY] });
            queryClient.invalidateQueries({ queryKey: ['showcase'] });
          }}
        />
      )}

      <UnlinkConfirmationModal
        isOpen={Boolean(unlinkTarget)}
        platformName={unlinkTarget?.name || ''}
        onConfirm={() => {
          if (unlinkTarget) {
            handleUnlinkPlatform(unlinkTarget.id);
            setUnlinkTarget(null);
          }
        }}
        onCancel={() => setUnlinkTarget(null)}
      />
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
