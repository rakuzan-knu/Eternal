import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Reorder } from 'framer-motion';
import { Star, Plus, Film, Gamepad2, Tv, ExternalLink, Pencil } from 'lucide-react';
import {
  ShowcaseMediaType,
  type ProfileShowcaseDto,
  type ShowcaseMediaItemDto,
} from '@backend/common/contracts';
import { chatApi } from '@/features/chat/api/chatApi';
import { useChatDraftsStore } from '@/features/chat/model/useChatDraftsStore';
import { useMediaDetailModalStore } from '@/entities/showcase/model/useMediaDetailModalStore';
import { sanitizeImageUrl, sanitizeExternalUrl } from '@/shared/lib/urlSecurity';

interface MediaShowcaseWidgetProps {
  showcase: ProfileShowcaseDto;
  isOwner: boolean;
  mediaItems?: ShowcaseMediaItemDto[];
  onMediaReorder?: (newItems: ShowcaseMediaItemDto[]) => void;
  onAddMediaClick?: (type: ShowcaseMediaType) => void;
  onEditClick?: (category?: ShowcaseMediaType) => void;
}

type TabType = 'GAMES' | 'ANIME' | 'CINEMA';

interface SpecularPosterSlotProps {
  item: ShowcaseMediaItemDto;
  isOwner: boolean;
  targetUserId?: string;
}

