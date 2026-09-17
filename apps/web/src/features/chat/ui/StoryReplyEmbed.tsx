import React, { useState, useEffect } from 'react';
import { Clock, Play, Sparkles } from 'lucide-react';
import type { AttachmentView } from '../../../entities/chat/model/types';
import { storiesApi, useStoryViewerStore } from '@/entities/story';

interface StoryReplyEmbedProps {
  attachment?:
    | AttachmentView
    | { url?: string; type?: string; name?: string; size?: number; fileName?: string }
    | null;
  createdAt?: string;
  isOwnMessage?: boolean;
}

export const StoryReplyEmbed: React.FC<StoryReplyEmbedProps> = ({ attachment, createdAt }) => {
  const [hasError, setHasError] = useState(false);

  // Check 24-hour expiration based on message creation if no metadata
  const isExpired = createdAt
    ? Date.now() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000
    : false;

  const showUnavailable = !attachment?.url || hasError || isExpired;

  const isColorBackground =
    Boolean(attachment?.url?.startsWith('color:')) ||
    Boolean(attachment?.url?.startsWith('#')) ||
    Boolean(attachment?.url?.startsWith('linear-gradient'));

  const rawId = (attachment as any)?.fileName || (attachment as any)?.name || '';
  const storyId = rawId.startsWith('story_reply_') ? rawId.replace('story_reply_', '') : '';

  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string | null>(null);
  const [hasAudioTrack, setHasAudioTrack] = useState<boolean>(false);

  useEffect(() => {
    if (!storyId) return;

    // 1. Check loaded stories in story viewer store first
    const groups = useStoryViewerStore.getState().groups;
    for (const g of groups) {
      const s = g.stories.find((st) => st.id === storyId);
      if (s) {
        const overlays = Array.isArray(s.overlays) ? s.overlays : [];
        const audioOverlay = overlays.find((o) => o.type === 'audio') as any;
        const imageOverlay = overlays.find((o) => o.type === 'image') as any;
        if (audioOverlay?.trackCover) {
          setResolvedPreviewUrl(audioOverlay.trackCover);
          setHasAudioTrack(true);
          return;
        }
        if (imageOverlay?.url) {
          setResolvedPreviewUrl(imageOverlay.url);
          return;
        }
        if (s.mediaUrl && !s.mediaUrl.startsWith('color:')) {
          setResolvedPreviewUrl(s.mediaUrl);
          return;
        }
        if (audioOverlay) {
          setHasAudioTrack(true);
        }
        return;
      }
    }

    // 2. If not found in memory store and attachment.url is color-only, fetch feed
    if (isColorBackground) {
      let isMounted = true;
      storiesApi
        .getFeed()
        .then((feed) => {
          if (!isMounted || !feed) return;
          for (const g of feed) {
            const s = g.stories.find((st) => st.id === storyId);
            if (s) {
              const overlays = Array.isArray(s.overlays) ? s.overlays : [];
              const audioOverlay = overlays.find((o) => o.type === 'audio') as any;
              const imageOverlay = overlays.find((o) => o.type === 'image') as any;
              if (audioOverlay?.trackCover) {
                setResolvedPreviewUrl(audioOverlay.trackCover);
                setHasAudioTrack(true);
                return;
              }
              if (imageOverlay?.url) {
                setResolvedPreviewUrl(imageOverlay.url);
                return;
              }
              if (s.mediaUrl && !s.mediaUrl.startsWith('color:')) {
                setResolvedPreviewUrl(s.mediaUrl);
                return;
              }
              if (audioOverlay) {
                setHasAudioTrack(true);
              }
              return;
            }
          }
        })
        .catch(() => {});

      return () => {
        isMounted = false;
      };
    }
  }, [storyId, isColorBackground]);

  const effectiveUrl = resolvedPreviewUrl || (attachment as any)?.thumbnailUrl || attachment?.url;

  const isEffectiveImage =
    Boolean(effectiveUrl) &&
    !effectiveUrl?.startsWith('color:') &&
    !effectiveUrl?.startsWith('#') &&
    !effectiveUrl?.startsWith('linear-gradient');

  const handleOpenStory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showUnavailable) return;

    try {
      const feed = await storiesApi.getFeed();
      if (!feed || feed.length === 0) {
        setHasError(true);
        return;
      }

      if (storyId) {
        let foundGroupIdx = -1;
        let foundStoryIdx = -1;
        for (let g = 0; g < feed.length; g++) {
          const sIdx = feed[g].stories.findIndex((s) => s.id === storyId);
          if (sIdx !== -1) {
            foundGroupIdx = g;
            foundStoryIdx = sIdx;
            break;
          }
        }
        if (foundGroupIdx !== -1 && foundStoryIdx !== -1) {
          useStoryViewerStore.getState().openViewer(feed, foundGroupIdx, foundStoryIdx);
          return;
        }
      }

      // If story was not found in active feed, it expired or was deleted
      setHasError(true);
    } catch {
      // Fallback
    }
  };

  if (showUnavailable) {
    return (
      <div className="mb-2.5 p-2.5 rounded-2xl bg-[#12131d]/90 backdrop-blur-2xl border border-white/8 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-all select-none">
        <div className="w-10 h-14 rounded-xl bg-white/4 border border-white/10 shrink-0 flex items-center justify-center backdrop-blur-md shadow-inner">
          <Clock size={18} className="text-purple-300/70 animate-pulse" />
        </div>
        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-purple-300 tracking-tight">
              Reply to story
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400/40" />
          </div>
          <span className="text-[11px] text-gray-400 font-normal leading-snug mt-0.5">
            Story is unavailable or has expired
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleOpenStory}
      className="mb-2.5 p-2 rounded-2xl bg-[#14141e]/90 backdrop-blur-xl border border-purple-500/25 flex items-center gap-2.5 shadow-[0_4px_16px_rgba(139,92,246,0.15)] group/story hover:border-purple-500/50 hover:bg-[#1c1c2b] transition-all cursor-pointer select-none"
      title="Click to view story"
    >
      <div className="relative w-10 h-14 rounded-xl overflow-hidden bg-purple-950/60 border border-white/15 shrink-0 flex items-center justify-center">
        {attachment.type === 'VIDEO' ? (
          <>
            <video
              src={attachment.url}
              className="w-full h-full object-cover"
              onError={() => setHasError(true)}
              muted
              playsInline
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Play size={12} className="text-white fill-white drop-shadow-md" />
            </div>
          </>
        ) : isEffectiveImage ? (
          <div className="relative w-full h-full">
            <img
              src={effectiveUrl}
              alt="Story Preview"
              className="w-full h-full object-cover group-hover/story:scale-105 transition-transform duration-300"
              onError={() => setHasError(true)}
            />
            {hasAudioTrack && (
              <div className="absolute bottom-0.5 right-0.5 p-0.5 rounded-full bg-black/70 backdrop-blur-sm shadow">
                <Sparkles size={8} className="text-pink-300" />
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              background:
                attachment.url?.replace('color:', '') ||
                'linear-gradient(135deg, #4c1d95, #1e1b4b)',
            }}
            className="w-full h-full flex flex-col items-center justify-center group-hover/story:scale-105 transition-transform duration-300"
          >
            <Sparkles size={13} className="text-purple-300 drop-shadow-sm" />
          </div>
        )}
      </div>

      <div className="flex flex-col min-w-0 pr-1">
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-bold text-purple-300 group-hover/story:text-purple-200 transition-colors">
            Reply to story
          </span>
          <Sparkles size={11} className="text-purple-400 shrink-0" />
        </div>
        <span className="text-[11px] text-gray-400 group-hover/story:text-gray-300 line-clamp-1">
          Click to view
        </span>
      </div>
    </div>
  );
};
