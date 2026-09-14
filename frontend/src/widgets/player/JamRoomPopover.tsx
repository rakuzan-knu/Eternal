import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users2,
  X,
  Copy,
  Check,
  Crown,
  Radio,
  Disc3,
  PartyPopper,
  Shield,
  LogOut,
  Sparkles,
  Link,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useJamStore } from '@/features/music/model/useJamStore';
import { useJamSession } from '@/features/music/model/useJamSession';

export interface JamRoomPopoverProps {
  align?: 'center' | 'right';
}

export const JamRoomPopover: React.FC<JamRoomPopoverProps> = ({ align = 'right' }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const isJamPopoverOpen = useJamStore((s) => s.isJamPopoverOpen);
  const setJamPopoverOpen = useJamStore((s) => s.setJamPopoverOpen);
  const roomId = useJamStore((s) => s.roomId);
  const hostUserId = useJamStore((s) => s.hostUserId);
  const isHost = useJamStore((s) => s.isHost);
  const hostUsername = useJamStore((s) => s.hostUsername);
  const queuePolicy = useJamStore((s) => s.queuePolicy);
  const listeners = useJamStore((s) => s.listeners);
  const roomStatus = useJamStore((s) => s.roomStatus);

  const { createJam, leaveJam, updateQueuePolicy } = useJamSession();

  // 1. Sort listeners: Host ALWAYS first! Then other listeners sorted alphabetically
  const sortedListeners = React.useMemo(() => {
    if (!listeners || listeners.length === 0) {
      if (hostUserId && hostUsername) {
        return [{ id: hostUserId, username: hostUsername, isHost: true }];
      }
      return [];
    }

    const host = listeners.find((l) => l.isHost || l.id === hostUserId);
    const others = listeners.filter((l) => !(l.isHost || l.id === hostUserId));

    others.sort((a, b) =>
      (a.username || '').localeCompare(b.username || '', undefined, { sensitivity: 'base' }),
    );

    if (host) {
      return [{ ...host, isHost: true }, ...others];
    }
    if (hostUserId && hostUsername) {
      return [{ id: hostUserId, username: hostUsername, isHost: true }, ...others];
    }
    return others;
  }, [listeners, hostUserId, hostUsername]);

  // Outside click dismiss
  useEffect(() => {
    if (!isJamPopoverOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (popoverRef.current && popoverRef.current.contains(target)) {
        return;
      }

      if (target.closest('[data-jam-toggle="true"]')) {
        return;
      }

      setJamPopoverOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isJamPopoverOpen, setJamPopoverOpen]);

  const handleCopyLink = () => {
    if (!roomId) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/music?jam=${encodeURIComponent(roomId)}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      });
    }
  };

  const isRight = align === 'right';

  return (
    <AnimatePresence>
      {isJamPopoverOpen && (
        <motion.div
          ref={popoverRef}
          key="jam-room-popover"
          data-testid="jam-room-popover"
          initial={{ opacity: 0, scale: 0.92, y: 14, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          exit={{
            opacity: 0,
            scale: 0.92,
            y: 14,
            filter: 'blur(6px)',
            transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
          }}
          transition={{
            type: 'spring',
            damping: 26,
            stiffness: 380,
            mass: 0.75,
          }}
          className={`absolute bottom-full mb-3.5 ${
            isRight ? 'right-0 sm:-right-2' : 'left-1/2 -translate-x-1/2'
          } w-[340px] sm:w-[370px] max-w-[calc(100vw-32px)] max-h-[520px] rounded-[26px] p-4 flex flex-col z-50 select-none overflow-hidden`}
          style={{
            transformOrigin: isRight ? '90% 100%' : '50% 100%',
            background:
              'linear-gradient(145deg, rgba(22, 23, 32, 0.88) 0%, rgba(11, 12, 18, 0.94) 100%)',
            backdropFilter: 'blur(40px) saturate(220%) brightness(106%)',
            WebkitBackdropFilter: 'blur(40px) saturate(220%) brightness(106%)',
            border: 'none',
            boxShadow:
              'inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 1.5px 0 rgba(255, 255, 255, 0.1), inset 0 0 12px 2px rgba(255, 255, 255, 0.04), 0 24px 48px -12px rgba(0, 0, 0, 0.75), 0 8px 16px -4px rgba(0, 0, 0, 0.5)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Liquid Top Reflection Accent */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

          {/* Visual downward notch pointing towards button */}
          <div
            className={`absolute -bottom-1.5 ${
              isRight ? 'right-6' : 'left-1/2 -translate-x-1/2'
            } w-3 h-3 bg-[#13141a] rotate-45 border-r border-b border-white/10 pointer-events-none`}
          />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.25)]">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white tracking-wide uppercase truncate">
                  Listen Together
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1.5 font-medium">
                  {roomStatus === 'reconnecting' ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <WifiOff size={10} className="animate-spin" />
                      Host reconnecting...
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Live • {sortedListeners.length} members
                    </span>
                  )}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setJamPopoverOpen(false)}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-3.5 custom-scrollbar">
            {/* If not in a room yet, offer to Start a Room */}
            {!roomId ? (
              <div className="flex flex-col items-center justify-center p-5 text-center bg-white/[0.03] rounded-2xl border border-white/[0.06]">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                  <Sparkles size={24} />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Start a Jam Room</h4>
                <p className="text-xs text-gray-400 mb-4 max-w-[240px]">
                  Listen to music in sync with friends in real time!
                </p>
                <button
                  type="button"
                  onClick={() => createJam('dj_only')}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Radio size={14} />
                  <span>Start Jam</span>
                </button>
              </div>
            ) : (
              <>
                {/* Mode Selector (Host controls or status for listeners) */}
                <div className="flex flex-col gap-2 p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {queuePolicy === 'open_queue' ? (
                        <PartyPopper size={15} className="text-amber-400" />
                      ) : (
                        <Disc3 size={15} className="text-purple-400" />
                      )}
                      <span className="text-xs font-bold text-gray-200">
                        Mode: {queuePolicy === 'open_queue' ? 'Party' : 'DJ'}
                      </span>
                    </div>

                    {isHost && (
                      <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
                        You are the host
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {queuePolicy === 'open_queue'
                      ? 'All members can add tracks to the queue freely without interrupting playback.'
                      : 'Only the host controls playback and queue. Listeners sync automatically.'}
                  </p>

                  {/* Mode Toggle Switch (Host Only) */}
                  {isHost && (
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/[0.06]">
                      <span className="text-xs text-gray-300 font-medium">
                        Allow friends to add tracks
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQueuePolicy(queuePolicy === 'open_queue' ? 'dj_only' : 'open_queue')
                        }
                        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer p-0.5 ${
                          queuePolicy === 'open_queue' ? 'bg-purple-600' : 'bg-white/20'
                        }`}
                        title="Toggle queue mode"
                      >
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={`w-5 h-5 rounded-full bg-white shadow-md ${
                            queuePolicy === 'open_queue' ? 'ml-auto' : 'ml-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>

                {/* Invite Link Button */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-semibold transition-all cursor-pointer group/invite"
                >
                  <div className="flex items-center gap-2">
                    <Link
                      size={14}
                      className="text-purple-400 group-hover/invite:scale-110 transition-transform"
                    />
                    <span>Copy Invite Link</span>
                  </div>
                  {copied ? (
                    <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                      <Check size={13} />
                      <span>Copied!</span>
                    </div>
                  ) : (
                    <Copy
                      size={13}
                      className="text-gray-400 group-hover/invite:text-white transition-colors"
                    />
                  )}
                </button>

                {/* Connected Listeners Stack */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Jam Room Members ({sortedListeners.length})
                    </span>
                  </div>

                  {/* Strictly shows up to 3 users without scrolling; scrollbar appears for additional users */}
                  <div className="flex flex-col gap-1.5 max-h-[148px] overflow-y-auto pr-1 custom-scrollbar">
                    {sortedListeners.map((listener) => {
                      const isUserHost = Boolean(listener.isHost || listener.id === hostUserId);
                      return (
                        <div
                          key={listener.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Outer wrapper does NOT clip crown badge */}
                            <div className="relative w-8 h-8 shrink-0">
                              <div className="w-full h-full rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center">
                                {listener.avatar ? (
                                  <img
                                    src={listener.avatar}
                                    alt={listener.username}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-purple-600 to-indigo-600">
                                    {listener.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              {/* Crown icon cleanly positioned over bottom-right edge, ONLY for host */}
                              {isUserHost && (
                                <div
                                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 border-2 border-[#161720] flex items-center justify-center text-black shadow-md z-10 pointer-events-none"
                                  title="Host"
                                >
                                  <Crown size={9} className="fill-black text-black" />
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-white truncate">
                                @{listener.username}
                              </span>
                              <span className="text-[9.5px] text-gray-400">
                                {isUserHost ? 'Host' : 'Listener'}
                              </span>
                            </div>
                          </div>

                          {/* Live Equalizer Mini Animation */}
                          <div className="flex items-end gap-0.5 h-3 shrink-0 px-1 opacity-75">
                            <span className="w-0.5 rounded-full bg-purple-400 h-full animate-[liveEqualizer_0.9s_ease-in-out_infinite]" />
                            <span className="w-0.5 rounded-full bg-purple-400 h-2 animate-[liveEqualizer_0.75s_ease-in-out_infinite]" />
                            <span className="w-0.5 rounded-full bg-purple-400 h-full animate-[liveEqualizer_1.1s_ease-in-out_infinite]" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {roomId && (
            <div className="pt-3 border-t border-white/[0.08] shrink-0">
              <button
                type="button"
                onClick={leaveJam}
                className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut size={13} />
                <span>{isHost ? 'End Jam' : 'Leave Jam'}</span>
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