const SpecularPosterSlot: React.FC<SpecularPosterSlotProps> = ({ item, isOwner, targetUserId }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const handlePointerDown = (e: React.PointerEvent | React.MouseEvent) => {
    const x = e.clientX ?? 0;
    const y = e.clientY ?? 0;
    pointerDownPos.current = { x, y };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (pointerDownPos.current) {
      const clientX = e.clientX ?? 0;
      const clientY = e.clientY ?? 0;
      const dist = Math.hypot(
        clientX - pointerDownPos.current.x,
        clientY - pointerDownPos.current.y,
      );
      if (!isNaN(dist) && dist > 6) {
        // Drag detected, ignore click
        return;
      }
    }
    useMediaDetailModalStore.getState().openMediaDetail(item);
  };

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
      onPointerDown={handlePointerDown}
      onMouseDown={handlePointerDown}
      onClick={handleClick}
      className={`relative w-full h-full aspect-2/3 rounded-2xl overflow-hidden border border-white/8 bg-[#121215] group/card transition-all duration-300 hover:scale-105 hover:border-indigo-500/50 hover:shadow-2xl ${
        isOwner ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      }`}
    >
      <img
        src={sanitizeImageUrl(item.posterUrl)}
        alt={item.title}
        loading="lazy"
        decoding="async"
        crossOrigin="anonymous"
        draggable={false}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src =
            'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80';
        }}
        className="w-full h-full object-cover pointer-events-none select-none"
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
      <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/65 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity p-2 flex flex-col justify-end text-left z-20 pointer-events-none">
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
          <div className="flex flex-wrap gap-1 mt-1 pointer-events-auto">
            {item.tags.map((tag, tIdx) => {
              const inviteActive = !isOwner && isInviteTag(tag);
              if (inviteActive) {
                return (
                  <button
                    key={tIdx}
                    type="button"
                    onClick={(e) => handleQuickInvite(e, tag)}
                    className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[8px] font-bold ring-1 ring-emerald-400/30 hover:bg-emerald-500/40 cursor-pointer"
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
            href={sanitizeExternalUrl(item.externalUrl, '#')}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1 text-[9px] text-blue-400 hover:underline flex items-center gap-0.5 pointer-events-auto"
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
  mediaItems,
  onMediaReorder,
  onAddMediaClick,
  onEditClick,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('GAMES');
  const accent = showcase.accentColor || '#6366f1';
  const mediaList = mediaItems || showcase?.mediaItems || [];

  const isCurrentCategory = (m: ShowcaseMediaItemDto, tab: TabType): boolean => {
    if (m.isWishlist) return false;
    if (tab === 'GAMES') return m.type === ShowcaseMediaType.GAME;
    if (tab === 'ANIME') return m.type === ShowcaseMediaType.ANIME;
    if (tab === 'CINEMA')
      return m.type === ShowcaseMediaType.MOVIE || m.type === ShowcaseMediaType.SERIES;
    return false;
  };

  const currentItems = mediaList
    .filter((m) => isCurrentCategory(m, activeTab))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const totalMediaCount = mediaList.length;

  if (!isOwner && totalMediaCount === 0) {
    return null;
  }

  const getActiveMediaType = (): ShowcaseMediaType => {
    if (activeTab === 'GAMES') return ShowcaseMediaType.GAME;
    if (activeTab === 'ANIME') return ShowcaseMediaType.ANIME;
    return ShowcaseMediaType.MOVIE;
  };

  const handleCategoryReorder = (newItems: ShowcaseMediaItemDto[]) => {
    const otherItems = mediaList.filter((m) => !isCurrentCategory(m, activeTab));
    const indexedNewItems = newItems.map((item, idx) => ({
      ...item,
      position: idx,
    }));
    onMediaReorder?.([...otherItems, ...indexedNewItems]);
  };

  const emptySlotsCount = Math.max(0, 5 - currentItems.length);

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-white/3 backdrop-blur-2xl border border-white/8 p-4.5 transition-all duration-300 hover:border-white/16 shadow-xl flex flex-col gap-3.5 group"
      style={{ boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)` }}
    >
      {/* Background Glow */}
      <div
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-35"
        style={{ backgroundColor: accent }}
      />

      {/* Header & Tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-white/6 relative z-10">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/6">
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
            onClick={() => onEditClick?.(getActiveMediaType())}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl bg-white/6 hover:bg-white/12 text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Edit Top 5 Showcase"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {/* Top 5 Posters Horizontal Reorderable Grid */}
      {currentItems.length === 0 && !isOwner ? (
        <div className="py-6 flex flex-col items-center justify-center text-center text-gray-500 text-xs">
          No {activeTab.toLowerCase()} in showcase
        </div>
      ) : isOwner ? (
        <Reorder.Group
          axis="x"
          values={currentItems}
          onReorder={handleCategoryReorder}
          className="flex gap-2 relative z-10 w-full"
        >
          {currentItems.map((item, idx) => (
            <Reorder.Item
              key={item.id || `${item.title}-${item.type}-${idx}`}
              value={item}
              whileDrag={{
                scale: 1.08,
                opacity: 0.88,
                zIndex: 50,
                boxShadow: '0 20px 48px -10px rgba(0, 0, 0, 0.8)',
              }}
              transition={{ duration: 0.15 }}
              className="aspect-2/3 flex-1 min-w-0"
            >
              <SpecularPosterSlot item={item} isOwner={isOwner} targetUserId={showcase.userId} />
            </Reorder.Item>
          ))}

          {Array.from({ length: emptySlotsCount }).map((_, emptyIdx) => {
            const slotNumber = currentItems.length + emptyIdx + 1;
            return (
              <button
                key={`empty-${emptyIdx}`}
                type="button"
                onClick={() => onAddMediaClick?.(getActiveMediaType())}
                className="aspect-2/3 flex-1 min-w-0 rounded-2xl border-2 border-dashed border-white/10 hover:border-white/25 hover:bg-white/4 transition-all flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-white cursor-pointer group/add"
                title={`Add ${activeTab.toLowerCase()} title`}
              >
                <Plus size={16} className="transition-transform group-hover/add:scale-110" />
                <span className="text-[9px] font-bold">Slot {slotNumber}</span>
              </button>
            );
          })}
        </Reorder.Group>
      ) : (
        <div className="flex gap-2 relative z-10 w-full">
          {currentItems.map((item, idx) => (
            <div key={item.id || idx} className="aspect-2/3 flex-1 min-w-0">
              <SpecularPosterSlot item={item} isOwner={false} targetUserId={showcase.userId} />
            </div>
          ))}
          {Array.from({ length: emptySlotsCount }).map((_, emptyIdx) => (
            <div
              key={`placeholder-${emptyIdx}`}
              className="aspect-2/3 flex-1 min-w-0 rounded-2xl border border-white/3 bg-white/1"
            />
          ))}
        </div>
      )}
    </div>
  );
};
