import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ExternalLink, Flame, Pencil, Sparkles, Gamepad2 } from 'lucide-react';
import type { ProfileShowcaseDto } from '@backend/common/contracts';
import { chatApi } from '@/features/chat/api/chatApi';
import { useChatDraftsStore } from '@/features/chat/model/useChatDraftsStore';

interface SpotlightMediaWidgetProps {
  showcase: ProfileShowcaseDto;
  isOwner: boolean;
  onEditClick?: () => void;
}

export const SpotlightMediaWidget: React.FC<SpotlightMediaWidgetProps> = ({
  showcase,
  isOwner,
  onEditClick,
}) => {
  const navigate = useNavigate();
  const { spotlightMedia, accentColor } = showcase;
  const accent = accentColor || '#6366f1';
  const [imageError, setImageError] = useState(false);

  if (!isOwner && !spotlightMedia) {
    return null;
  }

  const isInviteTag = (tag: string) => /party|duo|ranked|teammate|lfg|looking for/i.test(tag);

  const handleQuickInvite = async (tag: string, gameTitle: string) => {
    if (!showcase.userId) return;
    try {
      const conv = await chatApi.createDirectConversation(showcase.userId);
      const draft = `Hey! I saw your profile tag "${tag}" on ${gameTitle}, wanna play? 🎮`;
      useChatDraftsStore.getState().setDraft(conv.id, draft);
      navigate(`/messages/${conv.id}`);
    } catch {
      navigate('/messages');
    }
  };

  const bannerSource =
    spotlightMedia?.customBannerUrl && !imageError
      ? spotlightMedia.customBannerUrl
      : spotlightMedia?.posterUrl || '';

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] p-4.5 transition-all duration-300 hover:border-white/[0.18] shadow-xl flex flex-col gap-3.5 group"
      style={{ boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)` }}
    >
      {/* Adaptive Ambient Glow (Poster-Driven or Accent-Driven) */}
      <div
        className="absolute -inset-2 rounded-3xl opacity-35 blur-[45px] pointer-events-none transition-opacity duration-500 group-hover:opacity-50"
        style={{
          background: bannerSource
            ? `radial-gradient(circle at center, ${accent}80 0%, transparent 70%)`
            : `radial-gradient(circle at center, ${accent}60 0%, transparent 70%)`,
        }}
      />

      {/* Widget Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] relative z-10">
        <div className="flex items-center gap-2">
          <Flame size={15} className="text-amber-400 animate-pulse" />
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Spotlight Title
          </span>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={onEditClick}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Edit Spotlight"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {spotlightMedia ? (
        <div className="flex flex-col gap-3 relative z-10">
          {/* Main Hero Banner & Title */}
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#121215] aspect-[16/9] group/hero shadow-lg">
            {/* Ambient Image Glow inside Hero Frame */}
            {bannerSource && (
              <div
                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-125 pointer-events-none"
                style={{ backgroundImage: `url(${bannerSource})` }}
              />
            )}

            <img
              src={bannerSource}
              alt={spotlightMedia.title}
              onError={() => setImageError(true)}
              className="relative w-full h-full object-cover transition-transform duration-500 group-hover/hero:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <h4 className="text-sm font-extrabold text-white truncate drop-shadow-md">
                    {spotlightMedia.title}
                  </h4>
                  {spotlightMedia.subtitle && (
                    <span className="text-[11px] font-semibold text-gray-300 drop-shadow-sm truncate">
                      {spotlightMedia.subtitle}
                    </span>
                  )}
                </div>

                {spotlightMedia.rating && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-amber-500/30 text-amber-300 text-xs font-bold shrink-0">
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                    <span>{spotlightMedia.rating}</span>
                  </div>
                )}
              </div>
            </div>

            {spotlightMedia.externalUrl && (
              <a
                href={spotlightMedia.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:scale-105 transition-all shadow-md"
                title="Open title page"
              >
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* Tags List with Quick Invite Mode */}
          {spotlightMedia.tags && spotlightMedia.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {spotlightMedia.tags.map((tag, idx) => {
                const inviteActive = !isOwner && isInviteTag(tag);

                if (inviteActive) {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickInvite(tag, spotlightMedia.title)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 ring-1 ring-emerald-400/30 animate-pulse hover:bg-emerald-500/25 hover:ring-emerald-400/60 transition-all cursor-pointer shadow-sm"
                      title="Click to invite to play 🎮"
                    >
                      <Gamepad2 size={12} className="text-emerald-300 shrink-0" />
                      <span>{tag}</span>
                    </button>
                  );
                }

                return (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-gray-200 shadow-xs"
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ) : isOwner ? (
        <button
          type="button"
          onClick={onEditClick}
          className="py-6 border border-dashed border-white/10 rounded-2xl text-xs text-gray-400 hover:text-white hover:border-white/20 transition-all flex flex-col items-center justify-center gap-1.5 bg-white/[0.01] relative z-10"
        >
          <Sparkles size={18} className="text-amber-400/80" />
          <span className="font-semibold text-gray-300">Set your Spotlight favorite title</span>
          <span className="text-[10px] text-gray-500">
            Showcase your top game, anime, or series hero card
          </span>
        </button>
      ) : null}
    </div>
  );
};
