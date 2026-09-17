import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MonitorUp,
  MonitorX,
  PhoneOff,
  Sparkles,
  Wand2,
  PenTool,
  Smile,
  LayoutGrid,
  Headphones,
  VolumeX,
  Settings,
} from 'lucide-react';
import { useCallStore } from '../../model/callStore';
import { CallToolsSheet } from './CallToolsSheet';

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

  const {
    isMuted,
    isDeafened,
    isVideoOff,
    isScreenSharing,
    isScreenAudioSharing,
    isNoiseSuppressionEnabled,
    setIsNoiseSuppressionEnabled,
    virtualBackground,
    setVirtualBackground,
    fileTransfers,
    isFileTransferOpen,
    isSyncPlayOpen,
    isWhiteboardOpen,
    toggleWhiteboard,
    isSoundboardOpen,
    isLiveSummaryOpen,
    isDualCameraOpen,
    isHolographicCallOpen,
    isTravelerModeEnabled,
    isPTTEnabled,
    isPTTActive,
  } = useCallStore();

  const activeTransfersCount = Object.values(fileTransfers).filter(
    (t) => t.status === 'transferring',
  ).length;

  const activeFeaturesCount =
    (virtualBackground === 'blur' ? 1 : 0) +
    (isNoiseSuppressionEnabled ? 1 : 0) +
    (isTravelerModeEnabled ? 1 : 0) +
    (isWhiteboardOpen ? 1 : 0) +
    (isSyncPlayOpen ? 1 : 0) +
    (isFileTransferOpen || activeTransfersCount > 0 ? 1 : 0) +
    (isSoundboardOpen ? 1 : 0) +
    (isLiveSummaryOpen ? 1 : 0) +
    (isDualCameraOpen ? 1 : 0) +
    (isHolographicCallOpen ? 1 : 0);

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

        {/* 1. Mute Button */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute microphone (M)' : 'Mute microphone (M)'}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          className={`w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all duration-200 shrink-0 ${
            isMuted
              ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
          }`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Deafen Button (Заглушить всё) */}
        {onToggleDeafen && (
          <button
            onClick={onToggleDeafen}
            title={isDeafened ? 'Включить звук (Наушники)' : 'Заглушить всё (Deafen)'}
            aria-label={isDeafened ? 'Включить звук' : 'Заглушить всё'}
            className={`w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all duration-200 shrink-0 ${
              isDeafened
                ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            {isDeafened ? <VolumeX size={20} /> : <Headphones size={20} />}
          </button>
        )}

        {/* 2. Video Toggle Button */}
        <button
          onClick={onToggleVideo}
          title={isVideoOff ? 'Start camera (V)' : 'Stop camera (V)'}
          aria-label={isVideoOff ? 'Start camera' : 'Stop camera'}
          className={`w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all duration-200 shrink-0 ${
            isVideoOff
              ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
          }`}
        >
          {isVideoOff ? <VideoOff size={20} /> : <VideoIcon size={20} />}
        </button>

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
              title="Аудио системы транслируется"
              className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-zinc-950 flex items-center justify-center animate-pulse"
            />
          )}
        </button>

        {/* 4. Reactions Button */}
        <div className="relative shrink-0">
          <button
            onClick={() => setIsReactionsOpen((prev) => !prev)}
            title="Отправить реакцию"
            aria-label="Отправить реакцию"
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
              aria-label="Реакции"
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
                  aria-label={`Отправить ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop-only quick access buttons (>= 1280px) */}
        <div className="hidden xl:flex items-center gap-2.5">
          {/* Background Blur */}
          <button
            onClick={() => setVirtualBackground(virtualBackground === 'blur' ? 'none' : 'blur')}
            title={virtualBackground === 'blur' ? 'Размытие фона: ВКЛ' : 'Размытие фона'}
            aria-label="Размытие фона"
            className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200 ${
              virtualBackground === 'blur'
                ? 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                : 'bg-white/10 text-gray-400 hover:bg-white/20 border border-white/10'
            }`}
          >
            <Wand2 size={18} />
          </button>

          {/* AI Noise Suppression */}
          <button
            onClick={() => setIsNoiseSuppressionEnabled(!isNoiseSuppressionEnabled)}
            title={
              isNoiseSuppressionEnabled
                ? 'AI Шумоподавление: ВКЛ (RNNoise)'
                : 'AI Шумоподавление: ВЫКЛ'
            }
            aria-label="AI Шумоподавление"
            className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200 ${
              isNoiseSuppressionEnabled
                ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : 'bg-white/10 text-gray-400 hover:bg-white/20 border border-white/10'
            }`}
          >
            <Sparkles size={18} />
          </button>

          {/* Interactive Whiteboard */}
          <button
            onClick={toggleWhiteboard}
            title={isWhiteboardOpen ? 'Закрыть доску (W)' : 'Интерактивная доска (W)'}
            aria-label="Интерактивная доска"
            className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200 ${
              isWhiteboardOpen
                ? 'bg-amber-500/25 text-amber-300 hover:bg-amber-500/35 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            <PenTool size={18} className={isWhiteboardOpen ? 'text-amber-300' : 'text-amber-400'} />
          </button>
        </div>

        {/* 5. More Tools Sheet Button (Available on all screens) */}
        <button
          onClick={() => setIsToolsSheetOpen(true)}
          title="More tools"
          aria-label="More tools"
          className={`relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all duration-200 shrink-0 ${
            activeFeaturesCount > 0
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
          }`}
        >
          <LayoutGrid size={20} />
          {activeFeaturesCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse shadow-md">
              {activeFeaturesCount}
            </span>
          )}
        </button>

        {/* Device Settings Button */}
        <button
          onClick={onOpenSettings}
          title="Device settings"
          aria-label="Device settings"
          className="w-11 h-11 sm:w-12 sm:h-12 hidden md:flex items-center justify-center rounded-full transition-all duration-200 shrink-0 bg-white/10 text-white hover:bg-white/20 border border-white/10"
        >
          <Settings size={20} />
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
    </>
  );
}
