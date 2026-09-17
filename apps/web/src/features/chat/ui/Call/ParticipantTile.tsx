import React, { useEffect, useRef, useState } from 'react';
import { MicOff, Monitor, Sparkles, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import type { UserSnapshot } from '@common/contracts';

import { useCallStore } from '../../model/callStore';
import { WebGPUSuperResEngine } from '../../lib/webrtc/customVideoPipeline';
import { useSynestheticVisualizer } from '../../lib/webrtc/synestheticVisualizer';
import { useIntersectionSimulcastSubscription } from '../../lib/webrtc/simulcastSubscriptionManager';
import { useDirectAudioVisualizer } from '../../lib/webrtc/directAudioVisualizer';
import { globalSpeakerMixerManager } from '../../lib/webrtc/perSpeakerMixer';
import { SpeakerMixerPopover } from './SpeakerMixerPopover';
import { ConnectionRadarBadge } from './ConnectionRadarBadge';

interface ParticipantTileProps {
  user?: UserSnapshot | null;
  stream?: MediaStream | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenShare?: boolean;
  isSpeaking?: boolean;
  isDominantSpeaker?: boolean;
  className?: string;
  onRegisterTile?: (userId: string, el: HTMLElement) => void;
  onUnregisterTile?: (userId: string) => void;
  onRegisterMediaElement?: (el: HTMLMediaElement) => void;
}

export function ParticipantTile({
  user,
  stream,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  isScreenShare = false,
  isSpeaking = false,
  isDominantSpeaker = false,
  className = '',
  onRegisterTile,
  onUnregisterTile,
  onRegisterMediaElement,
}: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const superResEngineRef = useRef<WebGPUSuperResEngine | null>(null);

  const {
    isSpatialAudioEnabled,
    webGpuSuperResMode,
    isPeerRelayActive,
    zkpProof,
    isSynestheticVisualizerEnabled,
    isDeafened,
  } = useCallStore();

  const [isMixerOpen, setIsMixerOpen] = useState(false);

  const synestheticStyle = useSynestheticVisualizer(stream, isSynestheticVisualizerEnabled);
  const { currentLayer } = useIntersectionSimulcastSubscription(user?.id, isLocal, containerRef);
  const visualizerRef = useRef<HTMLDivElement | null>(null);
  useDirectAudioVisualizer(visualizerRef, stream ?? null, isMuted);

  useEffect(() => {
    if (!isLocal && user?.id && stream && stream.getAudioTracks().length > 0) {
      globalSpeakerMixerManager.attachSpeaker(user.id, stream);
      return () => {
        globalSpeakerMixerManager.detachSpeaker(user.id);
      };
    }
  }, [isLocal, user?.id, stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      if (onRegisterMediaElement) {
        onRegisterMediaElement(video);
      }
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err: unknown) => {
          if (
            err instanceof Error &&
            (err.name === 'NotAllowedError' || err.name === 'AbortError')
          ) {
            useCallStore.getState().setIsAutoplayBlocked(true);
          }
        });
      }
    }
  }, [stream, onRegisterMediaElement]);

  // WebGPU Super-Resolution Frame Processing Loop
  useEffect(() => {
    if (isLocal || webGpuSuperResMode === 'off') return;

    if (!superResEngineRef.current) {
      superResEngineRef.current = new WebGPUSuperResEngine(webGpuSuperResMode);
      void superResEngineRef.current.init(canvasRef.current || undefined);
    } else {
      superResEngineRef.current.setMode(webGpuSuperResMode);
    }

    let animId: number;
    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2 && !video.paused) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
        }
        superResEngineRef.current?.processFrame(video, canvas);
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isLocal, webGpuSuperResMode]);

  // Register container for Adaptive Peer Mesh viewport optimization
  useEffect(() => {
    if (user?.id && containerRef.current && onRegisterTile) {
      onRegisterTile(user.id, containerRef.current);
    }
    return () => {
      if (user?.id && onUnregisterTile) {
        onUnregisterTile(user.id);
      }
    };
  }, [user?.id, onRegisterTile, onUnregisterTile]);

  const hasActiveVideoTrack = Boolean(
    stream &&
    stream.getVideoTracks().length > 0 &&
    stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live') &&
    !isVideoOff,
  );

  return (
    <div
      ref={containerRef}
      data-simulcast-layer={currentLayer}
      style={
        isSynestheticVisualizerEnabled && synestheticStyle.isSpeaking
          ? {
              borderColor: synestheticStyle.borderColor,
              boxShadow: synestheticStyle.boxShadow,
              borderWidth: synestheticStyle.borderWidth,
            }
          : undefined
      }
      className={`relative overflow-hidden rounded-2xl bg-zinc-900/90 border flex items-center justify-center shadow-2xl transition-all duration-300 ${
        isDominantSpeaker
          ? 'border-emerald-400 ring-2 ring-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.45)]'
          : isSpeaking && (!isSynestheticVisualizerEnabled || !synestheticStyle.isSpeaking)
            ? 'border-emerald-500/80 ring-1 ring-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
            : !isSynestheticVisualizerEnabled || !synestheticStyle.isSpeaking
              ? 'border-white/10'
              : ''
      } ${className}`}
    >
      {/* Video Feed */}
      {stream && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal || (!isLocal && isSpatialAudioEnabled) || (!isLocal && isDeafened)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              hasActiveVideoTrack && !isLocal && webGpuSuperResMode !== 'off'
                ? 'opacity-0 absolute pointer-events-none'
                : hasActiveVideoTrack
                  ? 'opacity-100'
                  : 'opacity-0 absolute'
            } ${isLocal && !isScreenShare ? 'scale-x-[-1]' : ''}`}
          />
          {!isLocal && webGpuSuperResMode !== 'off' && (
            <canvas
              ref={canvasRef}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                hasActiveVideoTrack ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
              }`}
            />
          )}
        </>
      )}

      {/* Top Badges (Connection Radar / WebGPU Super-Res / Peer Relay / ZKP) */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-20 pointer-events-none">
        <ConnectionRadarBadge
          stream={stream}
          videoElement={videoRef.current}
          userName={user?.displayName || user?.username}
          isLocal={isLocal}
        />
        {!isLocal && hasActiveVideoTrack && webGpuSuperResMode !== 'off' && (
          <div className="flex items-center gap-1 bg-cyan-500/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-cyan-400/30 text-[10px] font-semibold text-cyan-300 shadow-md">
            <Sparkles size={11} className="text-cyan-300" />
            <span>
              {webGpuSuperResMode === 'neural_4k'
                ? 'WebGPU 4K AI Upscale'
                : webGpuSuperResMode === 'fsr_2x'
                  ? 'FSR 2x Reconstruct'
                  : 'CAS Sharpness'}
            </span>
          </div>
        )}
        {isPeerRelayActive && (
          <div className="flex items-center gap-1 bg-violet-500/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-violet-400/30 text-[10px] font-semibold text-violet-300 shadow-md">
            <ShieldCheck size={11} className="text-violet-300" />
            <span>P2P Mesh Relay</span>
          </div>
        )}
        {!isLocal && zkpProof && (
          <div className="flex items-center gap-1 bg-emerald-500/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-emerald-400/30 text-[10px] font-semibold text-emerald-300 shadow-md">
            <ShieldCheck size={11} className="text-emerald-300" />
            <span>ZK-Verified</span>
          </div>
        )}
      </div>

      {/* Audio-only / Video-off Fallback with Luxury Wave Glow */}
      {!hasActiveVideoTrack && (
        <div className="flex flex-col items-center justify-center gap-4 select-none p-6">
          <div
            ref={visualizerRef}
            style={{
              boxShadow:
                '0 0 var(--volume-glow, 0px) rgba(52, 211, 153, calc(var(--volume, 0) * 0.9))',
              transform: 'scale(var(--speech-scale, 1))',
            }}
            className="relative flex items-center justify-center rounded-full will-change-transform"
          >
            {/* Animated audio wave ripples */}
            {isSpeaking ? (
              <>
                <div className="absolute w-28 h-28 rounded-full bg-emerald-500/20 animate-ping opacity-60 pointer-events-none" />
                <div className="absolute w-24 h-24 rounded-full bg-emerald-500/30 animate-pulse pointer-events-none" />
              </>
            ) : (
              <>
                <div className="absolute w-28 h-28 rounded-full bg-indigo-500/10 animate-ping opacity-40 pointer-events-none" />
                <div className="absolute w-24 h-24 rounded-full bg-violet-500/20 animate-pulse pointer-events-none" />
              </>
            )}
            <Avatar
              src={user?.avatar || null}
              size="lg"
              className={`relative z-10 transition-all ${
                isSpeaking
                  ? 'ring-4 ring-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.7)]'
                  : 'ring-4 ring-white/10 shadow-xl'
              }`}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white tracking-wide">
              {user?.displayName || user?.username || (isLocal ? 'You' : 'Participant')}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isLocal ? 'Your camera is off' : 'Camera off'}
            </p>
          </div>
        </div>
      )}

      {/* Bottom Metadata Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-xs font-medium text-white shadow-lg">
          {isScreenShare && <Monitor size={13} className="text-blue-400" />}
          {isSpeaking && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          )}
          <span className="truncate max-w-35">
            {isLocal ? 'You' : user?.displayName || user?.username || 'Guest'}
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {!isLocal && user?.id && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMixerOpen((prev) => !prev);
              }}
              title="Speaker Audio Mixer (Volume, 3-Band EQ, Pan)"
              className={`p-1.5 rounded-full backdrop-blur-md border transition-all ${
                isMixerOpen
                  ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-black/60 text-zinc-300 hover:text-white hover:bg-black/80 border-white/10'
              }`}
            >
              <SlidersHorizontal size={13} />
            </button>
          )}

          {isMuted && (
            <div className="flex items-center justify-center w-7 h-7 bg-rose-500/90 text-white rounded-full shadow-lg border border-white/20">
              <MicOff size={14} />
            </div>
          )}
        </div>
      </div>

      {!isLocal && user?.id && (
        <SpeakerMixerPopover
          userId={user.id}
          userName={user?.displayName || user?.username || 'Participant'}
          isOpen={isMixerOpen}
          onClose={() => setIsMixerOpen(false)}
        />
      )}
    </div>
  );
}
