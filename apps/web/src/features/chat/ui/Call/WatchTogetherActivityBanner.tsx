import React, { useEffect } from 'react';
import { Play, X, Tv } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useCallStore } from '../../model/callStore';
import { useWatchTogetherStore } from '../../model/useWatchTogetherStore';
import { getSocket } from '@/shared/api/socket';

interface WatchTogetherActivityBannerProps {
  conversationId?: string;
  className?: string;
}

export function WatchTogetherActivityBanner({
  conversationId,
  className = '',
}: WatchTogetherActivityBannerProps) {
  const currentUserId = useAuthStore((s) => s.userId);
  const isSyncPlayOpen = useCallStore((s) => s.isSyncPlayOpen);
  const setIsSyncPlayOpen = useCallStore((s) => s.setIsSyncPlayOpen);

  const activeActivity = useWatchTogetherStore((s) => s.activeActivity);
  const dismissedActivities = useWatchTogetherStore((s) => s.dismissedActivities);
  const setActiveActivity = useWatchTogetherStore((s) => s.setActiveActivity);
  const dismissActivity = useWatchTogetherStore((s) => s.dismissActivity);
  const setActiveMedia = useWatchTogetherStore((s) => s.setActiveMedia);
  const setCurrentTime = useWatchTogetherStore((s) => s.setCurrentTime);
  const setIsPlaying = useWatchTogetherStore((s) => s.setIsPlaying);

  // Global socket listener to capture activity invitations from any room member
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleSyncEvent = (data: any) => {
      if (!data || data.senderUserId === currentUserId) return;

      if ((data.action === 'activity_start' || data.action === 'change_media') && data.media) {
        setActiveActivity({
          conversationId: data.conversationId,
          initiatorId: data.initiator?.id || data.senderUserId || 'remote',
          initiatorName: data.initiator?.name || 'Call participant',
          initiatorAvatar: data.initiator?.avatar || null,
          media: data.media,
          timestamp: data.timestamp || 0,
          isPlaying: data.state !== 'paused',
        });
      } else if (data.action === 'activity_end') {
        setActiveActivity(null);
      }
    };

    socket.on('watchtogether:sync', handleSyncEvent);
    return () => {
      socket.off('watchtogether:sync', handleSyncEvent);
    };
  }, [currentUserId, setActiveActivity]);

  if (!activeActivity) return null;
  if (conversationId && activeActivity.conversationId !== conversationId) return null;
  // Don't show the invitation to the user who started it
  if (activeActivity.initiatorId === currentUserId) return null;
  // Don't show if user already dismissed or is currently in the player
  if (dismissedActivities[activeActivity.conversationId] || isSyncPlayOpen) return null;

  const handleJoin = () => {
    setActiveMedia(activeActivity.media);
    setCurrentTime(activeActivity.timestamp || 0);
    setIsPlaying(activeActivity.isPlaying);
    setIsSyncPlayOpen(true);
  };

  return (
    <div
      role="alert"
      className={`mx-3 sm:mx-4 my-2 p-2.5 sm:p-3 rounded-2xl bg-neutral-950/90 border border-purple-500/30 text-white shadow-[0_8px_30px_rgba(168,85,247,0.25)] backdrop-blur-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200 z-30 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar
          src={activeActivity.initiatorAvatar}
          name={activeActivity.initiatorName}
          size="sm"
          suppressDecoration={true}
          className="ring-2 ring-purple-500/40 shrink-0"
        />

        {activeActivity.media.thumbnailUrl && (
          <img
            src={activeActivity.media.thumbnailUrl}
            alt={activeActivity.media.title}
            className="w-12 h-8 rounded-lg object-cover border border-white/10 shrink-0 hidden xs:block bg-neutral-900"
          />
        )}

        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
            <span className="text-purple-300">{activeActivity.initiatorName}</span>
            <span className="font-normal text-neutral-300">started watching video together</span>
          </p>
          <p className="text-[11px] text-neutral-400 truncate max-w-xs sm:max-w-md">
            {activeActivity.media.title}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleJoin}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(168,85,247,0.4)] active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Join</span>
        </button>

        <button
          type="button"
          onClick={() => dismissActivity(activeActivity.conversationId)}
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          title="Close"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
