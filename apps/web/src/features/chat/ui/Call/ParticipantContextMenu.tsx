import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Eye, Settings, Loader2 } from 'lucide-react';
import type { UserSnapshot } from '@common/contracts';

import { useCallStore } from '../../model/callStore';
import { useCall } from '../../model/CallContext';
import { useUIStore } from '@/shared/model/useUIStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useBlockedUsers } from '../../model/useBlockedUsers';
import { useBlockUser, useUnblockUser } from '../../model/useConversationMutations';
import { useFriends } from '@/features/follow/model/useFriends';
import { useFollowMutation } from '@/features/follow/model/useFollowMutation';
import { userApi } from '@/entities/profile/api/userApi';
import { useQuery } from '@tanstack/react-query';
import { USER_KEY } from '@/shared/api/queryKeys';
import { chatApi } from '@/entities/chat';
import { globalSpeakerMixerManager, useSpeakerMixer } from '../../lib/webrtc/perSpeakerMixer';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { triggerCallPiPTransition, getPiPLastCenter } from '../../lib/webrtc/callPiPTransition';

export interface ParticipantContextMenuProps {
  user: UserSnapshot;
  isLocal: boolean;
  coords: { x: number; y: number } | null;
  onClose: () => void;
  onOpenPreview: () => void;
}

