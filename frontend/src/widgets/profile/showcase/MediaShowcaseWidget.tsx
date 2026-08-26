import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Plus, Film, Gamepad2, Tv, ExternalLink, Pencil } from 'lucide-react';
import {
  ShowcaseMediaType,
  type ProfileShowcaseDto,
  type ShowcaseMediaItemDto,
} from '@backend/common/contracts';
import { chatApi } from '@/features/chat/api/chatApi';
import { useChatDraftsStore } from '@/features/chat/model/useChatDraftsStore';

interface MediaShowcaseWidgetProps {
  showcase: ProfileShowcaseDto;
  isOwner: boolean;
  onAddMediaClick?: (type: ShowcaseMediaType) => void;
  onEditClick?: () => void;
}

type TabType = 'GAMES' | 'ANIME' | 'CINEMA';

interface SpecularPosterSlotProps {
  item: ShowcaseMediaItemDto;
  isOwner: boolean;
  targetUserId?: string;
}

const SpecularPosterSlot: React.FC<SpecularPosterSlotProps> = ({ item, isOwner, targetUserId }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  const isInviteTag = (tag: string) => /party|duo|ranked|teammate|lfg|looking for/i.test(tag);

  const handleQuickInvite = async (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    if (!targetUserId) return;
    try {
      const conv = await chatApi.createDirectConversation(targetUserId);
      const draft = `Hey! I saw your profile tag "${tag}" on ${item.title}, wanna play? 🎮`;
      useChatDraftsStore.getState().setDraft(conv.id, draft);
      navigate(`/messages/${conv.id}`);
    } catch {
      navigate('/messages');
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/[0.08] bg-[#121215] group/card transition-all duration-300 hover:scale-105 hover:border-indigo-500/50 hover:shadow-2xl cursor-pointer"
    >
      <img
        src={item.posterUrl}
        alt={item.title}
        crossOrigin="anonymous"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src =
            'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80';
        }}
        className="w-full h-full object-cover"
      />

      {/* GPU-Accelerated 60 FPS Specular Sheen (Zero-Rerender CSS Variable Ref) */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 z-10 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.24), transparent 65%)`,
        }}
      />

      {/* Rating Badge */}
      {item.rating && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-amber-300 border border-amber-500/30 z-20">
          <Star size={9} className="fill-amber-400 text-amber-400" />
          <span>{item.rating}</span>
        </div>
      )}

      {/* Glass Tooltip / Overlay on Hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/65 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity p-2 flex flex-col justify-end text-left z-20">
        <span className="text-[11px] font-extrabold text-white leading-tight line-clamp-2">
          {item.title}
        </span>
        {item.releaseYear && (
          <span className="text-[9px] text-gray-400 font-medium">{item.releaseYear}</span>
        )}
        {item.userComment && (
          <span className="text-[9px] text-indigo-300 font-semibold italic truncate mt-0.5">
            "{item.userComment}"
          </span>
        )}

        {/* Tags with Quick Invite */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.tags.map((tag, tIdx) => {
              const inviteActive = !isOwner && isInviteTag(tag);
              if (inviteActive) {
                return (
                  <button
                    key={tIdx}
                    type="button"
                    onClick={(e) => handleQuickInvite(e, tag)}
                    className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[8px] font-bold ring-1 ring-emerald-400/30 animate-pulse hover:bg-emerald-500/40"
                    title="Invite to play 🎮"
                  >
                    {tag}
                  </button>
                );
              }
              return (
                <span
                  key={tIdx}
                  className="px-1.5 py-0.5 rounded-md bg-white/10 text-gray-300 text-[8px] font-medium"
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}

        {item.externalUrl && (
          <a
            href={item.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1 text-[9px] text-blue-400 hover:underline flex items-center gap-0.5"
          >
            <span>Details</span>
            <ExternalLink size={8} />
          </a>
        )}
      </div>
    </div>
  );
};

export const MediaShowcaseWidget: React.FC<MediaShowcaseWidgetProps> = ({
  showcase,
  isOwner,
  onAddMediaClick,
  onEditClick,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('GAMES');
  const accent = showcase.accentColor || '#6366f1';

  const filterMedia = (tab: TabType): ShowcaseMediaItemDto[] => {
    switch (tab) {
      case 'GAMES':
        return showcase.mediaItems.filter((m) => m.type === ShowcaseMediaType.GAME);
      case 'ANIME':
        return showcase.mediaItems.filter((m) => m.type === ShowcaseMediaType.ANIME);
      case 'CINEMA':
        return showcase.mediaItems.filter(
          (m) => m.type === ShowcaseMediaType.MOVIE || m.type === ShowcaseMediaType.SERIES,
        );
      default:
        return [];
    }
  };

  const currentItems = filterMedia(activeTab);
  const totalMediaCount = showcase.mediaItems.length;

  if (!isOwner && totalMediaCount === 0) {
    return null;
  }

  const getActiveMediaType = (): ShowcaseMediaType => {
    if (activeTab === 'GAMES') return ShowcaseMediaType.GAME;
    if (activeTab === 'ANIME') return ShowcaseMediaType.ANIME;
    return ShowcaseMediaType.MOVIE;
  };

  // 5 slots: fill up with items, then remaining empty slots
  const slots: Array<ShowcaseMediaItemDto | null> = [...currentItems];
  while (slots.length < 5) {
    slots.push(null);
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] p-4.5 transition-all duration-300 hover:border-white/[0.16] shadow-xl flex flex-col gap-3.5 group"
      style={{ boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)` }}
    >
      {/* Background Glow */}
      <div
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-35"
        style={{ backgroundColor: accent }}
      />

      {/* Header & Tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] relative z-10">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setActiveTab('GAMES')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'GAMES'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Gamepad2 size={13} />
            <span>Games</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ANIME')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ANIME'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Tv size={13} />
            <span>Anime</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CINEMA')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CINEMA'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Film size={13} />
            <span>Cinema</span>
          </button>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={onEditClick}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Edit Top 5 Showcase"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {/* Top 5 Posters Grid */}
      <div className="grid grid-cols-5 gap-2 relative z-10">
        {slots.map((item, idx) => {
          if (item) {
            return (
              <SpecularPosterSlot
                key={item.id || idx}
                item={item}
                isOwner={isOwner}
                targetUserId={showcase.userId}
              />
            );
          }

          if (isOwner) {
            return (
              <button
                key={`empty-${idx}`}
                type="button"
                onClick={() => onAddMediaClick?.(getActiveMediaType())}
                className="aspect-[2/3] rounded-2xl border-2 border-dashed border-white/10 hover:border-white/25 hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-white cursor-pointer group/add"
                title={`Add ${activeTab.toLowerCase()} title`}
              >
                <Plus size={16} className="transition-transform group-hover/add:scale-110" />
                <span className="text-[9px] font-bold">Slot {idx + 1}</span>
              </button>
            );
          }

          return (
            <div
              key={`placeholder-${idx}`}
              className="aspect-[2/3] rounded-2xl border border-white/[0.03] bg-white/[0.01]"
            />
          );
        })}
      </div>
    </div>
  );
};
