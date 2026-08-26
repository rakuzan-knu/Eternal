import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Gamepad2,
  Tv,
  Film,
  Sparkles,
  Plus,
  Edit3,
  Flame,
  Clock,
  Eye,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import {
  ShowcaseMediaType,
  type ProfileShowcaseDto,
  type ShowcaseMediaItemDto,
} from '@backend/common/contracts';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useShowcase } from '@/entities/showcase/model/useShowcase';
import { chatApi } from '@/features/chat/api/chatApi';
import { useChatDraftsStore } from '@/features/chat/model/useChatDraftsStore';

interface ShowcaseWishlistWidgetProps {
  showcase: ProfileShowcaseDto;
  isOwner: boolean;
  onAddMediaClick?: (type: ShowcaseMediaType) => void;
  onEditClick?: () => void;
}

export const ShowcaseWishlistWidget: React.FC<ShowcaseWishlistWidgetProps> = ({
  showcase,
  isOwner,
  onAddMediaClick,
  onEditClick,
}) => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<ShowcaseMediaType>(ShowcaseMediaType.GAME);

  const { data: currentUser } = useCurrentUser();
  const { data: viewerShowcase } = useShowcase(currentUser?.username);

  // Filter wishlist items for this profile
  const wishlistItems = showcase.mediaItems.filter((item) => item.isWishlist === true);

  const currentCategoryItems = wishlistItems.filter((item) => {
    if (activeCategory === ShowcaseMediaType.MOVIE) {
      return item.type === ShowcaseMediaType.MOVIE || item.type === ShowcaseMediaType.SERIES;
    }
    return item.type === activeCategory;
  });

  // Recommendation Radar: Collect viewer's favorites on board
  const viewerCompletedTitles = new Set<string>();
  if (viewerShowcase) {
    if (viewerShowcase.spotlightMedia?.title) {
      viewerCompletedTitles.add(viewerShowcase.spotlightMedia.title.trim().toLowerCase());
    }
    viewerShowcase.mediaItems
      .filter((m) => !m.isWishlist)
      .forEach((m) => {
        viewerCompletedTitles.add(m.title.trim().toLowerCase());
      });
  }

  // Handle recommendation click
  const handleRecommendationClick = async (title: string) => {
    if (!showcase.userId || isOwner) return;

    try {
      const conv = await chatApi.createDirectConversation(showcase.userId);
      const draft = `Hey! I noticed you have "${title}" on your wishlist. I already finished it — if you're curious, I can share my thoughts or recommend a build! 🎮`;
      useChatDraftsStore.getState().setDraft(conv.id, draft);
      navigate(`/messages/${conv.id}`);
    } catch {
      navigate('/messages');
    }
  };

  const getTagIcon = (tag: string) => {
    if (/release|anticipated|⏳/i.test(tag)) return <Clock size={11} className="text-amber-400" />;
    if (/want|play|🎮/i.test(tag)) return <Gamepad2 size={11} className="text-emerald-400" />;
    if (/plan|watch|👀/i.test(tag)) return <Eye size={11} className="text-blue-400" />;
    if (/priority|hype|🔥/i.test(tag)) return <Flame size={11} className="text-red-400" />;
    return <Sparkles size={11} className="text-indigo-400" />;
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] p-4.5 transition-all duration-300 hover:border-white/[0.16] shadow-xl flex flex-col gap-3.5 group">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
            <Bookmark size={15} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide">Wishlist & Backlog</h4>
            <p className="text-[10px] text-gray-400">Anticipated releases & planned titles</p>
          </div>
        </div>

        {isOwner && onEditClick && (
          <button
            type="button"
            onClick={onEditClick}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Edit Wishlist"
          >
            <Edit3 size={13} />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/[0.06]">
        <button
          type="button"
          onClick={() => setActiveCategory(ShowcaseMediaType.GAME)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeCategory === ShowcaseMediaType.GAME
              ? 'bg-white/[0.1] text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Gamepad2 size={13} />
          <span>Games</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory(ShowcaseMediaType.ANIME)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeCategory === ShowcaseMediaType.ANIME
              ? 'bg-white/[0.1] text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Tv size={13} />
          <span>Anime</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory(ShowcaseMediaType.MOVIE)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeCategory === ShowcaseMediaType.MOVIE
              ? 'bg-white/[0.1] text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Film size={13} />
          <span>Cinema</span>
        </button>
      </div>

      {/* Wishlist Items List */}
      <div className="flex flex-col gap-2.5">
        {currentCategoryItems.map((item) => {
          const isCompletedByViewer =
            !isOwner && viewerCompletedTitles.has(item.title.trim().toLowerCase());

          return (
            <div key={item.id || item.title} className="flex flex-col gap-1.5">
              {/* Recommendation Radar Hint */}
              {isCompletedByViewer && (
                <button
                  type="button"
                  onClick={() => handleRecommendationClick(item.title)}
                  className="w-full text-left p-2 rounded-xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-400/40 text-[11px] font-bold text-indigo-200 hover:text-white flex items-center justify-between gap-2 transition-all cursor-pointer animate-pulse"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <span className="truncate">
                      You've already completed {item.title}! Share thoughts
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/30 shrink-0">
                    Chat 💬
                  </span>
                </button>
              )}

              {/* Wishlist Card */}
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] transition-all">
                <img
                  src={item.posterUrl}
                  alt={item.title}
                  crossOrigin="anonymous"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80';
                  }}
                  className="w-11 h-15 rounded-xl object-cover shrink-0 border border-white/10 shadow-md"
                />

                <div className="flex flex-col min-w-0 flex-1 gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white truncate">{item.title}</span>
                    {item.externalUrl && (
                      <a
                        href={item.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-500 hover:text-gray-300 shrink-0"
                      >
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>

                  {item.userComment && (
                    <span className="text-[10px] text-gray-400 line-clamp-1 italic">
                      "{item.userComment}"
                    </span>
                  )}

                  {/* Expectation Tag Chips */}
                  {item.tags && item.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {item.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[9px] font-semibold text-gray-300"
                        >
                          {getTagIcon(tag)}
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-500">
                      {item.releaseYear || 'Planned'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {currentCategoryItems.length === 0 && (
          <div className="py-6 flex flex-col items-center justify-center gap-2 text-center text-gray-500">
            <Bookmark size={20} className="text-gray-600" />
            <span className="text-xs">No wishlist items in this category</span>
            {isOwner && onAddMediaClick && (
              <button
                type="button"
                onClick={() => onAddMediaClick(activeCategory)}
                className="mt-1 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>Add to Wishlist</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
