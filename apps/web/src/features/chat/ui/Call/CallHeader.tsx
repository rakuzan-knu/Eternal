import React, { useState, useEffect } from 'react';
import {
  Minimize2,
  Settings,
  ShieldCheck,
  Wifi,
  WifiOff,
  Sparkles,
  X,
  Activity,
} from 'lucide-react';
import { useCallStore } from '../../model/callStore';

interface CallHeaderProps {
  onTogglePiP: () => void;
  onOpenSettings: () => void;
  /** Promotes E2EE state to 'verified' after the user confirms the SAS ceremony. */
  onConfirmSasMatch?: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function CallHeader({ onTogglePiP, onOpenSettings, onConfirmSasMatch }: CallHeaderProps) {
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
    callType,
    remoteParticipant,
    durationSec,
    connectionQuality,
    isNoiseSuppressionEnabled,
    e2eeStatus,
    sasCode,
    sasEmojis,
    networkStats,
    isStatsHUDOpen,
    toggleStatsHUD,
    setE2EEInfo,
  } = useCallStore();

  const handleConfirmSas = () => {
    if (onConfirmSasMatch) {
      onConfirmSasMatch();
    }
    const state = useCallStore.getState();
    if (state.e2eeStatus !== 'verified') {
      setE2EEInfo('verified', state.e2eeFingerprint, state.sasCode, state.sasEmojis);
    }
    setShowE2EEModal(false);
  };

