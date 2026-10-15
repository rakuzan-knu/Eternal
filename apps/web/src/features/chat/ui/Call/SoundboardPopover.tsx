import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  Volume2,
  VolumeX,
  X,
  Star,
  Clock,
  User,
  MessageSquare,
  Smile,
  Sparkles,
  Gamepad2,
  Flame,
  Film,
  Plus,
  Trash2,
  Play,
  Pause,
  UploadCloud,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  GLOBAL_SOUNDBOARD_CATALOG,
  CatalogSoundItem,
  globalSoundboardEngine,
} from '../../lib/webrtc/soundboardEngine';
import { useSoundboardStore, SoundboardItem } from '../../model/soundboardStore';
import { useCall } from '../../model/CallContext';
import { useCallStore } from '../../model/callStore';
import { Slider } from '@/shared/ui/Slider';
import { TelegramAppleEmoji } from './TelegramAppleEmoji';

interface SoundboardPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string | null;
  conversationTitle?: string | null;
}

const CATEGORIES = [
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'chat', label: 'Chat Sounds', icon: MessageSquare },
  { id: 'my', label: 'My Sounds', icon: User },
  { id: 'memes', label: 'Memes', icon: Smile },
  { id: 'anime', label: 'Anime', icon: Sparkles },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'reactions', label: 'Reactions', icon: Flame },
  { id: 'cinema', label: 'Cinema SFX', icon: Film },
] as const;

