import React, { useState, useEffect, useMemo } from 'react';
import {
  Minimize2,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
  Activity,
  SquareArrowOutUpRight,
  SquareArrowDownLeft,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallStore } from '../../model/callStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { chatApi } from '@/entities/chat';
import type { ConversationView } from '@/entities/chat/model/types';
import { queryKeys } from '@/shared/api/queryKeys';
import { TelegramEmojiRow } from './TelegramAppleEmoji';

interface CallHeaderProps {
  onTogglePopout: () => void;
  isPoppedOut?: boolean;
  onTogglePiP?: () => void;
  onOpenSettings: () => void;
  /** Promotes E2EE state to 'verified' after the user confirms the SAS ceremony. */
  onConfirmSasMatch?: () => void;
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

export function CallHeader({
  onTogglePopout,
  isPoppedOut = false,
  onTogglePiP,
  onOpenSettings,
  onConfirmSasMatch,
}: CallHeaderProps) {
  const [showE2EEModal, setShowE2EEModal] = useState(false);

  useEffect(() => {
    if (!showE2EEModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowE2EEModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showE2EEModal]);

  const {
    callStatus,
    conversationId,
    remoteParticipant,
    durationSec,
    isNoiseSuppressionEnabled,
    e2eeStatus,
    sasCode,
    sasEmojis,
    isStatsHUDOpen,
    toggleStatsHUD,
    setE2EEInfo,
  } = useCallStore();

  const currentUserId = useAuthStore((s) => s.userId);
  const accentColor = useThemeStore((s) => s.accentColor) || '#7059f6';
  const glassmorphismOpacity = useThemeStore((s) => s.glassmorphismOpacity ?? 0.6);
  const isGlass = glassmorphismOpacity > 0.15;
  const queryClient = useQueryClient();

  // Query conversation to show custom group name or 2-3 participants if group call
  const { data: conversation } = useQuery({
    queryKey: queryKeys.conversations.detail(conversationId || ''),
    queryFn: () => chatApi.getConversation(conversationId!),
    enabled: Boolean(conversationId),
    initialData: () =>
      queryClient
        .getQueryData<ConversationView[]>(queryKeys.conversations.root)
        ?.find((c) => c.id === conversationId),
    staleTime: 15_000,
  });

  const headerTitle = useMemo(() => {
    if (conversation && conversation.type === 'GROUP') {
      // If group has a custom name or was renamed
      if (
        conversation.name &&
        conversation.name.trim() !== '' &&
        conversation.name !== 'Unnamed group'
      ) {
        return conversation.name;
      }

      // Fallback to 2-3 participant nicknames
      const otherNames = (conversation.participants || [])
        .filter((p) => (p.userId || (p as { id?: string }).id) !== currentUserId)
        .map((p) => p.user?.displayName || p.user?.username || p.nickname || 'User')
        .filter(Boolean);

      if (otherNames.length > 0) {
        return otherNames.slice(0, 3).join(', ');
      }
      return conversation.name || 'Group Call';
    }

    // 1-on-1 private call: other user's name
    return remoteParticipant?.displayName || remoteParticipant?.username || 'Voice & Video Call';
  }, [conversation, currentUserId, remoteParticipant]);

  const emojiString =
    typeof sasEmojis === 'string'
      ? sasEmojis
      : Array.isArray(sasEmojis)
        ? (sasEmojis as string[]).join(' ')
        : '';

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 sm:px-6 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3 sm:py-4 bg-linear-to-b from-black/85 via-black/50 to-transparent backdrop-blur-[3px] select-none">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide truncate sm:max-w-xs md:max-w-md">
                {headerTitle}
              </h2>

              {/* Apple iOS / Telegram Style Safety Emojis (Clickable block with subtle outline on hover, no background pill at rest) */}
              {emojiString ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowE2EEModal(true);
                    onConfirmSasMatch?.();
                  }}
                  title="End-to-end encryption (E2EE) code — click to verify"
                  aria-label="Compare end-to-end encryption emojis"
                  className="group flex items-center px-1.5 sm:px-2 py-0.5 rounded-full border border-transparent hover:border-zinc-500/40 hover:bg-white/10 dark:hover:bg-white/5 active:scale-95 transition-all duration-200 cursor-pointer shrink-0"
                >
                  <TelegramEmojiRow
                    emojiString={emojiString}
                    size={24}
                    variant="header"
                    intervalSeconds={30}
                    gapClass="gap-1 sm:gap-1.5"
                  />
                </button>
              ) : null}

              {/* RNNoise Active Badge */}
              {isNoiseSuppressionEnabled && (
                <span className="hidden xs:flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded-full border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                  <Sparkles size={11} className="text-cyan-400" />
                  <span>RNNoise</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
              <span className="text-xs sm:text-sm font-medium text-emerald-400/90 whitespace-nowrap tabular-nums">
                {callStatus === 'connected' ? formatDuration(durationSec) : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={toggleStatsHUD}
            title="WebRTC Live Stream Stats HUD (Ctrl+Shift+D)"
            aria-label="WebRTC Live Stream Stats HUD"
            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full transition-all backdrop-blur-md border cursor-pointer ${
              isStatsHUDOpen
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-500/30'
                : 'bg-white/10 hover:bg-white/20 active:scale-95 text-gray-300 hover:text-white border-white/10'
            }`}
          >
            <Activity size={16} className="sm:w-4.5 sm:h-4.5" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            title="Call & Audio Settings"
            aria-label="Call & Audio Settings"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-gray-300 hover:text-white transition-all backdrop-blur-md border border-white/10 cursor-pointer"
          >
            <Settings size={16} className="sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Pop Out / Pop In button */}
          <button
            type="button"
            onClick={onTogglePopout}
            title={
              isPoppedOut ? 'Pop In (Return to main window)' : 'Pop Out (Open in separate window)'
            }
            aria-label={isPoppedOut ? 'Pop In' : 'Pop Out'}
            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full transition-all backdrop-blur-md border cursor-pointer ${
              isPoppedOut
                ? 'bg-[#7059f6] text-white border-[#7059f6] shadow-lg shadow-[#7059f6]/30'
                : 'bg-white/10 hover:bg-white/20 active:scale-95 text-gray-300 hover:text-white border-white/10'
            }`}
          >
            {isPoppedOut ? (
              <SquareArrowDownLeft size={16} className="sm:w-4.5 sm:h-4.5" />
            ) : (
              <SquareArrowOutUpRight size={16} className="sm:w-4.5 sm:h-4.5" />
            )}
          </button>

          {/* In-Site PiP button */}
          <button
            type="button"
            onClick={onTogglePiP}
            title="Minimize call (In-app PiP)"
            aria-label="Minimize call (In-app PiP)"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-gray-300 hover:text-white transition-all backdrop-blur-md border border-white/10 cursor-pointer"
          >
            <Minimize2 size={16} className="sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </div>

      {/* Minimalist E2EE SAS Verification Modal (Theme-aware, no redundant buttons or inner card backgrounds) */}
      {showE2EEModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="End-to-End Encryption Verification"
          onClick={() => setShowE2EEModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fadeIn select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-sm rounded-[28px] p-6 sm:p-7 shadow-2xl transition-all ${
              isGlass
                ? 'bg-zinc-900/85 backdrop-blur-2xl border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] text-white'
                : 'bg-[#121318] border border-white/10 text-white shadow-2xl'
            }`}
          >
            {/* Top header with subtle shield status and Close 'X' button */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: `${accentColor}25`,
                    color: accentColor,
                  }}
                >
                  <ShieldCheck size={16} />
                </div>
                <h3 className="text-sm font-semibold tracking-wide text-zinc-100">
                  {e2eeStatus === 'verified' ? 'Protected (E2EE)' : 'End-to-End Encryption'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowE2EEModal(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 4 Large Telegram / Apple Style Emojis (No nested cards on background!) */}
            {emojiString && (
              <div className="py-6 flex items-center justify-center">
                <TelegramEmojiRow
                  emojiString={emojiString}
                  size={56}
                  variant="modal"
                  intervalSeconds={5}
                  gapClass="gap-4 sm:gap-5"
                />
              </div>
            )}

            {/* Monospace numeric code */}
            {sasCode && (
              <div className="text-center font-mono font-bold text-base sm:text-lg tracking-[0.25em] text-emerald-400 select-all mb-3">
                {sasCode}
              </div>
            )}

            {/* Clean minimalist text */}
            <p className="text-xs text-zinc-400 text-center leading-relaxed max-w-xs mx-auto">
              If these 4 emojis and code match for both you and your peer, this call is 100%
              protected with end-to-end encryption.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
