import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Maximize2,
  Mic,
  MicOff,
  Headphones,
  Video,
  VideoOff,
  MonitorUp,
  MonitorX,
  PhoneOff,
} from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import { useCallStore } from '../../model/callStore';
import { useCall } from '../../model/CallContext';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useAvatarTileTheme } from '../../lib/webrtc/useAvatarTileTheme';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { useVoiceVideoSettingsStore } from '../../model/useVoiceVideoSettingsStore';
import { globalSpeakerMixerManager } from '../../lib/webrtc/perSpeakerMixer';
import { ParticipantContextMenu } from './ParticipantContextMenu';
import { CameraPreviewModal } from './CallDevicePopovers';
import {
  getPiPLastCenter,
  setPiPLastCenter,
  triggerCallPiPTransition,
} from '../../lib/webrtc/callPiPTransition';

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Transforms hex, rgb, or hsl colors to an rgba/hsla color with target alpha for liquid glass refraction.
 */
function colorWithAlpha(colorStr: string, alpha: number): string {
  if (!colorStr) return `rgba(24, 24, 27, ${alpha})`;
  const trimmed = colorStr.trim();
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const hslMatch = trimmed.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/i);
  if (hslMatch) {
    return `hsla(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%, ${alpha})`;
  }
  const rgbMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`;
  }
  return colorStr;
}

export function PictureInPicture() {
  const {
    isPiP,
    callStatus,
    remoteParticipant,
    remoteStreams,
    screenShareStream,
    localStream,
    durationSec,
    isMuted,
    isDeafened,
    isVideoOff,
    isScreenSharing,
    dominantSpeakerId,
    localIsSpeaking,
    remoteIsSpeaking,
    setIsPiP,
  } = useCallStore();

  const { endCall, toggleMute, toggleDeafen, toggleVideo, toggleScreenShare } = useCall();
  const currentUserId = useAuthStore((s) => s.userId);
  const { data: currentUser } = useCurrentUser();

  // 1. Identify active speaking user (self or remote participant)
  const isLocalActive =
    localIsSpeaking || (!remoteIsSpeaking && dominantSpeakerId === (currentUserId || 'me'));

  const activeUser = useMemo(() => {
    if (isLocalActive) {
      return {
        id: currentUser?.id || currentUserId || 'me',
        username: currentUser?.username || 'user',
        displayName: currentUser?.displayName || currentUser?.username || 'You',
        avatar: currentUser?.avatar || null,
        isLocal: true,
      };
    }
    return {
      id: remoteParticipant?.id || 'remote',
      username: remoteParticipant?.username || 'user',
      displayName: remoteParticipant?.displayName || remoteParticipant?.username || 'Participant',
      avatar: remoteParticipant?.avatar || null,
      isLocal: false,
    };
  }, [isLocalActive, currentUser, currentUserId, remoteParticipant]);

  const isSpeaking = isLocalActive ? localIsSpeaking : remoteIsSpeaking;

  // 2. Avatar Theme Extraction & Liquid Glass Contrast
  const { backgroundColor, isLight } = useAvatarTileTheme(activeUser.avatar);
  const glassmorphismOpacity = useThemeStore((s) => s.glassmorphismOpacity ?? 0.6);
  const isGlass = glassmorphismOpacity > 0.15;
  const isMaxGlass = glassmorphismOpacity >= 0.8;

  // 3. Audio Continuity while PiP is active
  const outputVolume = useVoiceVideoSettingsStore((s) => s.outputVolume);
  useEffect(() => {
    if (!isPiP || callStatus !== 'connected') return;

    const cleanups: (() => void)[] = [];
    Object.entries(remoteStreams).forEach(([id, stream]) => {
      if (stream && stream.getAudioTracks().length > 0) {
        const channel = globalSpeakerMixerManager.attachSpeaker(id, stream);
        channel.setMasterVolume(outputVolume / 100);
        channel.setDeafened(isDeafened);
        channel.setSpatialActive(false);
        cleanups.push(() => {
          globalSpeakerMixerManager.detachSpeaker(id);
        });
      }
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [isPiP, callStatus, remoteStreams, outputVolume, isDeafened]);

  // Video track binding (if video/screenshare enabled)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteStreamEntries = Object.entries(remoteStreams);
  const activeVideoStream =
    screenShareStream || (remoteStreamEntries.length > 0 ? remoteStreamEntries[0][1] : null);
  const hasVideo = Boolean(
    !isVideoOff &&
    (isLocalActive
      ? localStream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
      : activeVideoStream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')),
  );

  useEffect(() => {
    if (videoRef.current && activeVideoStream && hasVideo) {
      videoRef.current.srcObject = isLocalActive ? localStream : activeVideoStream;
    }
  }, [activeVideoStream, localStream, hasVideo, isLocalActive]);

  // 4. Position & Drag and Drop state (dimensions: 180x180px)
  const CARD_SIZE = 180;
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    cardX: number;
    cardY: number;
  } | null>(null);
  const hasMovedRef = useRef(false);
  const lastTapRef = useRef<number>(0);

  // Reset custom dragged position when call ends or PiP is closed, ensuring fresh bottom-right placement
  useEffect(() => {
    if (!isPiP || callStatus !== 'connected') {
      setPosition(null);
    }
  }, [isPiP, callStatus]);

  // Track the actual center of the PiP card on screen for radial ripple transitions
  useEffect(() => {
    if (cardRef.current && isPiP) {
      const rect = cardRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setPiPLastCenter({
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
        });
      }
    }
  }, [position, isPiP]);

  // Clamping on viewport resize (keeps custom drag position within bounds, or keeps default anchored CSS position)
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const viewportW = document.documentElement.clientWidth || window.innerWidth;
        const viewportH = document.documentElement.clientHeight || window.innerHeight;
        const clampedX = Math.max(12, Math.min(viewportW - (CARD_SIZE + 12), prev.x));
        const clampedY = Math.max(12, Math.min(viewportH - (CARD_SIZE + 12), prev.y));
        return { x: clampedX, y: clampedY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement)?.closest('button')) return;

    const rect = cardRef.current?.getBoundingClientRect();
    const currentCardX = position?.x ?? (rect ? rect.left : 20);
    const currentCardY = position?.y ?? (rect ? rect.top : 20);

    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      cardX: currentCardX,
      cardY: currentCardY,
    };
    hasMovedRef.current = false;
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.pointerX;
      const dy = e.clientY - dragStartRef.current.pointerY;

      if (!hasMovedRef.current && Math.hypot(dx, dy) > 4) {
        hasMovedRef.current = true;
        isDraggingRef.current = true;
        setIsDragging(true);
      }

      if (hasMovedRef.current) {
        const viewportW = document.documentElement.clientWidth || window.innerWidth;
        const viewportH = document.documentElement.clientHeight || window.innerHeight;
        const nextX = Math.max(
          12,
          Math.min(viewportW - (CARD_SIZE + 12), dragStartRef.current.cardX + dx),
        );
        const nextY = Math.max(
          12,
          Math.min(viewportH - (CARD_SIZE + 12), dragStartRef.current.cardY + dy),
        );
        setPosition({ x: nextX, y: nextY });
      }
    };

    const handlePointerUp = () => {
      if (dragStartRef.current) {
        dragStartRef.current = null;
        setTimeout(() => {
          isDraggingRef.current = false;
          setIsDragging(false);
        }, 50);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  // Smooth circular reveal expansion from PiP back to full-screen call
  const handleExpand = useCallback(() => {
    const rect = cardRef.current?.getBoundingClientRect();
    const origin = rect
      ? {
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
        }
      : getPiPLastCenter();

    triggerCallPiPTransition('expand', origin, () => {
      setIsPiP(false);
    });
  }, [setIsPiP]);

  // Double click / Double tap to expand
  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement)?.closest('button')) return;
    handleExpand();
  };

  const handlePointerUpCard = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement)?.closest('button')) return;
    if (hasMovedRef.current) return;

    const now = Date.now();
    if (now - lastTapRef.current < 450) {
      handleExpand();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  // 5. Context Menu & Camera Preview modal
  const [contextMenuCoords, setContextMenuCoords] = useState<{ x: number; y: number } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuCoords({ x: e.clientX, y: e.clientY });
  };

  // 6. Hover controls
  const [isHovered, setIsHovered] = useState(false);

  if (!isPiP || callStatus !== 'connected') return null;

  // Liquid glass & contrast tokens:
  // When glass is enabled / 100%, eliminate solid black backgrounds completely
  const cardBgColor = hasVideo
    ? '#09090b'
    : isGlass
      ? colorWithAlpha(backgroundColor, isMaxGlass ? 0.35 : 0.6)
      : backgroundColor;

  const timerBadgeStyle = isGlass
    ? 'bg-white/12 text-white border-white/20 backdrop-blur-md shadow-sm'
    : isLight
      ? 'bg-white/90 text-zinc-900 border-zinc-300 shadow-sm'
      : 'bg-zinc-900/90 text-white border-white/10 shadow-sm';

  const maximizeBtnStyle = isGlass
    ? 'bg-white/12 hover:bg-white/25 text-white border-white/20 backdrop-blur-md shadow-sm'
    : isLight
      ? 'bg-white/90 hover:bg-white text-zinc-900 border-zinc-300 shadow-sm'
      : 'bg-zinc-900/90 hover:bg-zinc-800 text-white border-white/10 shadow-sm';

  const bottomPanelStyle = isGlass
    ? 'bg-white/12 dark:bg-white/10 border-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.35)] backdrop-blur-2xl'
    : isLight
      ? 'bg-white/95 border-zinc-300 shadow-md'
      : 'bg-zinc-900/95 border-white/10 shadow-lg';

  // Inactive buttons in glass mode are translucent glass (no dark black solid background)
  const buttonBaseStyle = isGlass
    ? 'bg-white/12 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md shadow-sm active:scale-95'
    : isLight
      ? 'bg-black/10 hover:bg-black/20 text-zinc-900 border border-black/10'
      : 'bg-white/10 hover:bg-white/25 text-white border border-white/15';

  // Red glass style for Mute / Deafen when active
  const redGlassStyle = isGlass
    ? 'bg-rose-500/35 hover:bg-rose-500/50 text-white border border-rose-400/50 shadow-[0_0_14px_rgba(244,63,94,0.45),inset_0_1px_1px_rgba(255,255,255,0.3)] backdrop-blur-md active:scale-95'
    : 'bg-rose-500 text-white shadow-sm';

  // End Call button: ALWAYS red liquid glass
  const endCallBtnStyle = isGlass
    ? 'bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-400/60 shadow-[0_4px_16px_rgba(225,29,72,0.5),inset_0_1px_1px_rgba(255,255,255,0.35)] backdrop-blur-md active:scale-95'
    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/40';

  const liquidCardStyle = isGlass
    ? 'backdrop-blur-2xl backdrop-saturate-180 border border-white/25 shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.4),0_16px_40px_rgba(0,0,0,0.45)]'
    : 'border border-white/15 shadow-[0_12px_36px_rgba(0,0,0,0.4)]';

  return (
    <>
      <div
        ref={cardRef}
        role="region"
        aria-label="Picture in Picture Voice Call"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUpCard}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={
          position
            ? {
                width: CARD_SIZE,
                height: CARD_SIZE,
                left: `${position.x}px`,
                top: `${position.y}px`,
                backgroundColor: cardBgColor,
              }
            : {
                width: CARD_SIZE,
                height: CARD_SIZE,
                right: 'calc(env(safe-area-inset-right, 0px) + 20px)',
                bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
                backgroundColor: cardBgColor,
              }
        }
        className={`fixed z-50 rounded-[32px] overflow-hidden select-none flex items-center justify-center transition-[background-color,box-shadow,transform] duration-300 ${
          isDragging ? 'cursor-grabbing scale-102 shadow-2xl' : 'cursor-grab hover:shadow-2xl'
        } ${liquidCardStyle}`}
      >
        {/* Background / Video Layer */}
        {hasVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover rounded-[32px] pointer-events-none"
          />
        ) : (
          <div className="relative flex flex-col items-center justify-center w-full h-full pointer-events-none transition-transform duration-300">
            <div
              className={`rounded-full p-0.5 transition-all duration-300 ${
                isSpeaking
                  ? 'ring-[3.5px] ring-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.7)]'
                  : 'ring-1 ring-black/10 dark:ring-white/15'
              }`}
            >
              <Avatar
                src={activeUser.avatar}
                size="lg"
                suppressDecoration={true}
                className="w-20 h-20 shadow-xl"
              />
            </div>
          </div>
        )}

        {/* 1. Top-Left Timer (slides in from top-left corner on hover) */}
        <div
          className={`absolute top-2.5 left-2.5 z-20 transition-all duration-300 ease-out transform ${
            isHovered
              ? 'translate-x-0 translate-y-0 opacity-100 scale-100'
              : '-translate-x-6 -translate-y-6 opacity-0 scale-90 pointer-events-none'
          }`}
        >
          <div
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tabular-nums border ${timerBadgeStyle}`}
          >
            {formatDuration(durationSec)}
          </div>
        </div>

        {/* 2. Top-Right Expand Button (slides in from top-right corner on hover) */}
        <div
          className={`absolute top-2.5 right-2.5 z-20 transition-all duration-300 ease-out transform ${
            isHovered
              ? 'translate-x-0 translate-y-0 opacity-100 scale-100'
              : 'translate-x-6 -translate-y-6 opacity-0 scale-90 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={handleExpand}
            title="Expand call (double-click)"
            aria-label="Expand call"
            className={`w-7 h-7 rounded-full flex items-center justify-center border transition-transform hover:scale-105 active:scale-95 cursor-pointer ${maximizeBtnStyle}`}
          >
            <Maximize2 size={13} />
          </button>
        </div>

        {/* 3. Bottom Control Bar (slides in from bottom center on hover) */}
        <div
          className={`absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 ease-out transform ${
            isHovered
              ? 'translate-y-0 opacity-100 scale-100'
              : 'translate-y-8 opacity-0 scale-90 pointer-events-none'
          }`}
        >
          <div
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full border ${bottomPanelStyle}`}
          >
            {/* 3.1 Mute Button */}
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-all cursor-pointer ${
                isMuted ? redGlassStyle : buttonBaseStyle
              }`}
            >
              {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
            </button>

            {/* 3.2 Deafen Button */}
            <button
              type="button"
              onClick={toggleDeafen}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
              aria-label={isDeafened ? 'Undeafen' : 'Deafen'}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-all cursor-pointer ${
                isDeafened ? redGlassStyle : buttonBaseStyle
              }`}
            >
              <Headphones size={13} />
            </button>

            {/* 3.3 Camera Button */}
            <button
              type="button"
              onClick={toggleVideo}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              aria-label={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-all cursor-pointer ${
                !isVideoOff
                  ? isGlass
                    ? 'bg-emerald-500/35 hover:bg-emerald-500/50 text-white border border-emerald-400/50 shadow-[0_0_14px_rgba(52,211,153,0.45),inset_0_1px_1px_rgba(255,255,255,0.3)] backdrop-blur-md active:scale-95'
                    : 'bg-emerald-500 text-white shadow-sm'
                  : buttonBaseStyle
              }`}
            >
              {isVideoOff ? <VideoOff size={13} /> : <Video size={13} />}
            </button>

            {/* 3.4 Share Screen Button */}
            <button
              type="button"
              onClick={() => void toggleScreenShare()}
              title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
              aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-all cursor-pointer ${
                isScreenSharing
                  ? isGlass
                    ? 'bg-indigo-500/35 hover:bg-indigo-500/50 text-white border border-indigo-400/50 shadow-[0_0_14px_rgba(99,102,241,0.45),inset_0_1px_1px_rgba(255,255,255,0.3)] backdrop-blur-md active:scale-95'
                    : 'bg-indigo-500 text-white shadow-sm'
                  : buttonBaseStyle
              }`}
            >
              {isScreenSharing ? <MonitorX size={13} /> : <MonitorUp size={13} />}
            </button>

            {/* 3.5 End Call Button: ALWAYS red liquid glass */}
            <button
              type="button"
              onClick={endCall}
              title="End call"
              aria-label="End call"
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-all cursor-pointer ${endCallBtnStyle}`}
            >
              <PhoneOff size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Right-click Context Menu */}
      {contextMenuCoords && (
        <ParticipantContextMenu
          user={activeUser}
          isLocal={activeUser.isLocal}
          coords={contextMenuCoords}
          onClose={() => setContextMenuCoords(null)}
          onOpenPreview={() => setShowPreviewModal(true)}
        />
      )}

      {/* Camera Preview Modal (triggered from context menu) */}
      <CameraPreviewModal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} />
    </>
  );
}