export function SoundboardPopover({
  isOpen,
  onClose,
  conversationId,
  conversationTitle,
}: SoundboardPopoverProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('favorites');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isVolumeSliderOpen, setIsVolumeSliderOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addScope, setAddScope] = useState<'my' | 'chat'>('chat');

  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { broadcastSoundboard, toggleMute } = useCall();

  const {
    mySounds,
    chatSounds,
    favorites,
    recent,
    soundboardVolume,
    isSoundboardMuted,
    fetchMySounds,
    fetchChatSounds,
    addMySound,
    removeMySound,
    addChatSound,
    removeChatSound,
    toggleFavorite,
    isFavorite,
    recordRecent,
    setSoundboardVolume,
    toggleSoundboardMute,
    initSocketListeners,
  } = useSoundboardStore();

  // Load account sounds on mount & listen to real-time chat soundboard events
  useEffect(() => {
    void fetchMySounds();
    const unsub = initSocketListeners();
    return () => {
      unsub();
    };
  }, [fetchMySounds, initSocketListeners]);

  // Load chat sounds for current conversation
  useEffect(() => {
    if (conversationId) {
      void fetchChatSounds(conversationId);
    }
  }, [conversationId, fetchChatSounds]);

  const toggleSectionCollapse = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }, []);

  const currentChatSounds = useMemo(() => {
    return conversationId ? chatSounds[conversationId] || [] : [];
  }, [chatSounds, conversationId]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-soundboard-trigger="true"]')) return;
      if (containerRef.current && !containerRef.current.contains(target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) {
          setIsAddModalOpen(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isAddModalOpen, onClose]);

  // Play sound to entire call (broadcasts, un-mutes microphone, restarts from 0)
  const handlePlaySound = useCallback(
    (sound: {
      id: string;
      name: string;
      emoji: string;
      audioData?: string;
      durationMs: number;
    }) => {
      // 1. If user is currently muted, automatically unmute mic before playing
      const isCallMuted = useCallStore.getState().isMuted;
      if (isCallMuted && typeof toggleMute === 'function') {
        toggleMute();
      }

      setPlayingId(sound.id);
      setPreviewingId(null);
      recordRecent(sound.id);

      if (broadcastSoundboard) {
        broadcastSoundboard({
          soundId: sound.id,
          name: sound.name,
          emoji: sound.emoji,
          audioData: sound.audioData,
          volume: soundboardVolume,
          durationMs: sound.durationMs,
        });
      } else {
        globalSoundboardEngine.play(sound.id, sound.audioData, soundboardVolume);
      }

      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      playTimerRef.current = setTimeout(() => {
        setPlayingId((curr) => (curr === sound.id ? null : curr));
      }, sound.durationMs || 1500);
    },
    [broadcastSoundboard, toggleMute, recordRecent, soundboardVolume],
  );

  // Preview sound locally (only heard by current user, no mic unmuting, no broadcast)
  const handlePreviewSound = useCallback(
    (sound: {
      id: string;
      name: string;
      emoji: string;
      audioData?: string;
      durationMs: number;
    }) => {
      setPreviewingId(sound.id);
      setPlayingId(null);

      // Local playback only (isPreview = true) - stops any currently playing audio and restarts from 0
      globalSoundboardEngine.play(sound.id, sound.audioData, soundboardVolume, true);

      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(() => {
        setPreviewingId((curr) => (curr === sound.id ? null : curr));
      }, sound.durationMs || 1500);
    },
    [soundboardVolume],
  );

  // Scroll to category section
  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    // If category was collapsed, expand it
    if (collapsedSections[categoryId]) {
      setCollapsedSections((prev) => ({ ...prev, [categoryId]: false }));
    }
    const targetEl = scrollContainerRef.current?.querySelector(
      `[data-category-section="${categoryId}"]`,
    );
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filtered sounds for search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();

    const allItems: Array<{
      id: string;
      name: string;
      emoji: string;
      category?: string;
      scope: 'my' | 'chat' | 'global';
      durationMs: number;
      audioData?: string;
    }> = [
      ...currentChatSounds.map((s) => ({ ...s, scope: 'chat' as const })),
      ...mySounds.map((s) => ({ ...s, scope: 'my' as const })),
      ...GLOBAL_SOUNDBOARD_CATALOG.map((s) => ({ ...s, scope: 'global' as const })),
    ];

    return allItems.filter((item) => item.name.toLowerCase().includes(q) || item.emoji.includes(q));
  }, [searchQuery, currentChatSounds, mySounds]);

  // Derived sections
  const favoriteItems = useMemo(() => {
    const all = [...currentChatSounds, ...mySounds, ...GLOBAL_SOUNDBOARD_CATALOG];
    return favorites
      .map((id) => all.find((item) => item.id === id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [favorites, currentChatSounds, mySounds]);

  const recentItems = useMemo(() => {
    const all = [...currentChatSounds, ...mySounds, ...GLOBAL_SOUNDBOARD_CATALOG];
    return recent
      .map((id) => all.find((item) => item.id === id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 8);
  }, [recent, currentChatSounds, mySounds]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 sm:-translate-x-1/2 z-50 select-none transition-all duration-200 ease-out origin-bottom animate-in fade-in zoom-in-95"
    >
      <div className="w-[400px] sm:w-[540px] h-[540px] max-w-[calc(100vw-24px)] max-h-[75vh] flex flex-col bg-[#111214]/95 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.85)] text-white overflow-hidden">
        {/* Header Bar */}
        <div className="p-3.5 border-b border-white/10 flex items-center gap-2.5 shrink-0 bg-white/[0.02]">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sounds..."
              className="w-full h-9 pl-9 pr-7 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Volume Control Button + Flyout */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsVolumeSliderOpen((prev) => !prev)}
              title={isSoundboardMuted ? 'Unmute soundboard' : 'Soundboard volume'}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${
                isSoundboardMuted
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : isVolumeSliderOpen
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {isSoundboardMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            {isVolumeSliderOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 p-3 rounded-2xl bg-zinc-950/95 border border-white/10 shadow-2xl backdrop-blur-xl z-30 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between text-xs text-zinc-300 mb-2">
                  <span>Volume</span>
                  <span className="font-mono text-zinc-400">
                    {isSoundboardMuted ? '0%' : `${Math.round(soundboardVolume * 100)}%`}
                  </span>
                </div>
                <Slider
                  value={isSoundboardMuted ? 0 : Math.round(soundboardVolume * 100)}
                  min={0}
                  max={150}
                  step={5}
                  onChange={(val) => {
                    if (isSoundboardMuted) toggleSoundboardMute();
                    setSoundboardVolume(val / 100);
                  }}
                  formatTooltip={(v) => `${v}%`}
                  aria-label="Soundboard volume"
                />
                <button
                  type="button"
                  onClick={toggleSoundboardMute}
                  className="mt-2.5 w-full py-1 text-[11px] font-semibold text-center rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition"
                >
                  {isSoundboardMuted ? 'Unmute' : 'Mute soundboard'}
                </button>
              </div>
            )}
          </div>

          {/* Close Popover */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition shrink-0"
          >
            <X size={17} />
          </button>
        </div>

        {/* Popover Body: Left Rail + Sound Library */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Navigation Rail */}
          <div className="w-13 border-r border-white/10 flex flex-col items-center py-2.5 gap-1 shrink-0 bg-black/30 overflow-y-auto">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id && !searchQuery;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    scrollToCategory(cat.id);
                  }}
                  title={cat.label}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition group relative ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>

          {/* Main Sound Grid Area */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-3.5 space-y-4 min-h-0 scroll-smooth"
          >
            {/* Search Results Mode */}
            {searchResults !== null ? (
              <div>
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                  <span>Search results ({searchResults.length})</span>
                </div>
                {searchResults.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {searchResults.map((sound) => (
                      <SoundCard
                        key={sound.id}
                        sound={sound}
                        isPlaying={playingId === sound.id}
                        isPreviewing={previewingId === sound.id}
                        isFav={isFavorite(sound.id)}
                        onPlay={() => handlePlaySound(sound)}
                        onPreview={() => handlePreviewSound(sound)}
                        onToggleFav={() => toggleFavorite(sound.id)}
                        onDelete={
                          sound.scope === 'my'
                            ? () => removeMySound(sound.id)
                            : sound.scope === 'chat' && conversationId
                              ? () => removeChatSound(conversationId, sound.id)
                              : undefined
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* 1. Favorites Section */}
                <div data-category-section="favorites">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapse('favorites')}
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-[11px] font-bold uppercase tracking-wider transition group cursor-pointer"
                    >
                      <ChevronDown
                        size={13}
                        className={`text-zinc-400 group-hover:text-zinc-200 transition-transform duration-200 ${
                          collapsedSections['favorites'] ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                      <Star size={13} className="text-zinc-400 group-hover:text-zinc-200" />
                      <span>Favorites ({favoriteItems.length})</span>
                    </button>
                  </div>
                  {!collapsedSections['favorites'] &&
                    (favoriteItems.length === 0 ? (
                      <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center text-xs text-zinc-500">
                        Click the star on any sound to add it here
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
                        {favoriteItems.map((sound) => (
                          <SoundCard
                            key={sound.id}
                            sound={sound}
                            isPlaying={playingId === sound.id}
                            isPreviewing={previewingId === sound.id}
                            isFav={true}
                            onPlay={() => handlePlaySound(sound)}
                            onPreview={() => handlePreviewSound(sound)}
                            onToggleFav={() => toggleFavorite(sound.id)}
                          />
                        ))}
                      </div>
                    ))}
                </div>

                {/* 2. Frequently Used / Recent */}
                {recentItems.length > 0 && (
                  <div data-category-section="recent">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={() => toggleSectionCollapse('recent')}
                        className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-[11px] font-bold uppercase tracking-wider transition group cursor-pointer"
                      >
                        <ChevronDown
                          size={13}
                          className={`text-zinc-400 group-hover:text-zinc-200 transition-transform duration-200 ${
                            collapsedSections['recent'] ? '-rotate-90' : 'rotate-0'
                          }`}
                        />
                        <Clock size={13} className="text-zinc-400 group-hover:text-zinc-200" />
                        <span>Recent ({recentItems.length})</span>
                      </button>
                    </div>
                    {!collapsedSections['recent'] && (
                      <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
                        {recentItems.map((sound) => (
                          <SoundCard
                            key={sound.id}
                            sound={sound}
                            isPlaying={playingId === sound.id}
                            isPreviewing={previewingId === sound.id}
                            isFav={isFavorite(sound.id)}
                            onPlay={() => handlePlaySound(sound)}
                            onPreview={() => handlePreviewSound(sound)}
                            onToggleFav={() => toggleFavorite(sound.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Chat Sounds (Shared collection for this chat) */}
                <div data-category-section="chat">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapse('chat')}
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-[11px] font-bold uppercase tracking-wider transition group cursor-pointer"
                    >
                      <ChevronDown
                        size={13}
                        className={`text-zinc-400 group-hover:text-zinc-200 transition-transform duration-200 ${
                          collapsedSections['chat'] ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                      <MessageSquare
                        size={13}
                        className="text-zinc-400 group-hover:text-zinc-200"
                      />
                      <span>
                        Chat Sounds {conversationTitle ? `"${conversationTitle}"` : ''} (
                        {currentChatSounds.length})
                      </span>
                    </button>
                    {conversationId && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddScope('chat');
                          setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 transition"
                      >
                        <Plus size={12} />
                        <span>Add sound</span>
                      </button>
                    )}
                  </div>
                  {!collapsedSections['chat'] &&
                    (currentChatSounds.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-center text-xs text-zinc-400">
                        <p>This chat has no custom sounds yet.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setAddScope('chat');
                            setIsAddModalOpen(true);
                          }}
                          className="mt-2 text-[11px] text-zinc-300 hover:text-white font-semibold underline underline-offset-2"
                        >
                          Upload a sound for this chat
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
                        {currentChatSounds.map((sound) => (
                          <SoundCard
                            key={sound.id}
                            sound={sound}
                            isPlaying={playingId === sound.id}
                            isPreviewing={previewingId === sound.id}
                            isFav={isFavorite(sound.id)}
                            onPlay={() => handlePlaySound(sound)}
                            onPreview={() => handlePreviewSound(sound)}
                            onToggleFav={() => toggleFavorite(sound.id)}
                            onDelete={
                              conversationId
                                ? () => removeChatSound(conversationId, sound.id)
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    ))}
                </div>

                {/* 4. My Sounds (Personal sounds) */}
                <div data-category-section="my">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapse('my')}
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-[11px] font-bold uppercase tracking-wider transition group cursor-pointer"
                    >
                      <ChevronDown
                        size={13}
                        className={`text-zinc-400 group-hover:text-zinc-200 transition-transform duration-200 ${
                          collapsedSections['my'] ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                      <User size={13} className="text-zinc-400 group-hover:text-zinc-200" />
                      <span>My Sounds ({mySounds.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddScope('my');
                        setIsAddModalOpen(true);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 transition"
                    >
                      <Plus size={12} />
                      <span>Add sound</span>
                    </button>
                  </div>
                  {!collapsedSections['my'] &&
                    (mySounds.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-center text-xs text-zinc-400">
                        <p>Your personal sound library is empty.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setAddScope('my');
                            setIsAddModalOpen(true);
                          }}
                          className="mt-2 text-[11px] text-zinc-300 hover:text-white font-semibold underline underline-offset-2"
                        >
                          Upload your sound (MP3, WAV, OGG)
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
                        {mySounds.map((sound) => (
                          <SoundCard
                            key={sound.id}
                            sound={sound}
                            isPlaying={playingId === sound.id}
                            isPreviewing={previewingId === sound.id}
                            isFav={isFavorite(sound.id)}
                            onPlay={() => handlePlaySound(sound)}
                            onPreview={() => handlePreviewSound(sound)}
                            onToggleFav={() => toggleFavorite(sound.id)}
                            onDelete={() => removeMySound(sound.id)}
                          />
                        ))}
                      </div>
                    ))}
                </div>

                {/* 5. Memes Catalog */}
                <div data-category-section="memes">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapse('memes')}
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-[11px] font-bold uppercase tracking-wider transition group cursor-pointer"
                    >
                      <ChevronDown
                        size={13}
                        className={`text-zinc-400 group-hover:text-zinc-200 transition-transform duration-200 ${
                          collapsedSections['memes'] ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                      <Smile size={13} className="text-zinc-400 group-hover:text-zinc-200" />
                      <span>Memes</span>
                    </button>
                  </div>
                  {!collapsedSections['memes'] && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
                      {GLOBAL_SOUNDBOARD_CATALOG.filter((s) => s.category === 'memes').map(
                        (sound) => (
                          <SoundCard
                            key={sound.id}
                            sound={sound}
                            isPlaying={playingId === sound.id}
                            isPreviewing={previewingId === sound.id}
                            isFav={isFavorite(sound.id)}
                            onPlay={() => handlePlaySound(sound)}
                            onPreview={() => handlePreviewSound(sound)}
                            onToggleFav={() => toggleFavorite(sound.id)}
                          />
                        ),
                      )}
                    </div>
                  )}
                </div>

                {/* 6. Anime Catalog */}
                <div data-category-section="anime">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapse('anime')}
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-[11px] font-bold uppercase tracking-wider transition group cursor-pointer"
                    >
                      <ChevronDown
                        size={13}
                        className={`text-zinc-400 group-hover:text-zinc-200 transition-transform duration-200 ${
                          collapsedSections['anime'] ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                      <Sparkles size={13} className="text-zinc-400 group-hover:text-zinc-200" />
                      <span>Anime</span>
                    </button>
                  </div>
                  {!collapsedSections['anime'] && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
                      {GLOBAL_SOUNDBOARD_CATALOG.filter((s) => s.category === 'anime').map(
                        (sound) => (
                          <SoundCard
                            key={sound.id}
                            sound={sound}
                            isPlaying={playingId === sound.id}
                            isPreviewing={previewingId === sound.id}
                            isFav={isFavorite(sound.id)}
                            onPlay={() => handlePlaySound(sound)}
                            onPreview={() => handlePreviewSound(sound)}
                            onToggleFav={() => toggleFavorite(sound.id)}
                          />
                        ),
                      )}
                    </div>
                  )}
                </div>

                {/* 7. Gaming Catalog */}
                <div data-category-section="gaming">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapse('gaming')}
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-[11px] font-bold uppercase tracking-wider transition group cursor-pointer"
                    >
                      <ChevronDown
                        size={13}
                        className={`text-zinc-400 group-hover:text-zinc-200 transition-transform duration-200 ${
                          collapsedSections['gaming'] ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                      <Gamepad2 size={13} className="text-zinc-400 group-hover:text-zinc-200" />
                      <span>Gaming</span>
                    </button>
                  </div>
                  {!collapsedSections['gaming'] && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
                      {GLOBAL_SOUNDBOARD_CATALOG.filter((s) => s.category === 'gaming').map(
                        (sound) => (
                          <SoundCard
                            key={sound.id}
                            sound={sound}
                            isPlaying={playingId === sound.id}
                            isPreviewing={previewingId === sound.id}
                            isFav={isFavorite(sound.id)}
                            onPlay={() => handlePlaySound(sound)}
                            onPreview={() => handlePreviewSound(sound)}
                            onToggleFav={() => toggleFavorite(sound.id)}
                          />
                        ),
                      )}
                    </div>
                  )}
                </div>

                {/* 8. Reactions Catalog */}
                <div data-category-section="reactions">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapse('reactions')}
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-[11px] font-bold uppercase tracking-wider transition group cursor-pointer"
                    >
                      <ChevronDown
                        size={13}
                        className={`text-zinc-400 group-hover:text-zinc-200 transition-transform duration-200 ${
                          collapsedSections['reactions'] ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                      <Flame size={13} className="text-zinc-400 group-hover:text-zinc-200" />
                      <span>Reactions</span>
                    </button>
                  </div>
                  {!collapsedSections['reactions'] && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
                      {GLOBAL_SOUNDBOARD_CATALOG.filter((s) => s.category === 'reactions').map(
                        (sound) => (
                          <SoundCard
                            key={sound.id}
                            sound={sound}
                            isPlaying={playingId === sound.id}
                            isPreviewing={previewingId === sound.id}
                            isFav={isFavorite(sound.id)}
                            onPlay={() => handlePlaySound(sound)}
                            onPreview={() => handlePreviewSound(sound)}
                            onToggleFav={() => toggleFavorite(sound.id)}
                          />
                        ),
                      )}
                    </div>
                  )}
                </div>

                {/* 9. Cinematic SFX */}
                <div data-category-section="cinema">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapse('cinema')}
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-[11px] font-bold uppercase tracking-wider transition group cursor-pointer"
                    >
                      <ChevronDown
                        size={13}
                        className={`text-zinc-400 group-hover:text-zinc-200 transition-transform duration-200 ${
                          collapsedSections['cinema'] ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                      <Film size={13} className="text-zinc-400 group-hover:text-zinc-200" />
                      <span>Cinematic SFX</span>
                    </button>
                  </div>
                  {!collapsedSections['cinema'] && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
                      {GLOBAL_SOUNDBOARD_CATALOG.filter((s) => s.category === 'cinema').map(
                        (sound) => (
                          <SoundCard
                            key={sound.id}
                            sound={sound}
                            isPlaying={playingId === sound.id}
                            isPreviewing={previewingId === sound.id}
                            isFav={isFavorite(sound.id)}
                            onPlay={() => handlePlaySound(sound)}
                            onPreview={() => handlePreviewSound(sound)}
                            onToggleFav={() => toggleFavorite(sound.id)}
                          />
                        ),
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Sound Modal Dialog */}
      {isAddModalOpen && (
        <AddSoundModal
          isOpen={isAddModalOpen}
          initialScope={addScope}
          conversationId={conversationId}
          onClose={() => setIsAddModalOpen(false)}
          onAddSound={(soundData) => {
            if (soundData.scope === 'chat' && conversationId) {
              addChatSound(conversationId, {
                name: soundData.name,
                emoji: soundData.emoji,
                durationMs: soundData.durationMs,
                audioData: soundData.audioData,
              });
            } else {
              addMySound({
                name: soundData.name,
                emoji: soundData.emoji,
                durationMs: soundData.durationMs,
                audioData: soundData.audioData,
              });
            }
            setIsAddModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                SOUND CARD                                  */
/* -------------------------------------------------------------------------- */

interface SoundCardProps {
  sound: {
    id: string;
    name: string;
    emoji: string;
    durationMs?: number;
    audioData?: string;
  };
  isPlaying: boolean;
  isPreviewing?: boolean;
  isFav: boolean;
  onPlay: () => void;
  onPreview: () => void;
  onToggleFav?: () => void;
  onDelete?: () => void;
}

function SoundCard({
  sound,
  isPlaying,
  isPreviewing = false,
  isFav,
  onPlay,
  onPreview,
  onToggleFav,
  onDelete,
}: SoundCardProps) {
  const [showPreviewTooltip, setShowPreviewTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const shouldAnimateEmoji = isHovered || isPlaying || isPreviewing;

  return (
    <div
      onClick={onPlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowPreviewTooltip(false);
      }}
      className={`group relative flex items-center justify-between h-11 px-2.5 rounded-xl border text-left transition-all duration-150 active:scale-[0.98] cursor-pointer select-none ${
        showPreviewTooltip ? 'z-30' : isHovered ? 'z-20' : 'z-0'
      } ${
        isPlaying
          ? 'bg-purple-600/25 border-purple-400/80 shadow-[0_0_16px_rgba(168,85,247,0.35)] ring-1 ring-purple-400'
          : isPreviewing
            ? 'bg-emerald-600/20 border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50'
            : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/5 hover:border-white/15'
      }`}
    >
      {/* Left side: Emoji + Preview button + Sound Name */}
      <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
        {/* Animated Emoji (static when idle, animates when hovered or playing) */}
        <div
          className={`shrink-0 transition-transform duration-200 ${
            isPlaying ? 'scale-115' : 'group-hover:scale-105'
          }`}
        >
          <TelegramAppleEmoji
            emoji={sound.emoji}
            size={20}
            playAnimation={shouldAnimateEmoji}
            isAnimating={isPlaying || isPreviewing}
          />
        </div>

        {/* Hover Preview Button with Tooltip */}
        <div className="relative shrink-0 flex items-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            onMouseEnter={() => setShowPreviewTooltip(true)}
            onMouseLeave={() => setShowPreviewTooltip(false)}
            aria-label={`Preview ${sound.name}`}
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
              isPreviewing
                ? 'bg-emerald-500 text-white opacity-100 shadow-sm'
                : 'text-zinc-300 hover:text-white bg-black/40 hover:bg-white/20 opacity-0 group-hover:opacity-100'
            }`}
          >
            {isPreviewing ? <Pause size={11} /> : <Play size={11} className="ml-0.5" />}
          </button>

          {/* Preview Tooltip */}
          {showPreviewTooltip && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-white/15 text-[10px] font-semibold text-white whitespace-nowrap shadow-2xl pointer-events-none z-50 animate-in fade-in zoom-in-95">
              Preview {sound.name}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
            </div>
          )}
        </div>

        {/* Title: Expands to fill width so names aren't truncated into "f..." */}
        <span className="font-semibold text-xs text-zinc-200 truncate group-hover:text-white flex-1 min-w-0">
          {sound.name}
        </span>
      </div>

      {/* Right side: Action Buttons (Star & Delete) & Equalizer */}
      <div className="flex items-center gap-0.5 shrink-0 pl-1">
        {isPlaying ? (
          <div className="flex items-end gap-0.5 h-3 px-1 pointer-events-none">
            <span className="w-0.5 h-2 bg-purple-400 rounded-full animate-pulse" />
            <span className="w-0.5 h-3 bg-purple-300 rounded-full animate-pulse delay-75" />
            <span className="w-0.5 h-1.5 bg-purple-400 rounded-full animate-pulse delay-150" />
          </div>
        ) : isPreviewing ? (
          <div className="flex items-end gap-0.5 h-3 px-1 pointer-events-none">
            <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="w-0.5 h-3 bg-emerald-300 rounded-full animate-pulse delay-75" />
            <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-pulse delay-150" />
          </div>
        ) : null}

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete sound"
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-white/10 transition"
          >
            <Trash2 size={13} />
          </button>
        )}

        {onToggleFav && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFav();
            }}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            className={`p-1 rounded-lg transition ${
              isFav
                ? 'opacity-100 text-amber-400'
                : 'opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-amber-400 hover:bg-white/10'
            }`}
          >
            <Star size={13} className={isFav ? 'fill-amber-400 text-amber-400' : ''} />
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              ADD SOUND MODAL                               */
/* -------------------------------------------------------------------------- */

interface AddSoundModalProps {
  isOpen: boolean;
  initialScope: 'my' | 'chat';
  conversationId?: string | null;
  onClose: () => void;
  onAddSound: (sound: {
    name: string;
    emoji: string;
    scope: 'my' | 'chat';
    audioData: string;
    durationMs: number;
  }) => void;
}

const QUICK_EMOJIS = [
  '🦆',
  '🎺',
  '🗿',
  '👏',
  '💥',
  '🎮',
  '🌸',
  '🤣',
  '💀',
  '🔔',
  '⚔️',
  '🚀',
  '🎭',
  '🐱',
];

function AddSoundModal({
  isOpen,
  initialScope,
  conversationId,
  onClose,
  onAddSound,
}: AddSoundModalProps) {
  const [scope, setScope] = useState<'my' | 'chat'>(initialScope);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🔊');
  const [audioData, setAudioData] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to max 5MB as requested
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size: 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;

      // Extract duration via temporary audio element and enforce max 2 minutes (120s)
      const tempAudio = new Audio(dataUrl);
      tempAudio.onloadedmetadata = () => {
        if (tempAudio.duration > 120) {
          setError('Sound duration exceeds 2 minutes (maximum 120 seconds).');
          setAudioData(null);
          setDurationSec(0);
          return;
        }
        const dur = Math.min(120.0, tempAudio.duration || 1.0);
        setDurationSec(dur);
        setAudioData(dataUrl);
      };

      // Suggest name from file name
      if (!name) {
        const baseName = file.name.replace(/\.[^/.]+$/, '').slice(0, 24);
        setName(baseName);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTogglePreview = () => {
    if (!audioData) return;

    if (isPlayingPreview && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioData);
        audioRef.current.onended = () => setIsPlayingPreview(false);
      }
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Enter sound name');
      return;
    }
    if (!audioData) {
      setError('Select an audio file');
      return;
    }
    if (durationSec > 120) {
      setError('Sound duration cannot exceed 2 minutes.');
      return;
    }

    onAddSound({
      name: name.trim(),
      emoji: emoji.trim() || '🔊',
      scope,
      audioData,
      durationMs: Math.round((durationSec || 1.0) * 1000),
    });
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-zinc-950 border border-white/15 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.9)] text-white select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="font-bold text-sm tracking-wide flex items-center gap-2">Add sound</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Scope Selector */}
          {conversationId && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setScope('chat')}
                className={`py-1.5 rounded-lg font-semibold transition ${
                  scope === 'chat'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Chat sounds
              </button>
              <button
                type="button"
                onClick={() => setScope('my')}
                className={`py-1.5 rounded-lg font-semibold transition ${
                  scope === 'my'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                My sounds
              </button>
            </div>
          )}

          {/* Audio File Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/15 hover:border-purple-400/50 rounded-2xl p-4 text-center cursor-pointer transition bg-white/[0.02] hover:bg-white/[0.05]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {audioData ? (
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-left">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePreview();
                    }}
                    className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:scale-105 transition shrink-0"
                  >
                    {isPlayingPreview ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                  </button>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate text-white">Audio ready</p>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      {durationSec.toFixed(1)}s (up to 120s)
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-purple-400 font-medium">Replace</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-zinc-400">
                <UploadCloud size={24} className="text-purple-400" />
                <span className="text-xs font-medium text-white mt-1">Click to select audio</span>
                <span className="text-[10px] text-zinc-500">
                  MP3, WAV, OGG up to 5MB, up to 2 min
                </span>
              </div>
            )}
          </div>

          {/* Sound Name */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Sound Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bruh, Victory..."
              maxLength={24}
              className="w-full h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Emoji
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  maxLength={4}
                  className="w-16 h-9 pl-8 pr-1 text-center text-xs rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                />
                <span className="absolute left-2 pointer-events-none flex items-center justify-center">
                  <TelegramAppleEmoji emoji={emoji || '🔊'} size={18} playAnimation={true} />
                </span>
              </div>
              <div className="flex-1 flex flex-wrap gap-1">
                {QUICK_EMOJIS.slice(0, 10).map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/15 transition ${
                      emoji === em ? 'bg-purple-600/40 ring-1 ring-purple-400' : 'bg-white/5'
                    }`}
                  >
                    <TelegramAppleEmoji emoji={em} size={16} playAnimation={emoji === em} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-purple-600/25 active:scale-95 flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
