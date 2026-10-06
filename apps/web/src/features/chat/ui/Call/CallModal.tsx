import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Phone,
  PhoneOff,
  ShieldCheck,
  Video,
  SquareArrowOutUpRight,
  SquareArrowDownLeft,
} from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import { useCallStore } from '../../model/callStore';
import { useCall } from '../../model/CallContext';
import { triggerCallPiPTransition, getPiPLastCenter } from '../../lib/webrtc/callPiPTransition';
import { CallHeader } from './CallHeader';
import { ParticipantGrid } from './ParticipantGrid';
import { CallControls } from './CallControls';
import { ScreenShareIndicator } from './ScreenShareIndicator';
import { useUIStore } from '@/shared/model/useUIStore';
import { ReconnectionOverlay } from './ReconnectionOverlay';
import { FileTransferDrawer } from './FileTransferDrawer';
import { StatsHUD } from './StatsHUD';
import { SyncPlayModal } from './SyncPlayModal';
import { WhiteboardModal } from './WhiteboardModal';
import { AutoplayBlockedBanner } from './AutoplayBlockedBanner';
import { WatchTogetherActivityBanner } from './WatchTogetherActivityBanner';
import { CallAriaLiveAnnouncer } from './CallAriaLiveAnnouncer';
import { ReactionParticleCanvas } from './ReactionParticleCanvas';
import { CallSchemaOrg } from './CallSchemaOrg';
import { useVoiceCommandEngine } from '../../lib/webrtc/voiceCommandEngine';
import { globalMediaSessionCoordinator } from '../../lib/webrtc/mediaSessionCoordinator';
import { globalDocumentPiPManager } from '../../lib/webrtc/documentPiPManager';
import { CallPiPPortal } from './CallPiPPortal';
import { ScreenAnnotationOverlay } from './ScreenAnnotationOverlay';
import { useCallKeyboardShortcuts } from '../../model/useCallKeyboardShortcuts';
import { LiveSummaryModal } from './LiveSummaryModal';
import { DualCameraModal } from './DualCameraModal';
import { HolographicCallModal } from './HolographicCallModal';