function DiscordCheckbox({ checked, disabled = false }: { checked: boolean; disabled?: boolean }) {
  return (
    <motion.div
      animate={{
        scale: checked ? [0.82, 1.14, 1] : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 24,
      }}
      className={`w-[18px] h-[18px] rounded-[4px] flex items-center justify-center transition-colors duration-150 shrink-0 ${
        disabled
          ? 'bg-[#7c3aed]/30 border border-[#7c3aed]/30 cursor-not-allowed text-white/40'
          : checked
            ? 'bg-[#7059f6] border border-violet-300/40 group-hover:bg-[#281156] group-hover:border-white text-white shadow-[0_2px_8px_rgba(112,89,246,0.35)]'
            : 'border-2 border-zinc-500 bg-zinc-800/20 group-hover:border-white group-hover:bg-[#281156]/40'
      }`}
    >
      <AnimatePresence mode="wait">
        {checked && (
          <motion.svg
            key="check-icon"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{
              scale: 0.1,
              opacity: 0,
              transition: { duration: 0.12, ease: 'easeIn' },
            }}
            transition={{ type: 'spring', stiffness: 520, damping: 24 }}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="overflow-visible"
          >
            <motion.polyline
              points="20 6 9 17 4 12"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              exit={{ pathLength: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DiscordVolumeSlider({
  value,
  onChange,
}: {
  value: number; // 0 to 200
  onChange: (v: number) => void;
}) {
  const percent = Math.min(200, Math.max(0, value));
  const fillPercentage = (percent / 200) * 100;

  return (
    <div className="flex flex-col gap-1.5 px-2.5 py-1.5 select-none">
      <div className="flex items-center justify-between text-[12px] text-zinc-300 font-semibold tracking-wide">
        <span>User Volume</span>
        <span className="text-[11px] font-mono text-zinc-400">{Math.round(percent)}%</span>
      </div>
      <div className="relative flex items-center h-5">
        <input
          type="range"
          min="0"
          max="200"
          step="1"
          value={percent}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none bg-zinc-700/60 accent-[#7059f6] focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#7059f6] [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.5)] hover:[&::-webkit-slider-thumb]:scale-115 transition-transform"
          style={{
            background: `linear-gradient(to right, #8b5cf6 0%, #7059f6 ${fillPercentage}%, rgba(82, 82, 91, 0.6) ${fillPercentage}%, rgba(82, 82, 91, 0.6) 100%)`,
          }}
        />
      </div>
    </div>
  );
}

export function ParticipantContextMenu({
  user,
  isLocal,
  coords,
  onClose,
  onOpenPreview,
}: ParticipantContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const { data: currentUser } = useCurrentUser();
  const openEditProfile = useUIStore((s) => s.openEditProfile);

  // Call state & controls
  const { isMuted: isSelfMuted, isDeafened: isSelfDeafened, remoteStreams } = useCallStore();
  const { toggleMute, toggleDeafen, endCall, initiateCall } = useCall();

  // Speaker mixer state for remote participant
  const { profile: speakerProfile, update: updateSpeakerProfile } = useSpeakerMixer(
    !isLocal ? user.id : undefined,
  );

  // Blocked users
  const { data: blockedUsers } = useBlockedUsers();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const isBlocked = Boolean(!isLocal && user?.id && blockedUsers?.some((b) => b.id === user.id));

  // Follow / Friends state
  const { data: friendsList } = useFriends();
  const isFriend = Boolean(!isLocal && user?.id && friendsList?.some((f) => f.id === user.id));

  const { data: targetUserProfile } = useQuery({
    queryKey: [USER_KEY, user.id],
    queryFn: () => userApi.getProfile(user.id),
    enabled: Boolean(!isLocal && user?.id),
    staleTime: 30 * 1000,
  });

  const isFollowing = Boolean(
    isFriend || targetUserProfile?.isFollowing || targetUserProfile?.followStatus === 'following',
  );
  const followMutation = useFollowMutation(user.id, isFollowing);

  const [isStartingCall, setIsStartingCall] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Closes on outside click, escape, or outside contextmenu
  useEffect(() => {
    if (!coords) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScrollOrResize = () => {
      onClose();
    };

    const handleContextMenuOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('contextmenu', handleContextMenuOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('contextmenu', handleContextMenuOutside, true);
    };
  }, [coords, onClose]);

  // Position calculation with boundary protection
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!coords) return;
    const menuWidth = 224;
    const menuHeight = isLocal ? 250 : 340;

    let posX = coords.x;
    let posY = coords.y;

    if (posX + menuWidth > window.innerWidth - 10) {
      posX = Math.max(10, window.innerWidth - menuWidth - 10);
    }
    if (posY + menuHeight > window.innerHeight - 10) {
      posY = Math.max(10, window.innerHeight - menuHeight - 10);
    }

    setMenuPos({ x: posX, y: posY });
  }, [coords, isLocal]);

  // 1. Handlers for Self Context Menu
  const handleSelfProfile = useCallback(() => {
    onClose();
    const username = currentUser?.username || user?.username || currentUser?.id || 'me';
    triggerCallPiPTransition('minimize', getPiPLastCenter(), () => {
      useCallStore.getState().setIsPiP(true);
      navigate(`/profile/${username}`);
    });
  }, [currentUser, user, navigate, onClose]);

  const handleOpenVoiceSettings = useCallback(() => {
    onClose();
    openEditProfile('sec-voice');
  }, [onClose, openEditProfile]);

  const handleOpenPreview = useCallback(() => {
    onClose();
    onOpenPreview();
  }, [onClose, onOpenPreview]);

  // 2. Handlers for Other User Context Menu
  const handleOtherUserProfile = useCallback(() => {
    onClose();
    const username = user?.username || user?.id;
    if (username) {
      triggerCallPiPTransition('minimize', getPiPLastCenter(), () => {
        useCallStore.getState().setIsPiP(true);
        navigate(`/profile/${username}`);
      });
    }
  }, [user, navigate, onClose]);

  const handleSendMessage = useCallback(async () => {
    if (isStartingChat) return;
    setIsStartingChat(true);
    try {
      onClose();
      const conv = await chatApi.createDirectConversation(user.id);
      triggerCallPiPTransition('minimize', getPiPLastCenter(), () => {
        useCallStore.getState().setIsPiP(true);
        if (conv?.id) {
          navigate(`/messages/${conv.id}`);
        } else {
          navigate('/messages');
        }
      });
    } catch {
      triggerCallPiPTransition('minimize', getPiPLastCenter(), () => {
        useCallStore.getState().setIsPiP(true);
        navigate('/messages');
      });
    } finally {
      setIsStartingChat(false);
    }
  }, [user.id, isStartingChat, onClose, navigate]);

  const handleStartCall = useCallback(async () => {
    if (isStartingCall) return;
    setIsStartingCall(true);
    try {
      onClose();
      // 1. Leave current call
      endCall();

      // 2. Create or find conversation
      const conv = await chatApi.createDirectConversation(user.id);
      if (conv?.id) {
        navigate(`/messages/${conv.id}`);
        // Small delay to ensure WebRTC connection fully resets
        setTimeout(() => {
          void initiateCall({
            conversationId: conv.id,
            callType: 'audio',
            remoteUser: user,
          });
        }, 80);
      }
    } catch (err) {
      console.error('[ParticipantContextMenu] Failed to start call:', err);
    } finally {
      setIsStartingCall(false);
    }
  }, [user, isStartingCall, onClose, endCall, navigate, initiateCall]);

  const handleVolumeChange = useCallback(
    (newVolumePercent: number) => {
      updateSpeakerProfile({ volume: newVolumePercent / 100 });
    },
    [updateSpeakerProfile],
  );

  const handleTogglePeerMute = useCallback(() => {
    if (isBlocked) return; // Cannot unmute while blocked
    updateSpeakerProfile({ muted: !speakerProfile.muted });
  }, [isBlocked, updateSpeakerProfile, speakerProfile.muted]);

  const handleToggleSoundboardMute = useCallback(() => {
    const nextMuted = !speakerProfile.soundboardMuted;
    updateSpeakerProfile({ soundboardMuted: nextMuted });
    if (!isLocal && user?.id) {
      globalSpeakerMixerManager.updateProfile(user.id, { soundboardMuted: nextMuted });
      globalSpeakerMixerManager.updateProfile('remote', { soundboardMuted: nextMuted });
    }
  }, [updateSpeakerProfile, speakerProfile.soundboardMuted, isLocal, user?.id]);

  const handleToggleFollow = useCallback(() => {
    onClose();
    followMutation.mutate();
  }, [onClose, followMutation]);

  const handleToggleBlock = useCallback(() => {
    onClose();
    if (isBlocked) {
      unblockUser.mutate(user.id, {
        onSuccess: () => {
          useMessageToastStore.getState().addToast({
            id: `toast-${Date.now()}`,
            conversationId: '',
            messageId: '',
            title: 'User Unblocked',
            body: `@${user.username || 'User'} has been unblocked.`,
            avatar: null,
            memberAvatars: [],
            isGroup: false,
          });
        },
      });
    } else {
      // 1. If 1-on-1 private call: leave call immediately for both
      const isOneOnOne = Object.keys(remoteStreams).length <= 1;
      if (isOneOnOne) {
        endCall();
      } else {
        // 2. In group call: mute immediately and lock mute
        updateSpeakerProfile({ muted: true });
      }

      // 3. Trigger block mutation
      blockUser.mutate(user.id, {
        onSuccess: () => {
          useMessageToastStore.getState().addToast({
            id: `toast-${Date.now()}`,
            conversationId: '',
            messageId: '',
            title: 'User Blocked',
            body: `@${user.username || 'User'} has been blocked.`,
            avatar: null,
            memberAvatars: [],
            isGroup: false,
          });
        },
      });
    }
  }, [
    isBlocked,
    user,
    remoteStreams,
    endCall,
    updateSpeakerProfile,
    blockUser,
    unblockUser,
    onClose,
  ]);

  if (!coords) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={isLocal ? 'User menu (You)' : `User menu ${user.displayName || user.username}`}
      style={{
        position: 'fixed',
        left: `${menuPos.x}px`,
        top: `${menuPos.y}px`,
        zIndex: 9999,
      }}
      className="w-[224px] bg-[#111214] text-zinc-200 rounded-[8px] border border-[#232428] shadow-[0_8px_24px_rgba(0,0,0,0.65)] p-1.5 flex flex-col gap-0.5 select-none text-[13px] animate-in fade-in duration-100"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {isLocal ? (
        /*1. SELF CONTEXT MENU*/
        <>
          {/* 1.1 Profile */}
          <button
            type="button"
            role="menuitem"
            onClick={handleSelfProfile}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-zinc-300 hover:bg-[#7059f6] hover:text-white transition-colors cursor-pointer group text-left w-full"
          >
            <User size={16} className="text-zinc-400 group-hover:text-white shrink-0" />
            <span className="font-medium">Profile</span>
          </button>

          <div className="h-px bg-zinc-800/80 my-1 mx-1.5" />

          {/* 1.2 Mute Self */}
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={isSelfMuted}
            onClick={toggleMute}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-zinc-300 hover:bg-[#7059f6] hover:text-white transition-colors cursor-pointer group text-left w-full"
          >
            <span className="font-medium">Mute</span>
            <DiscordCheckbox checked={isSelfMuted} />
          </button>

          {/* 1.3 Deafen Self */}
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={isSelfDeafened}
            onClick={toggleDeafen}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-zinc-300 hover:bg-[#7059f6] hover:text-white transition-colors cursor-pointer group text-left w-full"
          >
            <span className="font-medium">Deafen</span>
            <DiscordCheckbox checked={isSelfDeafened} />
          </button>

          {/* 1.4 Camera Preview */}
          <button
            type="button"
            role="menuitem"
            onClick={handleOpenPreview}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-zinc-300 hover:bg-[#7059f6] hover:text-white transition-colors cursor-pointer group text-left w-full"
          >
            <Eye size={16} className="text-zinc-400 group-hover:text-white shrink-0" />
            <span className="font-medium">Camera Preview</span>
          </button>

          {/* 1.5 Voice and Video Settings */}
          <button
            type="button"
            role="menuitem"
            onClick={handleOpenVoiceSettings}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-zinc-300 hover:bg-[#7059f6] hover:text-white transition-colors cursor-pointer group text-left w-full"
          >
            <Settings size={16} className="text-zinc-400 group-hover:text-white shrink-0" />
            <span className="font-medium truncate">Voice &amp; Video Settings</span>
          </button>
        </>
      ) : (
        /* 2. OTHER USER CONTEXT MENU */
        <>
          {/* 2.1 Profile */}
          <button
            type="button"
            role="menuitem"
            onClick={handleOtherUserProfile}
            className="px-2.5 py-1.5 rounded-[4px] text-zinc-300 hover:bg-[#7059f6] hover:text-white transition-colors cursor-pointer group text-left w-full font-medium"
          >
            Profile
          </button>

          {/* 2.2 Message */}
          <button
            type="button"
            role="menuitem"
            onClick={handleSendMessage}
            disabled={isStartingChat}
            className="px-2.5 py-1.5 rounded-[4px] text-zinc-300 hover:bg-[#7059f6] hover:text-white transition-colors cursor-pointer group text-left w-full font-medium disabled:opacity-50"
          >
            Send Message
          </button>

          {/* 2.3 Start a Call */}
          <button
            type="button"
            role="menuitem"
            onClick={handleStartCall}
            disabled={isStartingCall}
            className="px-2.5 py-1.5 rounded-[4px] text-zinc-300 hover:bg-[#7059f6] hover:text-white transition-colors cursor-pointer group text-left w-full font-medium disabled:opacity-50 flex items-center justify-between"
          >
            <span>Start Call</span>
            {isStartingCall && <Loader2 size={13} className="animate-spin text-zinc-400" />}
          </button>

          <div className="h-px bg-zinc-800/80 my-1 mx-1.5" />

          {/* 2.4 User Volume (0% - 200%) */}
          <DiscordVolumeSlider value={speakerProfile.volume * 100} onChange={handleVolumeChange} />

          <div className="h-px bg-zinc-800/80 my-1 mx-1.5" />

          {/* 2.5 Local Peer Mute */}
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={isBlocked || speakerProfile.muted}
            onClick={handleTogglePeerMute}
            disabled={isBlocked}
            title={isBlocked ? 'User is blocked' : undefined}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-[4px] transition-colors group text-left w-full ${
              isBlocked
                ? 'opacity-60 cursor-not-allowed text-zinc-400'
                : 'text-zinc-300 hover:bg-[#7059f6] hover:text-white cursor-pointer'
            }`}
          >
            <span className="font-medium">Mute</span>
            <DiscordCheckbox
              checked={isBlocked || Boolean(speakerProfile.muted)}
              disabled={isBlocked}
            />
          </button>

          {/* 2.6 Mute Soundboard */}
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={speakerProfile.soundboardMuted}
            onClick={handleToggleSoundboardMute}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-zinc-300 hover:bg-[#7059f6] hover:text-white transition-colors cursor-pointer group text-left w-full"
          >
            <span className="font-medium">Mute Soundboard</span>
            <DiscordCheckbox checked={Boolean(speakerProfile.soundboardMuted)} />
          </button>

          <div className="h-px bg-zinc-800/80 my-1 mx-1.5" />

          {/* 2.7 Follow / Unfollow */}
          <button
            type="button"
            role="menuitem"
            onClick={handleToggleFollow}
            disabled={followMutation.isPending}
            className="px-2.5 py-1.5 rounded-[4px] text-zinc-300 hover:bg-[#7059f6] hover:text-white transition-colors cursor-pointer group text-left w-full font-medium"
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </button>

          <div className="h-px bg-zinc-800/80 my-1 mx-1.5" />

          {/* 2.8 Block / Unblock */}
          <button
            type="button"
            role="menuitem"
            onClick={handleToggleBlock}
            disabled={blockUser.isPending || unblockUser.isPending}
            className="px-2.5 py-1.5 rounded-[4px] text-rose-500 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer group text-left w-full font-medium"
          >
            {isBlocked ? 'Unblock' : 'Block'}
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