  const getQualityBadge = () => {
    switch (connectionQuality) {
      case 'excellent':
        return (
          <span
            title={
              networkStats
                ? `Bitrate: ${networkStats.bitrate} kbps | Loss: ${networkStats.packetLoss}% | RTT: ${networkStats.rtt}ms`
                : 'HD Connection'
            }
            className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)] cursor-help"
          >
            <Wifi size={12} />
            <span>HD {networkStats ? `(${networkStats.bitrate}k)` : ''}</span>
          </span>
        );
      case 'good':
        return (
          <span
            title={
              networkStats
                ? `Bitrate: ${networkStats.bitrate} kbps | Loss: ${networkStats.packetLoss}% | RTT: ${networkStats.rtt}ms`
                : 'Good Connection'
            }
            className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 cursor-help"
          >
            <Wifi size={12} />
            <span>Good</span>
          </span>
        );
      case 'poor':
        return (
          <span
            title={
              networkStats
                ? `Auto-adapted down: Loss ${networkStats.packetLoss}%, RTT ${networkStats.rtt}ms`
                : 'Weak Connection (Auto-Adapting)'
            }
            className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 animate-pulse cursor-help"
          >
            <WifiOff size={12} />
            <span>Auto-Adapting</span>
          </span>
        );
      case 'disconnected':
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-gray-500/10 px-2 py-0.5 rounded-full border border-gray-500/20 animate-pulse">
            <WifiOff size={12} />
            <span>ICE Reconnecting</span>
          </span>
        );
    }
  };

  const emojiString =
    typeof sasEmojis === 'string'
      ? sasEmojis
      : Array.isArray(sasEmojis)
        ? (sasEmojis as string[]).join(' ')
        : '';
  const compactEmojis = Array.from(emojiString.replace(/\s+/g, '')).slice(0, 2).join('');

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 sm:px-6 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3 sm:py-4 bg-linear-to-b from-black/85 via-black/50 to-transparent backdrop-blur-[3px] select-none">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide truncate sm:max-w-xs md:max-w-md">
                {remoteParticipant?.displayName ||
                  remoteParticipant?.username ||
                  'Voice & Video Call'}
              </h2>

              {/* Mobile safety emojis (shown only while a session key exists) */}
              {emojiString ? (
                <button
                  type="button"
                  onClick={() => setShowE2EEModal(true)}
                  title="Safety emojis — tap to compare"
                  aria-label="Compare safety emojis for end-to-end encryption"
                  className="sm:hidden flex items-center gap-1 text-[10px] font-medium text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/80 px-2 py-0.5 rounded-full border border-emerald-500/30 cursor-pointer shrink-0"
                >
                  <span>{compactEmojis}</span>
                </button>
              ) : null}

              {/* Desktop safety emojis */}
              {emojiString && (
                <button
                  type="button"
                  onClick={() => setShowE2EEModal(true)}
                  title="Safety emojis — tap to compare"
                  aria-label="Compare safety emojis for end-to-end encryption"
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-emerald-500/40 text-xs tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all cursor-pointer"
                >
                  <span>{emojiString}</span>
                </button>
              )}

              {/* RNNoise Active Badge */}
              {isNoiseSuppressionEnabled && (
                <span className="hidden xs:flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded-full border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                  <Sparkles size={11} className="text-cyan-400" />
                  <span>RNNoise</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
              <span className="text-[11px] sm:text-xs text-gray-400 capitalize whitespace-nowrap">
                {callType} • {callStatus === 'connected' ? formatDuration(durationSec) : callStatus}
              </span>
              {callStatus === 'connected' && getQualityBadge()}
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
            onClick={onOpenSettings}
            title="Call & Audio Settings"
            aria-label="Call & Audio Settings"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-gray-300 hover:text-white transition-all backdrop-blur-md border border-white/10 cursor-pointer"
          >
            <Settings size={16} className="sm:w-4.5 sm:h-4.5" />
          </button>
          <button
            onClick={onTogglePiP}
            title="Minimize to Picture-in-Picture"
            aria-label="Minimize to Picture-in-Picture"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-gray-300 hover:text-white transition-all backdrop-blur-md border border-white/10 cursor-pointer"
          >
            <Minimize2 size={16} className="sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </div>

      {/* E2EE SAS Verification Modal */}
      {showE2EEModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="End-to-End Encryption Verification"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm rounded-2xl bg-neutral-900/95 border border-emerald-500/30 p-6 shadow-2xl shadow-emerald-950/50 text-white">
            <button
              onClick={() => setShowE2EEModal(false)}
              aria-label="Close verification dialog"
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {e2eeStatus === 'verified' ? (
                    <>
                      Verified <span className="text-emerald-400">•</span>
                    </>
                  ) : e2eeStatus === 'unverified' ? (
                    <>
                      Verify <span className="text-amber-400">•</span>
                    </>
                  ) : (
                    <span className="text-gray-300">Off</span>
                  )}
                </h3>
              </div>
            </div>

            {e2eeStatus !== 'disabled' && e2eeStatus !== 'unsupported' && (
              <p className="text-xs text-gray-300 leading-relaxed mb-4">
                {e2eeStatus === 'verified'
                  ? 'Codes match on both phones.'
                  : 'Make sure these match on both phones.'}
              </p>
            )}

            {/* Safety emojis — the only verification surface (Telegram-style) */}
            {emojiString ? (
              <>
                <div className="bg-emerald-950/40 rounded-xl p-4 border border-emerald-500/30 mb-3 text-center">
                  <div className="text-3xl tracking-widest py-2 bg-black/50 rounded-lg border border-emerald-500/20 select-all shadow-inner">
                    {emojiString}
                  </div>
                </div>

                <div className="bg-black/60 rounded-xl p-3 border border-white/10 mb-4 text-center">
                  <div className="text-xl font-mono font-bold tracking-widest text-emerald-400">
                    {sasCode}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-400 text-center mb-4">No active session key.</p>
            )}

            {e2eeStatus === 'unverified' && emojiString ? (
              <button
                onClick={handleConfirmSas}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold tracking-wide transition-all shadow-lg shadow-emerald-600/30"
              >
                They Match
              </button>
            ) : null}
            <button
              onClick={() => setShowE2EEModal(false)}
              className="w-full mt-2 py-2 rounded-xl bg-transparent hover:bg-white/10 text-gray-300 text-xs transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
