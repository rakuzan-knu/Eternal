import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Volume2,
  VolumeX,
  MoreHorizontal,
  Trash2,
  Send,
  Eye,
  Star,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AtSign,
  Heart,
  Flame,
  Zap,
  PartyPopper,
  Sparkles,
} from 'lucide-react';
import { useStoryViewerStore } from '../model/useStoryViewerStore';
import {
  useViewStory,
  useReactStory,
  useVoteStoryPoll,
  useReplyStory,
  useDeleteStory,
} from '../model/useStories';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import Avatar from '@/shared/ui/Avatar';
import { reactionBurstEngine } from '@/features/chat/lib/reactionBurstEngine';
import { formatRelativeTime } from '@/shared/lib/formatRelativeTime';
import { getSocket } from '@/shared/api/socket';
import type { StoryViewResponse, UserStoriesGroup } from '../model/types';
import { storiesApi } from '../api/storiesApi';

const FAST_REACTIONS = ['❤️', '🔥', '🎉', '😭', '⚡', '😈', '👏', '😍'];

export function StoryViewerModal() {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

  const {
    isOpen,
    groups,
    activeGroupIndex,
    activeStoryIndex,
    isPaused,
    isBuffering,
    isMuted,
    closeViewer,
    nextStory,
    prevStory,
    setGroupAndStory,
    setPaused,
    setBuffering,
    toggleMute,
    setVideoProgress,
  } = useStoryViewerStore();

  const viewStoryMutation = useViewStory();
  const reactStoryMutation = useReactStory();
  const votePollMutation = useVoteStoryPoll();
  const replyStoryMutation = useReplyStory();
  const deleteStoryMutation = useDeleteStory();

  // Active Story & Group
  const currentGroup: UserStoriesGroup | undefined = groups[activeGroupIndex];
  const activeStory: StoryViewResponse | undefined = currentGroup?.stories[activeStoryIndex];
  const isOwnStory = Boolean(currentUser && activeStory && activeStory.authorId === currentUser.id);

  // Local state
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [viewersData, setViewersData] = useState<{ totalViews: number; viewers: any[] } | null>(
    null,
  );
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPressHoldingRef = useRef(false);

  // Mark active story as viewed
  useEffect(() => {
    if (
      activeStory &&
      !activeStory.hasViewed &&
      currentUser &&
      activeStory.authorId !== currentUser.id
    ) {
      viewStoryMutation.mutate(activeStory.id);
    }
  }, [activeStory?.id]);

  // Real-time synchronization for active story (views, reactions, poll updates in Seen-by drawer and screen)
  useEffect(() => {
    if (!activeStory?.id) return;
    const storyId = activeStory.id;

    let socket: ReturnType<typeof getSocket> | null = null;
    try {
      socket = getSocket();
    } catch {
      return;
    }
    if (!socket) return;

    socket.emit('subscribeStory', { storyId });

    const handleLiveView = (payload: { storyId: string; viewer: any; viewedAt: string }) => {
      if (payload.storyId !== storyId) return;
      setViewersData((prev) => {
        if (!prev) {
          return {
            totalViews: 1,
            viewers: [{ user: payload.viewer, viewedAt: payload.viewedAt, reaction: null }],
          };
        }
        const alreadyIn = prev.viewers.some((v) => v.user.id === payload.viewer.id);
        if (alreadyIn) return prev;
        return {
          totalViews: prev.totalViews + 1,
          viewers: [
            { user: payload.viewer, viewedAt: payload.viewedAt, reaction: null },
            ...prev.viewers,
          ],
        };
      });
    };

    const handleLiveReaction = (payload: {
      storyId: string;
      userId: string;
      user: any;
      emoji: string;
    }) => {
      if (payload.storyId !== storyId) return;
      setViewersData((prev) => {
        if (!prev) return prev;
        const exists = prev.viewers.some((v) => v.user.id === payload.userId);
        if (exists) {
          return {
            ...prev,
            viewers: prev.viewers.map((v) =>
              v.user.id === payload.userId ? { ...v, reaction: payload.emoji } : v,
            ),
          };
        }
        return {
          totalViews: prev.totalViews + 1,
          viewers: [
            { user: payload.user, viewedAt: new Date().toISOString(), reaction: payload.emoji },
            ...prev.viewers,
          ],
        };
      });

      // Trigger real-time reaction burst on screen
      const target = document.getElementById('story-canvas-container');
      if (target) {
        const rect = target.getBoundingClientRect();
        reactionBurstEngine.triggerBurst(
          rect.left + rect.width / 2,
          rect.bottom - 80,
          payload.emoji,
        );
      }
    };

    const handleLivePoll = (payload: { storyId: string; pollResult: any }) => {
      if (payload.storyId !== storyId || !payload.pollResult) return;
      const currentGroups = useStoryViewerStore.getState().groups;
      const updated = currentGroups.map((g, gIdx) => {
        if (gIdx !== activeGroupIndex) return g;
        return {
          ...g,
          stories: g.stories.map((s, sIdx) => {
            if (sIdx !== activeStoryIndex) return s;
            return {
              ...s,
              pollResult: payload.pollResult,
            };
          }),
        };
      });
      useStoryViewerStore.getState().setGroups(updated);
    };

    socket.on('story:viewed', handleLiveView);
    socket.on('story:reacted', handleLiveReaction);
    socket.on('story:poll_voted', handleLivePoll);

    return () => {
      socket.emit('unsubscribeStory', { storyId });
      socket.off('story:viewed', handleLiveView);
      socket.off('story:reacted', handleLiveReaction);
      socket.off('story:poll_voted', handleLivePoll);
    };
  }, [activeStory?.id, activeGroupIndex, activeStoryIndex]);

  // Media Prefetching: prefetch next 1-2 stories in background
  useEffect(() => {
    if (!currentGroup) return;

    // Prefetch next story in current group or next group
    let nextStoryItem: StoryViewResponse | undefined;
    if (activeStoryIndex < currentGroup.stories.length - 1) {
      nextStoryItem = currentGroup.stories[activeStoryIndex + 1];
    } else if (activeGroupIndex < groups.length - 1) {
      nextStoryItem = groups[activeGroupIndex + 1]?.stories[0];
    }

    if (nextStoryItem?.mediaUrl && !nextStoryItem.mediaUrl.startsWith('color:')) {
      if (nextStoryItem.mediaType === 'IMAGE') {
        const img = new Image();
        img.src = nextStoryItem.mediaUrl;
      }
    }
  }, [activeGroupIndex, activeStoryIndex, groups]);

  // Progress Bar for Images / Voice (5 seconds fixed)
  useEffect(() => {
    setProgress(0);
    if (!activeStory) return;

    // If video: progress is controlled by video onTimeUpdate event
    if (activeStory.mediaType === 'VIDEO') return;

    const durationMs = activeStory.mediaType === 'VOICE' ? 7000 : 5000;
    const intervalMs = 50;
    const increment = (intervalMs / durationMs) * 100;

    const timer = setInterval(() => {
      if (isPaused || isBuffering) return;

      setProgress((prev) => {
        if (prev >= 100) {
          nextStory();
          return 0;
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [activeStory?.id, isPaused, isBuffering]);

  // Video Time Update & Buffering Sync
  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    setProgress(pct);
    setVideoProgress(video.currentTime / video.duration);
  };

  const handleVideoEnded = () => {
    nextStory();
  };

  // Keyboard navigation & hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') {
        nextStory();
      } else if (e.key === 'ArrowLeft') {
        prevStory();
      } else if (e.key === 'Escape') {
        closeViewer();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (
        e.key === ' ' &&
        !['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())
      ) {
        e.preventDefault();
        setPaused(!isPaused);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPaused, nextStory, prevStory, closeViewer, toggleMute, setPaused]);

  // Tap navigation: Left 30% = back, Right 70% = forward
  const handleCardTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPressHoldingRef.current) {
      isPressHoldingRef.current = false;
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftSection = clickX < rect.width * 0.3;

    if (isLeftSection) {
      prevStory();
    } else {
      nextStory();
    }
  };

  // Press & Hold to pause
  const handlePointerDown = () => {
    pressTimerRef.current = setTimeout(() => {
      isPressHoldingRef.current = true;
      setPaused(true);
      if (videoRef.current) videoRef.current.pause();
    }, 180);
  };

  const handlePointerUp = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    if (isPaused) {
      setPaused(false);
      if (videoRef.current) videoRef.current.play().catch(() => {});
    }
  };

  // Trigger Reaction with Explosive Particles
  const handleReaction = (emoji: string, e: React.MouseEvent) => {
    if (!activeStory) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    reactionBurstEngine.triggerBurst(rect.left + rect.width / 2, rect.top, emoji);
    reactStoryMutation.mutate({ storyId: activeStory.id, emoji });
  };

  // Send Direct Message Reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeStory || isSendingReply) return;

    setIsSendingReply(true);
    try {
      await replyStoryMutation.mutateAsync({
        storyId: activeStory.id,
        text: replyText.trim(),
      });
      setReplyText('');
    } catch {
      // reply error fallback
    } finally {
      setIsSendingReply(false);
    }
  };

  // Load Viewers List for Story Author
  const handleOpenViewersSheet = async () => {
    if (!activeStory || !isOwnStory) return;
    setShowViewersSheet(true);
    setIsLoadingViewers(true);
    setPaused(true);

    try {
      const data = await storiesApi.getStoryViewers(activeStory.id);
      setViewersData(data);
    } catch {
      // view error
    } finally {
      setIsLoadingViewers(false);
    }
  };

  // Delete own story
  const handleDeleteStory = async () => {
    if (!activeStory || !isOwnStory) return;
    if (confirm('Вы уверены, что хотите удалить эту историю?')) {
      await deleteStoryMutation.mutateAsync(activeStory.id);
      nextStory();
    }
  };

  if (!isOpen || !currentGroup || !activeStory) return null;

  // Previous and Next groups for 3D perspective display
  const prevGroup = activeGroupIndex > 0 ? groups[activeGroupIndex - 1] : null;
  const nextGroup = activeGroupIndex < groups.length - 1 ? groups[activeGroupIndex + 1] : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black/95 backdrop-blur-3xl select-none animate-fadeIn">
        {/* Dynamic Blurred Backdrop Tint */}
        <div
          className="absolute inset-0 opacity-25 filter blur-3xl scale-125 pointer-events-none transition-all duration-700"
          style={{
            background:
              activeStory.mediaUrl && !activeStory.mediaUrl.startsWith('color:')
                ? `url(${activeStory.mediaUrl}) center/cover no-repeat`
                : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)',
          }}
        />

        {/* Global Close Button */}
        <button
          type="button"
          onClick={closeViewer}
          aria-label="Close story viewer"
          className="absolute top-6 right-6 z-50 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xl hover:scale-105"
        >
          <X size={22} />
        </button>

        {/* 3D Cover Flow Carousel Container */}
        <div className="relative w-full h-full flex items-center justify-center perspective-[1200px]">
          {/* Left Neighbor Card (3D Rotated) */}
          {prevGroup && (
            <div
              onClick={() => setGroupAndStory(activeGroupIndex - 1, 0)}
              style={{
                transform: 'perspective(1000px) translateZ(-90px) rotateY(25deg) translateX(-60px)',
              }}
              className="hidden md:flex absolute left-8 lg:left-24 w-[280px] aspect-[9/16] max-h-[68vh] rounded-3xl overflow-hidden border border-white/10 opacity-40 brightness-75 hover:opacity-75 hover:brightness-100 transition-all duration-300 cursor-pointer shadow-2xl z-10"
            >
              {prevGroup.stories[0]?.mediaType === 'VIDEO' ? (
                <video
                  src={prevGroup.stories[0]?.mediaUrl}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={
                    prevGroup.stories[0]?.mediaUrl.startsWith('color:')
                      ? undefined
                      : prevGroup.stories[0]?.mediaUrl
                  }
                  alt="Previous Story"
                  className="w-full h-full object-cover bg-purple-900"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between p-4">
                <div className="flex items-center gap-2">
                  <Avatar src={prevGroup.user.avatar} size="xs" />
                  <span className="text-xs font-bold text-white truncate">
                    {prevGroup.user.displayName || prevGroup.user.username}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Central Active Story Card (with Drag Down to Dismiss) */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.6}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 120) {
                closeViewer();
              }
            }}
            className="relative w-full max-w-[390px] aspect-[9/16] max-h-[82vh] rounded-3xl overflow-hidden border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.85)] z-20 flex flex-col justify-between"
            style={{
              background: activeStory.mediaUrl.startsWith('color:')
                ? activeStory.mediaUrl.replace('color:', '')
                : '#09090b',
            }}
          >
            {/* Story Media Background */}
            <div
              onClick={handleCardTap}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="absolute inset-0 w-full h-full cursor-pointer"
            >
              {activeStory.mediaType === 'IMAGE' && !activeStory.mediaUrl.startsWith('color:') && (
                <img
                  src={activeStory.mediaUrl}
                  alt="Story"
                  className="w-full h-full object-cover pointer-events-none"
                />
              )}

              {activeStory.mediaType === 'VIDEO' && (
                <video
                  ref={videoRef}
                  src={activeStory.mediaUrl}
                  autoPlay
                  playsInline
                  muted={isMuted}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoEnded}
                  onWaiting={() => setBuffering(true)}
                  onStalled={() => setBuffering(true)}
                  onPlaying={() => setBuffering(false)}
                  onCanPlay={() => setBuffering(false)}
                  className="w-full h-full object-cover pointer-events-none"
                />
              )}

              {/* Overlays Rendering in Normalized Percentage Coordinates */}
              {activeStory.overlays?.map((overlay) => (
                <div
                  key={overlay.id}
                  style={{
                    left: `${overlay.xPercent}%`,
                    top: `${overlay.yPercent}%`,
                    transform: `translate(-50%, -50%) rotate(${overlay.rotation ?? 0}deg) scale(${
                      overlay.scale ?? 1
                    })`,
                  }}
                  className="absolute z-20 pointer-events-auto select-none"
                >
                  {/* 1. Text Overlay */}
                  {overlay.type === 'text' && (
                    <div
                      style={{ color: overlay.color }}
                      className={`px-3 py-1.5 rounded-2xl text-center font-bold text-base max-w-[270px] leading-snug ${
                        overlay.fontFamily === 'neon'
                          ? 'drop-shadow-[0_0_12px_rgba(236,72,153,0.85)] font-sans'
                          : overlay.fontFamily === 'cyberpunk'
                            ? 'font-mono tracking-wider'
                            : overlay.fontFamily === 'serif'
                              ? 'font-serif italic'
                              : 'font-sans'
                      } ${
                        overlay.backgroundStyle === 'solid'
                          ? 'bg-black/75 backdrop-blur-md border border-white/10'
                          : overlay.backgroundStyle === 'neon'
                            ? 'bg-purple-600/80 border border-pink-400 shadow-[0_0_15px_rgba(168,85,247,0.7)]'
                            : overlay.backgroundStyle === 'glass'
                              ? 'bg-white/15 backdrop-blur-xl border border-white/20'
                              : ''
                      }`}
                    >
                      {overlay.text}
                    </div>
                  )}

                  {/* 2. Poll Overlay with Interactive Voting */}
                  {overlay.type === 'poll' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="w-[260px] bg-[#14141c]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 shadow-2xl flex flex-col gap-2.5"
                    >
                      <span className="text-xs font-bold text-white text-center">
                        {overlay.question}
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {overlay.options.map((opt, idx) => {
                          const pollResult = activeStory.pollResult;
                          const hasVoted =
                            pollResult?.userVotedIndex !== null &&
                            pollResult?.userVotedIndex !== undefined;
                          const optResult = pollResult?.options?.[idx];
                          const isSelected = pollResult?.userVotedIndex === idx;

                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={votePollMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                votePollMutation.mutate({
                                  storyId: activeStory.id,
                                  optionIndex: idx,
                                });
                              }}
                              className={`relative w-full py-2.5 px-3.5 rounded-2xl border text-xs font-bold text-left transition-all overflow-hidden flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-600/30 text-white'
                                  : 'border-white/10 bg-white/5 hover:bg-white/15 text-gray-200'
                              }`}
                            >
                              {/* Animated Percentage Fill Bar */}
                              {hasVoted && optResult && (
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${optResult.percentage}%` }}
                                  transition={{ duration: 0.4, ease: 'easeOut' }}
                                  className="absolute left-0 top-0 bottom-0 bg-purple-500/25 pointer-events-none rounded-2xl"
                                />
                              )}
                              <span className="relative z-10 truncate">{opt.text}</span>
                              {hasVoted && optResult && (
                                <span className="relative z-10 text-[11px] font-black text-purple-300 ml-2">
                                  {optResult.percentage}%
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Link Overlay */}
                  {overlay.type === 'link' && (
                    <a
                      href={overlay.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black font-black text-xs shadow-2xl hover:scale-105 transition-transform"
                    >
                      <ExternalLink size={13} className="stroke-[2.5]" />
                      <span>{overlay.title}</span>
                    </a>
                  )}

                  {/* 4. Mention Overlay */}
                  {overlay.type === 'mention' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeViewer();
                        navigate(`/profile/${overlay.username}`);
                      }}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-lg hover:scale-105 transition-transform cursor-pointer"
                    >
                      <AtSign size={13} />
                      <span>{overlay.username}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Top Header & Segmented Progress Bars */}
            <div className="relative z-30 pt-3 px-3 pb-6 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none">
              {/* Segmented Progress Bars */}
              <div className="flex items-center gap-1 w-full mb-2.5">
                {currentGroup.stories.map((s, idx) => {
                  const isCurrent = idx === activeStoryIndex;
                  const isPassed = idx < activeStoryIndex;
                  const fillPercent = isPassed ? 100 : isCurrent ? progress : 0;

                  return (
                    <div key={s.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${fillPercent}%` }}
                        className="h-full bg-white rounded-full transition-all duration-75"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Author Info Bar */}
              <div className="flex items-center justify-between pointer-events-auto">
                <div
                  onClick={() => {
                    closeViewer();
                    navigate(`/profile/${currentGroup.user.username}`);
                  }}
                  className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <Avatar src={currentGroup.user.avatar} size="sm" />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate max-w-[140px]">
                        {currentGroup.user.displayName || currentGroup.user.username}
                      </span>
                      {activeStory.privacy === 'CLOSE_FRIENDS' && (
                        <div
                          className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[8px] font-black"
                          title="Close Friends"
                        >
                          ★
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {formatRelativeTime(activeStory.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Right Action Controls */}
                <div className="flex items-center gap-1">
                  {/* Sound Toggle (Mute / Unmute) */}
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>

                  {/* Author More Menu */}
                  {isOwnStory && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowMenu((v) => !v)}
                        className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {showMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-[#18181f] border border-white/10 rounded-2xl p-1.5 shadow-2xl z-50 min-w-[140px]">
                          <button
                            type="button"
                            onClick={() => {
                              setShowMenu(false);
                              handleDeleteStory();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                            <span>Удалить</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Footer: Reply Input + Reactions + Viewers */}
            <div className="relative z-30 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2 pointer-events-auto">
              {/* If Own Story: Viewers Button */}
              {isOwnStory ? (
                <button
                  type="button"
                  onClick={handleOpenViewersSheet}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer backdrop-blur-md shadow-lg"
                >
                  <Eye size={16} className="text-purple-400" />
                  <span>Просмотры ({activeStory.viewsCount})</span>
                </button>
              ) : (
                <>
                  {/* Fast Reaction Bar */}
                  <div className="flex items-center justify-between gap-1 px-1">
                    {FAST_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={(e) => handleReaction(emoji, e)}
                        className="text-xl hover:scale-135 active:scale-95 transition-transform cursor-pointer filter drop-shadow-md"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Direct Message Reply Input */}
                  <form onSubmit={handleSendReply} className="flex items-center gap-2 w-full mt-1">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onFocus={() => setPaused(true)}
                      onBlur={() => setPaused(false)}
                      placeholder={`Ответить ${
                        currentGroup.user.displayName || currentGroup.user.username
                      }...`}
                      className="flex-1 bg-white/10 border border-white/15 focus:border-purple-500 rounded-full px-4 py-2 text-xs text-white placeholder-gray-400 backdrop-blur-xl focus:outline-none transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || isSendingReply}
                      className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
                    >
                      <Send size={15} className="translate-x-0.5" />
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>

          {/* Right Neighbor Card (3D Rotated) */}
          {nextGroup && (
            <div
              onClick={() => setGroupAndStory(activeGroupIndex + 1, 0)}
              style={{
                transform: 'perspective(1000px) translateZ(-90px) rotateY(-25deg) translateX(60px)',
              }}
              className="hidden md:flex absolute right-8 lg:right-24 w-[280px] aspect-[9/16] max-h-[68vh] rounded-3xl overflow-hidden border border-white/10 opacity-40 brightness-75 hover:opacity-75 hover:brightness-100 transition-all duration-300 cursor-pointer shadow-2xl z-10"
            >
              {nextGroup.stories[0]?.mediaType === 'VIDEO' ? (
                <video
                  src={nextGroup.stories[0]?.mediaUrl}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={
                    nextGroup.stories[0]?.mediaUrl.startsWith('color:')
                      ? undefined
                      : nextGroup.stories[0]?.mediaUrl
                  }
                  alt="Next Story"
                  className="w-full h-full object-cover bg-indigo-900"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between p-4">
                <div className="flex items-center gap-2">
                  <Avatar src={nextGroup.user.avatar} size="xs" />
                  <span className="text-xs font-bold text-white truncate">
                    {nextGroup.user.displayName || nextGroup.user.username}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Viewers & Reactions Drawer for Story Author */}
        {showViewersSheet && (
          <div className="absolute inset-x-0 bottom-0 z-50 max-h-[60vh] bg-[#14141c]/95 backdrop-blur-2xl border-t border-white/15 rounded-t-3xl p-5 shadow-2xl flex flex-col gap-4 animate-slideUp">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">
                Просмотры ({viewersData?.totalViews || 0})
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowViewersSheet(false);
                  setPaused(false);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[45vh] flex flex-col gap-2.5 pr-1">
              {isLoadingViewers ? (
                <div className="py-8 text-center text-gray-500 text-xs">Загрузка просмотров...</div>
              ) : viewersData?.viewers && viewersData.viewers.length > 0 ? (
                viewersData.viewers.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-3 rounded-2xl bg-white/[0.03] border border-white/5"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar src={item.user.avatar} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate">
                          {item.user.displayName || item.user.username}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatRelativeTime(item.viewedAt)}
                        </span>
                      </div>
                    </div>

                    {item.reaction && (
                      <span className="text-lg filter drop-shadow-md">{item.reaction}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 text-xs">
                  Пока никто не посмотрел эту историю
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
