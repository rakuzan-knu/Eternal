import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MonitorUp,
  MonitorX,
  PhoneOff,
  PenTool,
  Smile,
  LayoutGrid,
  Headphones,
  ChevronDown,
  Radio,
} from 'lucide-react';
import { useCallStore } from '../../model/callStore';
import { CallToolsSheet } from './CallToolsSheet';
import { SoundboardPopover } from './SoundboardPopover';
import {
  MicrophoneSettingsPopover,
  AudioSettingsPopover,
  CameraSettingsPopover,
  CameraPreviewModal,
} from './CallDevicePopovers';

/**
 * Component that renders an icon with an animated strike-through slash line
 * that smoothly draws across the icon when disabled (isOff = true)
 * and smoothly retracts when enabled (isOff = false).
 */
export function AnimatedSlashIcon({
  isOff,
  children,
  size = 19,
  className = '',
}: {
  isOff: boolean;
  children: React.ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center shrink-0 ${className}`}
    >
      <div
        className={`w-full h-full flex items-center justify-center transition-transform duration-200 ${
          isOff ? 'scale-[0.96] opacity-90' : 'scale-100 opacity-100'
        }`}
      >
        {children}
      </div>

      <svg
        viewBox="0 0 24 24"
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        fill="none"
      >
        {/* Dark backdrop outline line for clean separation from the icon underneath */}
        <motion.line
          x1="2.5"
          y1="2.5"
          x2="21.5"
          y2="21.5"
          stroke="#111214"
          strokeWidth="4.2"
          strokeLinecap="round"
          initial={false}
          animate={{
            pathLength: isOff ? 1 : 0,
            opacity: isOff ? 0.95 : 0,
          }}
          transition={{
            pathLength: { duration: 0.28, ease: [0.34, 1.3, 0.64, 1] },
            opacity: { duration: 0.18 },
          }}
        />
        {/* Main visible slash line */}
        <motion.line
          x1="2.5"
          y1="2.5"
          x2="21.5"
          y2="21.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          initial={false}
          animate={{
            pathLength: isOff ? 1 : 0,
            opacity: isOff ? 1 : 0,
          }}
          transition={{
            pathLength: { duration: 0.28, ease: [0.34, 1.3, 0.64, 1] },
            opacity: { duration: 0.18 },
          }}
        />
      </svg>
    </div>
  );
}

const REACTION_EMOJIS = ['❤️', '🔥', '👏', '🎉', '🚀', '💎'];

interface CallControlsProps {
  onToggleMute: () => void;
  onToggleDeafen?: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  onOpenSettings: () => void;
  onSendReaction?: (emoji: string) => void;
}

export function CallControls({
  onToggleMute,
  onToggleDeafen,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
  onOpenSettings,
  onSendReaction,
}: CallControlsProps) {
  const [isReactionsOpen, setIsReactionsOpen] = useState(false);
  const [isToolsSheetOpen, setIsToolsSheetOpen] = useState(false);
  const [activePopover, setActivePopover] = useState<'mic' | 'audio' | 'camera' | null>(null);
  const [isCameraPreviewOpen, setIsCameraPreviewOpen] = useState(false);

  const {
    isMuted,
    isDeafened,
    isVideoOff,
    isScreenSharing,
    isScreenAudioSharing,
    isWhiteboardOpen,
    toggleWhiteboard,
    isSoundboardOpen,
    toggleSoundboard,
    setIsSoundboardOpen,
    conversationId,
    isPTTEnabled,
    isPTTActive,
  } = useCallStore();

  return (
    <>
      <div className="absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100vw-16px)] flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 rounded-full bg-zinc-950/90 backdrop-blur-2xl border border-white/15 shadow-[0_10px_40px_rgba(0,0,0,0.7)] select-none">
        {/* Push to talk status pill */}
        {isPTTEnabled && (
          <div
            role="status"
            aria-live="polite"
            className={`absolute -top-9 left-6 -translate-x-1/2 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all duration-150 ${
              isPTTActive
                ? 'bg-emerald-500/90 text-white shadow-emerald-500/30 scale-105 animate-pulse'
                : 'bg-zinc-900/90 text-zinc-300 border border-white/10'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isPTTActive ? 'bg-white' : 'bg-emerald-400'}`}
            />
            {isPTTActive ? 'PTT Active' : 'Hold Space'}
          </div>
        )}

        {/* 1. Mute Split Button Pill (Discord-style) */}
        <div className="relative">
          <div
            data-popover-trigger="mic"
            onContextMenu={(e) => {
              e.preventDefault();
              setActivePopover((prev) => (prev === 'mic' ? null : 'mic'));
            }}
            className={`flex items-center rounded-full transition-all duration-200 border shrink-0 overflow-hidden ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : 'bg-white/10 text-white hover:bg-white/15 border-white/10'
            }`}
          >
            <button
              type="button"
              onClick={onToggleMute}
              title={isMuted ? 'Unmute microphone (M)' : 'Mute microphone (M)'}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`h-11 sm:h-12 pl-3.5 pr-2 flex items-center justify-center transition-colors ${
                isMuted ? 'hover:bg-rose-500/20' : 'hover:bg-white/10'
              }`}
            >
              <AnimatedSlashIcon isOff={isMuted} size={19}>
                <Mic size={19} />
              </AnimatedSlashIcon>
            </button>
            <div className={`w-px h-5 ${isMuted ? 'bg-rose-500/30' : 'bg-white/15'}`} />
            <button
              type="button"
              data-popover-trigger="mic"
              onClick={(e) => {
                e.stopPropagation();
                setActivePopover((prev) => (prev === 'mic' ? null : 'mic'));
              }}
              title="Microphone settings"
              aria-label="Device settings"
              className={`h-11 sm:h-12 px-2 flex items-center justify-center transition-colors ${
                isMuted
                  ? 'hover:bg-rose-500/20 text-rose-400'
                  : 'hover:bg-white/10 text-zinc-300 hover:text-white'
              } ${activePopover === 'mic' ? 'bg-white/20 text-white' : ''}`}
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${
                  activePopover === 'mic' ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          <MicrophoneSettingsPopover
            isOpen={activePopover === 'mic'}
            onClose={() => setActivePopover(null)}
            onToggleDeafen={onToggleDeafen}
          />
        </div>

        {/* Deafen Split Button Pill (Discord-style) */}
        {onToggleDeafen && (
          <div className="relative">
            <div
              data-popover-trigger="audio"
              onContextMenu={(e) => {
                e.preventDefault();
                setActivePopover((prev) => (prev === 'audio' ? null : 'audio'));
              }}
              className={`flex items-center rounded-full transition-all duration-200 border shrink-0 overflow-hidden ${
                isDeafened
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'bg-white/10 text-white hover:bg-white/15 border-white/10'
              }`}
            >
              <button
                type="button"
                onClick={onToggleDeafen}
                title={isDeafened ? 'Undeafen' : 'Deafen'}
                aria-label={isDeafened ? 'Undeafen' : 'Deafen'}
                className={`h-11 sm:h-12 pl-3.5 pr-2 flex items-center justify-center transition-colors ${
                  isDeafened ? 'hover:bg-rose-500/20' : 'hover:bg-white/10'
                }`}
              >
                <AnimatedSlashIcon isOff={isDeafened} size={19}>
                  <Headphones size={19} />
                </AnimatedSlashIcon>
              </button>
              <div className={`w-px h-5 ${isDeafened ? 'bg-rose-500/30' : 'bg-white/15'}`} />
              <button
                type="button"
                data-popover-trigger="audio"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePopover((prev) => (prev === 'audio' ? null : 'audio'));
                }}
                title="Audio and output settings"
                aria-label="Output settings"
                className={`h-11 sm:h-12 px-2 flex items-center justify-center transition-colors ${
                  isDeafened
                    ? 'hover:bg-rose-500/20 text-rose-400'
                    : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                } ${activePopover === 'audio' ? 'bg-white/20 text-white' : ''}`}
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    activePopover === 'audio' ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            <AudioSettingsPopover
              isOpen={activePopover === 'audio'}
              onClose={() => setActivePopover(null)}
            />
          </div>
        )}

        {/* 2. Video Toggle Split Button Pill (Discord-style) */}
        <div className="relative">
          <div
            data-popover-trigger="camera"
            onContextMenu={(e) => {
              e.preventDefault();
              setActivePopover((prev) => (prev === 'camera' ? null : 'camera'));
            }}
            className={`flex items-center rounded-full transition-all duration-200 border shrink-0 overflow-hidden ${
              !isVideoOff
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(168,185,129,0.25)]'
                : 'bg-white/10 text-white hover:bg-white/15 border-white/10'
            }`}
          >
            <button
              type="button"
              onClick={onToggleVideo}
              title={isVideoOff ? 'Turn on camera (V)' : 'Turn off camera (V)'}
              aria-label={isVideoOff ? 'Start camera' : 'Stop camera'}
              className={`h-11 sm:h-12 pl-3.5 pr-2 flex items-center justify-center transition-colors ${
                !isVideoOff ? 'hover:bg-emerald-500/20' : 'hover:bg-white/10'
              }`}
            >
              <AnimatedSlashIcon isOff={isVideoOff} size={19}>
                <VideoIcon size={19} />
              </AnimatedSlashIcon>
            </button>
            <div className={`w-px h-5 ${!isVideoOff ? 'bg-emerald-500/30' : 'bg-white/15'}`} />
            <button
              type="button"
              data-popover-trigger="camera"
              onClick={(e) => {
                e.stopPropagation();
                setActivePopover((prev) => (prev === 'camera' ? null : 'camera'));
              }}
              title="Camera settings"
              aria-label="Camera settings"
              className={`h-11 sm:h-12 px-2 flex items-center justify-center transition-colors ${
                !isVideoOff
                  ? 'hover:bg-emerald-500/20 text-emerald-400'
                  : 'hover:bg-white/10 text-zinc-300 hover:text-white'
              } ${activePopover === 'camera' ? 'bg-white/20 text-white' : ''}`}
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${
                  activePopover === 'camera' ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          <CameraSettingsPopover
            isOpen={activePopover === 'camera'}
            onClose={() => setActivePopover(null)}
            onOpenPreview={() => setIsCameraPreviewOpen(true)}
          />
        </div>

        {/* 3. Screen Share Button (visible on tablet and desktop) */}
        <button
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          className={`relative w-11 h-11 sm:w-12 sm:h-12 hidden sm:flex items-center justify-center rounded-full transition-all duration-200 shrink-0 ${
            isScreenSharing
              ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30'
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
          }`}
        >
          {isScreenSharing ? <MonitorX size={20} /> : <MonitorUp size={20} />}
          {isScreenAudioSharing && (
            <span
              title="System audio is sharing"
              className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-zinc-950 flex items-center justify-center animate-pulse"
            />
          )}
        </button>

        {/* 4. Reactions Button */}
        <div className="relative shrink-0">
          <button
            onClick={() => setIsReactionsOpen((prev) => !prev)}
            title="Send reaction"
            aria-label="Send reaction"
            className={`w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all duration-200 ${
              isReactionsOpen
                ? 'bg-pink-500/25 text-pink-300 border border-pink-500/40 shadow-[0_0_12px_rgba(236,72,153,0.3)]'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            <Smile size={20} className={isReactionsOpen ? 'text-pink-300' : 'text-pink-400'} />
          </button>

          {isReactionsOpen && (
            <div
              role="toolbar"
              aria-label="Reactions"
              className="absolute bottom-14 sm:bottom-16 left-1/2 -translate-x-1/2 p-1.5 sm:p-2 bg-zinc-900/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl flex items-center gap-1 sm:gap-1.5 animate-in fade-in zoom-in-95 duration-150 max-w-[85vw] overflow-x-auto"
            >
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSendReaction?.(emoji);
                    setIsReactionsOpen(false);
                  }}
                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-lg sm:text-xl rounded-xl hover:bg-white/15 active:scale-125 transition-transform duration-150 shrink-0"
                  aria-label={`Send ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 5. Soundboard Button */}
        <div className="relative shrink-0">
          <button
            type="button"
            data-soundboard-trigger="true"
            onClick={toggleSoundboard}
            title={isSoundboardOpen ? 'Close soundboard' : 'Soundboard'}
            aria-label="Soundboard"
            className={`w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all duration-200 ${
              isSoundboardOpen
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            <Radio size={20} className={isSoundboardOpen ? 'text-purple-300' : 'text-purple-400'} />
          </button>

          <SoundboardPopover
            isOpen={isSoundboardOpen}
            onClose={() => setIsSoundboardOpen(false)}
            conversationId={conversationId}
          />
        </div>

        {/* Interactive Whiteboard (Desktop shortcut) */}
        <div className="hidden xl:flex items-center gap-2.5">
          <button
            onClick={toggleWhiteboard}
            title={isWhiteboardOpen ? 'Close whiteboard (W)' : 'Whiteboard (W)'}
            aria-label="Whiteboard"
            className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200 ${
              isWhiteboardOpen
                ? 'bg-amber-500/25 text-amber-300 hover:bg-amber-500/35 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            <PenTool size={18} className={isWhiteboardOpen ? 'text-amber-300' : 'text-amber-400'} />
          </button>
        </div>

        {/* More Tools Sheet Button (Available on all screens) */}
        <button
          onClick={() => setIsToolsSheetOpen(true)}
          title="More tools"
          aria-label="More tools"
          className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all duration-200 shrink-0 bg-white/10 text-white hover:bg-white/20 border border-white/10"
        >
          <LayoutGrid size={20} />
        </button>

        {/* 6. End Call Button */}
        <button
          onClick={onEndCall}
          title="Leave call"
          aria-label="Leave call"
          className="w-12 sm:w-14 h-11 sm:h-12 px-3 sm:px-4 flex items-center justify-center rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all duration-200 hover:scale-105 shrink-0"
        >
          <PhoneOff size={20} />
        </button>
      </div>

      {/* Slide-Up Bottom Sheet for Secondary Tools */}
      <CallToolsSheet
        isOpen={isToolsSheetOpen}
        onClose={() => setIsToolsSheetOpen(false)}
        onOpenSettings={onOpenSettings}
      />

      {/* Floating Camera Preview Modal (Discord style) */}
      <CameraPreviewModal
        isOpen={isCameraPreviewOpen}
        onClose={() => setIsCameraPreviewOpen(false)}
      />
    </>
  );
}
