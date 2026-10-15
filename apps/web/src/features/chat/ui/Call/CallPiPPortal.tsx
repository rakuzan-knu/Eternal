import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Mic,
  Headphones,
  Video as VideoIcon,
  PhoneOff,
  MonitorUp,
  MonitorX,
  ChevronDown,
  SquareArrowDownLeft,
  Maximize,
  Minimize,
  Volume2,
  MessageSquare,
} from 'lucide-react';
import { useCallStore } from '../../model/callStore';
import { ParticipantGrid } from './ParticipantGrid';
import { AnimatedSlashIcon } from './CallControls';
import {
  MicrophoneSettingsPopover,
  AudioSettingsPopover,
  CameraSettingsPopover,
} from './CallDevicePopovers';

interface CallPiPPortalProps {
  pipWindow: Window;
  onClose: () => void;
  onToggleMute: () => void;
  onToggleDeafen?: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare?: () => void;
  onEndCall: () => void;
}

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

export function CallPiPPortal({
  pipWindow,
  onClose,
  onToggleMute,
  onToggleDeafen,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
}: CallPiPPortalProps) {
  const [activePopover, setActivePopover] = useState<'mic' | 'audio' | 'camera' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    isMuted,
    isDeafened,
    isVideoOff,
    isScreenSharing,
    durationSec,
    connectionQuality,
    remoteParticipant,
  } = useCallStore();

  // Fullscreen toggle within the Popout window
  const toggleFullscreen = useCallback(() => {
    try {
      const doc = pipWindow.document;
      if (!doc.fullscreenElement) {
        void doc.documentElement.requestFullscreen?.().catch(() => {});
        setIsFullscreen(true);
      } else {
        void doc.exitFullscreen?.().catch(() => {});
        setIsFullscreen(false);
      }
    } catch {}
  }, [pipWindow]);

  useEffect(() => {
    const doc = pipWindow.document;
    const handleFsChange = () => {
      setIsFullscreen(Boolean(doc.fullscreenElement));
    };
    doc.addEventListener('fullscreenchange', handleFsChange);
    return () => doc.removeEventListener('fullscreenchange', handleFsChange);
  }, [pipWindow]);

  const content = (
    <div className="w-full h-full min-h-screen flex flex-col justify-between bg-[#111214] text-white select-none overflow-hidden relative font-sans">
      {/* 1. Popout Top Header */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-black/50 backdrop-blur-md border-b border-white/10 shrink-0 z-30">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-2">
          <Volume2 size={17} className="text-[#7059f6] shrink-0" />
          <span className="font-semibold text-xs sm:text-sm text-zinc-100 truncate max-w-[200px] sm:max-w-xs">
            {remoteParticipant?.displayName || remoteParticipant?.username || 'Voice Call'}
          </span>
          <span className="text-[11px] text-zinc-400 font-mono tabular-nums">
            {formatDuration(durationSec)}
          </span>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              connectionQuality === 'excellent'
                ? 'bg-emerald-400'
                : connectionQuality === 'good'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
            }`}
            title={`Connection: ${connectionQuality}`}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              try {
                window.focus();
              } catch {}
            }}
            title="Focus main window"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <MessageSquare size={16} />
          </button>
        </div>
      </div>

      {/* 2. Central Stage: Fully Responsive ParticipantGrid */}
      <div className="flex-1 w-full min-h-0 relative overflow-hidden flex items-center justify-center p-2">
        <ParticipantGrid compact className="w-full h-full" />
      </div>

      {/* 3. Popout Bottom Control Bar (Streamlined: Essential controls only) */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-black/70 backdrop-blur-2xl border-t border-white/10 shrink-0 z-30">
        {/* Left balance spacer */}
        <div className="w-10 sm:w-20 hidden xs:block" />

        {/* Central Essential Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* 3.1 Mic Split Button Pill */}
          <div className="relative">
            <div
              className={`flex items-center rounded-full transition-all duration-200 border shrink-0 overflow-hidden ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-white/10 text-white hover:bg-white/15 border-white/10'
              }`}
            >
              <button
                type="button"
                onClick={onToggleMute}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                className={`h-10 sm:h-11 pl-3 pr-1.5 flex items-center justify-center transition-colors cursor-pointer ${
                  isMuted ? 'hover:bg-rose-500/20' : 'hover:bg-white/10'
                }`}
              >
                <AnimatedSlashIcon isOff={isMuted} size={18}>
                  <Mic size={18} />
                </AnimatedSlashIcon>
              </button>
              <div className={`w-px h-4 ${isMuted ? 'bg-rose-500/30' : 'bg-white/15'}`} />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePopover((prev) => (prev === 'mic' ? null : 'mic'));
                }}
                title="Microphone settings"
                className={`h-10 sm:h-11 px-1.5 flex items-center justify-center transition-colors cursor-pointer ${
                  isMuted
                    ? 'hover:bg-rose-500/20 text-rose-400'
                    : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                } ${activePopover === 'mic' ? 'bg-white/20 text-white' : ''}`}
              >
                <ChevronDown
                  size={13}
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

          {/* 3.2 Deafen Split Button Pill */}
          {onToggleDeafen && (
            <div className="relative">
              <div
                className={`flex items-center rounded-full transition-all duration-200 border shrink-0 overflow-hidden ${
                  isDeafened
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : 'bg-white/10 text-white hover:bg-white/15 border-white/10'
                }`}
              >
                <button
                  type="button"
                  onClick={onToggleDeafen}
                  title={isDeafened ? 'Undeafen' : 'Deafen'}
                  className={`h-10 sm:h-11 pl-3 pr-1.5 flex items-center justify-center transition-colors cursor-pointer ${
                    isDeafened ? 'hover:bg-rose-500/20' : 'hover:bg-white/10'
                  }`}
                >
                  <AnimatedSlashIcon isOff={isDeafened} size={18}>
                    <Headphones size={18} />
                  </AnimatedSlashIcon>
                </button>
                <div className={`w-px h-4 ${isDeafened ? 'bg-rose-500/30' : 'bg-white/15'}`} />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePopover((prev) => (prev === 'audio' ? null : 'audio'));
                  }}
                  title="Audio settings"
                  className={`h-10 sm:h-11 px-1.5 flex items-center justify-center transition-colors cursor-pointer ${
                    isDeafened
                      ? 'hover:bg-rose-500/20 text-rose-400'
                      : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                  } ${activePopover === 'audio' ? 'bg-white/20 text-white' : ''}`}
                >
                  <ChevronDown
                    size={13}
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

          {/* 3.3 Video Split Button Pill */}
          <div className="relative">
            <div
              className={`flex items-center rounded-full transition-all duration-200 border shrink-0 overflow-hidden ${
                !isVideoOff
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-white/10 text-white hover:bg-white/15 border-white/10'
              }`}
            >
              <button
                type="button"
                onClick={onToggleVideo}
                title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                className={`h-10 sm:h-11 pl-3 pr-1.5 flex items-center justify-center transition-colors cursor-pointer ${
                  !isVideoOff ? 'hover:bg-emerald-500/20' : 'hover:bg-white/10'
                }`}
              >
                <AnimatedSlashIcon isOff={isVideoOff} size={18}>
                  <VideoIcon size={18} />
                </AnimatedSlashIcon>
              </button>
              <div className={`w-px h-4 ${!isVideoOff ? 'bg-emerald-500/30' : 'bg-white/15'}`} />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePopover((prev) => (prev === 'camera' ? null : 'camera'));
                }}
                title="Camera settings"
                className={`h-10 sm:h-11 px-1.5 flex items-center justify-center transition-colors cursor-pointer ${
                  !isVideoOff
                    ? 'hover:bg-emerald-500/20 text-emerald-400'
                    : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                } ${activePopover === 'camera' ? 'bg-white/20 text-white' : ''}`}
              >
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${
                    activePopover === 'camera' ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            <CameraSettingsPopover
              isOpen={activePopover === 'camera'}
              onClose={() => setActivePopover(null)}
            />
          </div>

          {/* 3.4 Screen Share Button */}
          {onToggleScreenShare && (
            <button
              type="button"
              onClick={onToggleScreenShare}
              title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
              className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full transition-all border shrink-0 cursor-pointer ${
                isScreenSharing
                  ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border-indigo-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20 border-white/10'
              }`}
            >
              {isScreenSharing ? <MonitorX size={18} /> : <MonitorUp size={18} />}
            </button>
          )}

          {/* 3.5 End Call Button */}
          <button
            type="button"
            onClick={() => {
              onEndCall();
              onClose();
            }}
            title="End call"
            className="w-11 h-10 sm:w-12 sm:h-11 flex items-center justify-center rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95 cursor-pointer ml-1"
          >
            <PhoneOff size={18} />
          </button>
        </div>

        {/* Right Controls: Return / Pop In & Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Pop In / Return to Main Window Button */}
          <button
            type="button"
            onClick={onClose}
            title="Return to main window (Pop In)"
            className="px-2.5 sm:px-3 py-1.5 rounded-full bg-white/10 hover:bg-[#7059f6] hover:text-white text-zinc-200 text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer shadow-md active:scale-95"
          >
            <SquareArrowDownLeft size={15} />
            <span className="hidden sm:inline">Return</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit full screen' : 'Full screen'}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, pipWindow.document.body);
}