export function CallModal() {
  const {
    callStatus,

    callType,
    remoteParticipant,
    incomingCall,
    isPiP,
    isSettingsOpen,
    isFileTransferOpen,
    isStatsHUDOpen,
    liveStats,
    isSyncPlayOpen,
    syncPlayDriftMs,
    syncPlayRttMs,
    isWhiteboardOpen,
    isWhiteboardOverlay,
    isAutoplayBlocked,
    isVisualRingingEnabled,
    isVoiceCommandsEnabled,
    isAudioOnlyFallbackActive,
    audioOnlyFallbackReason,
    isMuted,
    isVideoOff,
    isScreenSharing,
    screenShareStream,
    localStream,
    isSoundboardOpen,
    setIsSoundboardOpen,
    isLiveSummaryOpen,
    setIsLiveSummaryOpen,
    isDualCameraOpen,
    setIsDualCameraOpen,
    isHolographicCallOpen,
    setIsHolographicCallOpen,
    isScreenAnnotationActive,
    setIsScreenAnnotationActive,
    setIsPiP,
    setIsSettingsOpen,
    setIsFileTransferOpen,
    setIsStatsHUDOpen,
    setIsSyncPlayOpen,
    setIsWhiteboardOpen,
    setIsWhiteboardOverlay,
    toggleStatsHUD,
    toggleWhiteboard,
  } = useCallStore();

  const {
    endCall,
    acceptCall,
    rejectCall,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleScreenShare,
    sendP2PFile,
    cancelP2PTransfer,
    syncPlayEngine,
    whiteboardEngine,
    unblockAutoplay,
    reactionEngine,
    sendReaction,
    confirmE2eeSasMatch,
  } = useCall();

  // Global shortcut: Ctrl+Shift+D or Cmd+Shift+D toggles Stats HUD
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        toggleStatsHUD();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleStatsHUD]);

  // Voice Command Engine (Hands-Free)
  useVoiceCommandEngine(
    React.useMemo(
      () => ({
        onMute: (muted) => {
          if (muted !== isMuted) toggleMute();
        },
        onVideo: (videoOff) => {
          if (videoOff !== isVideoOff) toggleVideo();
        },
        onEndCall: () => {
          endCall();
        },
        onOpenChat: () => {
          setIsSettingsOpen(false);
        },
      }),
      [isMuted, isVideoOff, toggleMute, toggleVideo, endCall, setIsSettingsOpen],
    ),
    callStatus === 'connected' && isVoiceCommandsEnabled,
  );

  // Global hotkeys: Space (Push-to-Talk), Cmd/Ctrl+Shift+M (mute), Cmd/Ctrl+Shift+V (video), W (whiteboard)
  useCallKeyboardShortcuts({
    onToggleMute: toggleMute,
    onToggleVideo: toggleVideo,
    onToggleWhiteboard: toggleWhiteboard,
  });

  // OS Media Session & App Badging integration
  React.useEffect(() => {
    if (callStatus === 'connected') {
      globalMediaSessionCoordinator.bindCallSession(
        {
          title: String(callType).toLowerCase() === 'video' ? 'Video Call' : 'Voice Call',
          callerName: remoteParticipant?.username || 'Peer',
          avatarUrl: remoteParticipant?.avatar ?? undefined,
        },
        {
          onToggleMute: toggleMute,
          onMute: (muted) => {
            if (muted !== isMuted) toggleMute();
          },
          onToggleVideo: toggleVideo,
          onEndCall: endCall,
        },
        isMuted,
      );
      globalMediaSessionCoordinator.setBadgeCount(1).catch(() => {});
    } else {
      globalMediaSessionCoordinator.clear();
      globalMediaSessionCoordinator.clearBadge().catch(() => {});
    }

    return () => {
      if (callStatus === 'connected') {
        globalMediaSessionCoordinator.clear();
        globalMediaSessionCoordinator.clearBadge().catch(() => {});
      }
    };
  }, [callStatus, callType, remoteParticipant, isMuted, toggleMute, toggleVideo, endCall]);

  const [popoutWin, setPopoutWin] = React.useState<Window | null>(null);

  const handleTogglePopout = React.useCallback(async () => {
    if (globalDocumentPiPManager.isOpen()) {
      globalDocumentPiPManager.close();
      setPopoutWin(null);
    } else {
      const win = await globalDocumentPiPManager.open({ width: 960, height: 600 });
      if (win) {
        setPopoutWin(win);
        globalDocumentPiPManager.onClose(() => {
          setPopoutWin(null);
        });
      }
    }
  }, []);

  const handleClosePopout = React.useCallback(() => {
    if (globalDocumentPiPManager.isOpen()) {
      globalDocumentPiPManager.close();
    }
    setPopoutWin(null);
  }, []);

  // Close popout window cleanly if call disconnects
  React.useEffect(() => {
    if (callStatus !== 'connected' && popoutWin) {
      handleClosePopout();
    }
  }, [callStatus, popoutWin, handleClosePopout]);

  // Clean up popout window on unmount
  React.useEffect(() => {
    return () => {
      if (globalDocumentPiPManager.isOpen()) {
        globalDocumentPiPManager.close();
      }
    };
  }, []);

  const location = useLocation();
  const lastPathnameRef = React.useRef(location.pathname);

  // Automatically minimize call to PiP when user navigates anywhere on the site while call is connected and fullscreen
  React.useEffect(() => {
    if (lastPathnameRef.current !== location.pathname) {
      lastPathnameRef.current = location.pathname;
      if (callStatus === 'connected' && !isPiP) {
        triggerCallPiPTransition('minimize', getPiPLastCenter(), () => {
          setIsPiP(true);
        });
      }
    }
  }, [location.pathname, callStatus, isPiP, setIsPiP]);

  const handleTogglePiP = React.useCallback(() => {
    if (!isPiP) {
      triggerCallPiPTransition('minimize', getPiPLastCenter(), () => {
        setIsPiP(true);
      });
    } else {
      triggerCallPiPTransition('expand', getPiPLastCenter(), () => {
        setIsPiP(false);
      });
    }
  }, [isPiP, setIsPiP]);

  // If idle or minimized in in-site PiP, modal shouldn't display full view
  if (callStatus === 'idle') return null;
  if (isPiP) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-fadeIn select-none h-dvh max-h-dvh w-screen overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      {/* Schema.org JSON-LD Structured Data for Search Engines */}
      <CallSchemaOrg />

      {/* Screen reader live regions for blind / visually impaired users (WCAG 2.2 AAA) */}
      <CallAriaLiveAnnouncer />

      {/* Visual Flash Ringing for deaf / hard-of-hearing users */}
      {callStatus === 'ringing' && isVisualRingingEnabled && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-60 border-8 border-emerald-400/80 animate-pulse shadow-[inset_0_0_120px_rgba(52,211,153,0.55)] transition-all duration-300"
        />
      )}

      {/* Audio-Only Fallback Notification Banner */}
      {callStatus === 'connected' && isAudioOnlyFallbackActive && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3.5 py-1.5 bg-amber-950/85 border border-amber-500/30 text-amber-200 text-xs rounded-full backdrop-blur-md shadow-lg animate-fadeIn select-none pointer-events-none max-w-[calc(100vw-32px)] text-center">
          <span className="w-2 h-2 shrink-0 rounded-full bg-amber-400 animate-ping" />
          <span className="truncate">Poor connection: video temporarily paused</span>
          {audioOnlyFallbackReason && (
            <span className="text-[10px] text-amber-300/70 font-mono hidden sm:inline">
              ({audioOnlyFallbackReason})
            </span>
          )}
        </div>
      )}

      {/* 1. Outgoing Calling Screen */}
      {callStatus === 'calling' && (
        <div className="flex flex-col items-center justify-center gap-6 sm:gap-8 p-4 sm:p-8 max-w-sm w-full text-center">
          <div className="relative flex items-center justify-center">
            {/* Pulsating Radar Rings */}
            <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-indigo-500/10 animate-ping opacity-50" />
            <div className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-violet-500/20 animate-pulse" />
            <div className="absolute w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-indigo-500/30" />
            <Avatar
              src={remoteParticipant?.avatar}
              size="xl"
              suppressDecoration={true}
              className="relative z-10 ring-4 ring-indigo-500/50 shadow-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide truncate max-w-xs">
              {remoteParticipant?.displayName || remoteParticipant?.username || 'Calling…'}
            </h2>
            <p className="text-sm text-indigo-300 animate-pulse capitalize">Calling {callType}…</p>
          </div>

          <button
            onClick={endCall}
            className="mt-4 sm:mt-6 flex items-center justify-center gap-2 min-h-12 px-8 py-3 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-medium shadow-xl shadow-rose-600/30 transition-all hover:scale-105 cursor-pointer"
          >
            <PhoneOff size={18} />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* 2. Incoming Ringing Screen */}
      {callStatus === 'ringing' && incomingCall && (
        <div className="flex flex-col items-center justify-center gap-6 sm:gap-8 p-4 sm:p-8 max-w-sm w-full text-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-emerald-500/10 animate-ping opacity-60" />
            <div className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-teal-500/20 animate-pulse" />
            <Avatar
              src={incomingCall.caller.avatar}
              size="xl"
              suppressDecoration={true}
              className="relative z-10 ring-4 ring-emerald-500/50 shadow-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide truncate max-w-xs">
              {incomingCall.caller.displayName || incomingCall.caller.username}
            </h2>
            <div className="flex items-center justify-center gap-1.5 text-sm text-emerald-400">
              {String(incomingCall.callType).toLowerCase() === 'video' ? (
                <Video size={16} />
              ) : (
                <Phone size={16} />
              )}
              <span className="capitalize">
                Incoming {String(incomingCall.callType).toLowerCase()} call…
              </span>
            </div>
            {incomingCall.zkpProof && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full mx-auto w-fit shadow-md">
                <ShieldCheck size={14} className="text-emerald-300" />
                <span>ZK-Verified Identity (Anonymous)</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-6 mt-4 sm:mt-6">
            <button
              onClick={() => rejectCall('DECLINED')}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-xl shadow-rose-600/30 transition-all hover:scale-105 cursor-pointer"
              title="Decline"
            >
              <PhoneOff size={22} />
            </button>
            <button
              onClick={() => void acceptCall()}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white shadow-xl shadow-emerald-500/30 transition-all hover:scale-105 cursor-pointer"
              title="Accept"
            >
              <Phone size={22} />
            </button>
          </div>
        </div>
      )}

      {/* 3. Connected Active Call Screen */}
      {callStatus === 'connected' && (
        <div className="relative w-full h-full flex flex-col justify-between overflow-hidden">
          {/* Autoplay Blocked Interception Banner (Mobile Safari / iOS) */}
          {isAutoplayBlocked && <AutoplayBlockedBanner onUnblock={() => void unblockAutoplay()} />}

          <CallHeader
            onTogglePopout={handleTogglePopout}
            isPoppedOut={Boolean(popoutWin)}
            onTogglePiP={handleTogglePiP}
            onOpenSettings={() => useUIStore.getState().openEditProfile('voice-video')}
            onConfirmSasMatch={confirmE2eeSasMatch}
          />

          {popoutWin ? (
            <>
              {/* Separate Popout Floating Window Portal */}
              <CallPiPPortal
                pipWindow={popoutWin}
                onClose={handleClosePopout}
                onToggleMute={toggleMute}
                onToggleDeafen={toggleDeafen}
                onToggleVideo={toggleVideo}
                onToggleScreenShare={toggleScreenShare}
                onEndCall={endCall}
              />

              {/* Main window paused state overlay */}
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-[#7059f6]/10 border border-[#7059f6]/20 flex items-center justify-center mb-4 text-[#7059f6] shadow-lg shadow-[#7059f6]/10">
                  <SquareArrowOutUpRight size={28} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  You&apos;ve popped out the player to another window
                </h3>
                <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
                  Call and controls have been moved to a separate window for maximum performance.
                </p>
                <button
                  type="button"
                  onClick={handleClosePopout}
                  className="px-5 py-2.5 rounded-full bg-[#7059f6] hover:bg-[#5f46f5] active:scale-95 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-[#7059f6]/30 transition-all cursor-pointer"
                >
                  <SquareArrowDownLeft size={17} />
                  <span>Return to this window</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <ScreenShareIndicator onStop={toggleScreenShare} />

              {(isScreenSharing || screenShareStream) && (
                <ScreenAnnotationOverlay
                  isActive={isScreenAnnotationActive}
                  onClose={() => setIsScreenAnnotationActive(false)}
                />
              )}

              <ParticipantGrid />

              {/* Floating Reaction Emote Particles Canvas */}
              <ReactionParticleCanvas engine={reactionEngine} />

              <CallControls
                onToggleMute={toggleMute}
                onToggleDeafen={toggleDeafen}
                onToggleVideo={toggleVideo}
                onToggleScreenShare={toggleScreenShare}
                onEndCall={endCall}
                onOpenSettings={() => useUIStore.getState().openEditProfile('voice-video')}
                onSendReaction={sendReaction}
              />
            </>
          )}

          {/* Watch Together Live Activity Notification */}
          <WatchTogetherActivityBanner className="absolute top-20 left-1/2 -translate-x-1/2 w-[92%] max-w-lg z-40" />

          {/* Reconnection Grace Period Overlay */}
          <ReconnectionOverlay onCancelCall={endCall} />

          {/* P2P File Transfer Drawer */}
          {isFileTransferOpen && (
            <FileTransferDrawer
              onClose={() => setIsFileTransferOpen(false)}
              onSendFile={sendP2PFile}
              onCancelTransfer={cancelP2PTransfer}
            />
          )}

          {/* Live Stream Stats HUD */}
          {isStatsHUDOpen && (
            <StatsHUD stats={liveStats} onClose={() => setIsStatsHUDOpen(false)} />
          )}

          {/* Frame-Accurate SyncPlay (Watch Together) */}
          <SyncPlayModal
            isOpen={isSyncPlayOpen}
            engine={syncPlayEngine ?? null}
            onClose={() => setIsSyncPlayOpen(false)}
            driftMs={syncPlayDriftMs}
            rttMs={syncPlayRttMs}
          />

          {/* CRDT Interactive Whiteboard */}
          <WhiteboardModal
            isOpen={isWhiteboardOpen}
            isOverlay={isWhiteboardOverlay}
            engine={whiteboardEngine ?? null}
            onClose={() => setIsWhiteboardOpen(false)}
            onToggleOverlay={setIsWhiteboardOverlay}
          />

          {/* AI Live Summary («What did I miss?») */}
          <LiveSummaryModal
            isOpen={isLiveSummaryOpen}
            onClose={() => setIsLiveSummaryOpen(false)}
          />

          {/* Dual-Camera Studio Mode */}
          <DualCameraModal isOpen={isDualCameraOpen} onClose={() => setIsDualCameraOpen(false)} />

          {/* 3D Gaussian Splatting Holographic Call */}
          <HolographicCallModal
            isOpen={isHolographicCallOpen}
            onClose={() => setIsHolographicCallOpen(false)}
            userName={remoteParticipant?.displayName || remoteParticipant?.username || 'Peer'}
          />
        </div>
      )}
    </div>
  );
}
