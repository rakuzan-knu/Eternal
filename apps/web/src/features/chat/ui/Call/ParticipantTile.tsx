import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MicOff,
  Monitor,
  Sparkles,
  ShieldCheck,
  SlidersHorizontal,
  Music,
  MoreHorizontal,
} from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import type { UserSnapshot } from '@common/contracts';

import { useCallStore } from '../../model/callStore';
import { useVoiceVideoSettingsStore } from '../../model/useVoiceVideoSettingsStore';
import { WebGPUSuperResEngine } from '../../lib/webrtc/customVideoPipeline';
import { useSynestheticVisualizer } from '../../lib/webrtc/synestheticVisualizer';
import { useIntersectionSimulcastSubscription } from '../../lib/webrtc/simulcastSubscriptionManager';
import { useDirectAudioVisualizer } from '../../lib/webrtc/directAudioVisualizer';
import { globalSpeakerMixerManager } from '../../lib/webrtc/perSpeakerMixer';
import { useAvatarTileTheme } from '../../lib/webrtc/useAvatarTileTheme';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import {
  isMusicActivity,
  isGamingActivity,
  getActivityGameIcon,
  getActivityMusicCover,
} from '@/shared/ui/activityIcons';
import { SpotifyBrandIcon } from '@/shared/ui/BrandIcons';
import { SpeakerMixerPopover } from './SpeakerMixerPopover';
import { VideoLoader } from './VideoLoader';
import { ParticipantContextMenu } from './ParticipantContextMenu';
import { CameraPreviewModal } from './CallDevicePopovers';
import { TelegramAppleEmoji } from './TelegramAppleEmoji';

interface ParticipantTileProps {
  user?: UserSnapshot | null;
  stream?: MediaStream | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isDeafened?: boolean;
  isVideoOff?: boolean;
  isScreenShare?: boolean;
  isSpeaking?: boolean;
  isDominantSpeaker?: boolean;
  className?: string;
  onRegisterTile?: (userId: string, el: HTMLElement) => void;
  onUnregisterTile?: (userId: string) => void;
  onRegisterMediaElement?: (el: HTMLMediaElement) => void;
}

function HeadphoneOffIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 14.28-7.3" />
      <path d="M21 14a9 9 0 0 0-.58-3.1" />
      <path d="M16 16a2 2 0 0 1 2-2h3v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3z" />
      <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2.4" />
    </svg>
  );
}

export function ParticipantTile({
  user,
  stream,
  isLocal = false,
  isMuted = false,
  isDeafened = false,
  isVideoOff = false,
  isScreenShare = false,
  isSpeaking = false,
  isDominantSpeaker = false,
  className = '',
  onRegisterTile,
  onUnregisterTile,
  onRegisterMediaElement,
}: ParticipantTileProps) {
  const { data: currentUser } = useCurrentUser();
  const effectiveUser =
    isLocal && currentUser
      ? {
          id: currentUser.id,
          username: currentUser.username || user?.username || 'user',
          displayName:
            currentUser.displayName || currentUser.username || user?.displayName || 'User',
          avatar: currentUser.avatar || user?.avatar || null,
        }
      : user;

  const tileTheme = useAvatarTileTheme(effectiveUser?.avatar);

  const targetUserId = effectiveUser?.id;
  const presenceActivity = usePresenceStore((s) =>
    targetUserId ? s.userActivities[targetUserId] : null,
  );
  const callActivity = useCallStore((s) =>
    targetUserId ? s.participantActivities[targetUserId] : null,
  );
  const localPlayingTrack = useSpotifyPlayerStore((s) =>
    isLocal && s.isPlaying ? s.currentTrack : null,
  );
  const activeSoundboardEvent = useCallStore((s) => {
    if (isLocal) {
      return (
        s.soundboardActiveEvents['me'] ||
        (effectiveUser?.id ? s.soundboardActiveEvents[effectiveUser.id] : null) ||
        null
      );
    }
    return (
      (effectiveUser?.id ? s.soundboardActiveEvents[effectiveUser.id] : null) ||
      (user?.id ? s.soundboardActiveEvents[user.id] : null) ||
      s.soundboardActiveEvents['remote'] ||
      null
    );
  });

  const activityInfo = useMemo(() => {
    // 1. Local Spotify / Web audio player
    if (isLocal && localPlayingTrack) {
      return {
        type: 'music' as const,
        label: localPlayingTrack.title,
        tooltip: `${localPlayingTrack.title} — ${localPlayingTrack.artist}`,
        icon: localPlayingTrack.albumArt ? (
          <img
            src={localPlayingTrack.albumArt}
            alt="Album Art"
            className="w-3.5 h-3.5 rounded-sm object-cover shrink-0"
          />
        ) : (
          <SpotifyBrandIcon size={14} className="shrink-0" />
        ),
      };
    }

    // 2. In-Call or Presence activity (for remote participants or local fallback)
    const activeData = (!isLocal ? callActivity : null) || presenceActivity || callActivity;
    if (activeData) {
      if (isMusicActivity(activeData)) {
        const title = activeData.title || activeData.trackName || 'Music';
        const subtitle = activeData.subtitle || activeData.artistName || activeData.artist;
        return {
          type: 'music' as const,
          label: title,
          tooltip: subtitle ? `${title} — ${subtitle}` : title,
          icon: getActivityMusicCover(activeData, 14),
        };
      }

      if (isGamingActivity(activeData)) {
        const title = activeData.title || activeData.appName || 'Game';
        return {
          type: 'gaming' as const,
          label: title,
          tooltip: `Playing ${title}`,
          icon: getActivityGameIcon(activeData, 14),
        };
      }
    }

    return null;
  }, [isLocal, localPlayingTrack, presenceActivity, callActivity]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const superResEngineRef = useRef<WebGPUSuperResEngine | null>(null);

  const {
    isSpatialAudioEnabled,
    webGpuSuperResMode,
    zkpProof,
    isSynestheticVisualizerEnabled,
    isDeafened: isLocalDeafened,
    isMirrorVideo,
    callType,
  } = useCallStore();

  const outputVolume = useVoiceVideoSettingsStore((s) => s.outputVolume);
  const selectedAudioOutput = useVoiceVideoSettingsStore((s) => s.selectedAudioOutput);

  // Real-time speaker volume control
  useEffect(() => {
    if (!isLocal) {
      globalSpeakerMixerManager.setMasterVolume(outputVolume / 100);
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.volume = 0;
      }
    }
  }, [outputVolume, isLocal]);

  // Real-time audio output device routing via setSinkId
  useEffect(() => {
    if (!isLocal && selectedAudioOutput) {
      globalSpeakerMixerManager.setSinkId(selectedAudioOutput);
      const video = videoRef.current;
      if (
        video &&
        typeof (video as unknown as { setSinkId?: (id: string) => Promise<void> }).setSinkId ===
          'function'
      ) {
        void (video as unknown as { setSinkId: (id: string) => Promise<void> })
          .setSinkId(selectedAudioOutput)
          .catch(() => {});
      }
    }
  }, [selectedAudioOutput, isLocal]);

  useEffect(() => {
    if (!isLocal) {
      globalSpeakerMixerManager.setDeafened(isLocalDeafened);
    }
  }, [isLocalDeafened, isLocal]);

  useEffect(() => {
    if (!isLocal) {
      globalSpeakerMixerManager.setSpatialActive(isSpatialAudioEnabled);
    }
  }, [isSpatialAudioEnabled, isLocal]);

  const [isMixerOpen, setIsMixerOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const synestheticStyle = useSynestheticVisualizer(stream, isSynestheticVisualizerEnabled);
  const { currentLayer } = useIntersectionSimulcastSubscription(
    effectiveUser?.id,
    isLocal,
    containerRef,
  );
  const visualizerRef = useRef<HTMLDivElement | null>(null);
  useDirectAudioVisualizer(visualizerRef, stream ?? null, isMuted);

  const onRegisterMediaElementRef = useRef(onRegisterMediaElement);
  onRegisterMediaElementRef.current = onRegisterMediaElement;
  const onRegisterTileRef = useRef(onRegisterTile);
  onRegisterTileRef.current = onRegisterTile;
  const onUnregisterTileRef = useRef(onUnregisterTile);
  onUnregisterTileRef.current = onUnregisterTile;

  useEffect(() => {
    const speakerKey = effectiveUser?.id || 'remote';
    if (!isLocal && stream && stream.getAudioTracks().length > 0) {
      const channel = globalSpeakerMixerManager.attachSpeaker(speakerKey, stream);
      channel.setMasterVolume(outputVolume / 100);
      channel.setDeafened(isLocalDeafened);
      channel.setSpatialActive(isSpatialAudioEnabled);
      if (selectedAudioOutput) {
        channel.setSinkId(selectedAudioOutput);
      }
      return () => {
        globalSpeakerMixerManager.detachSpeaker(speakerKey);
      };
    }
  }, [
    isLocal,
    effectiveUser?.id,
    stream,
    outputVolume,
    isLocalDeafened,
    isSpatialAudioEnabled,
    selectedAudioOutput,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.muted = true;
      video.volume = 0;
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      onRegisterMediaElementRef.current?.(video);
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err: unknown) => {
          if (err instanceof Error && err.name === 'NotAllowedError') {
            useCallStore.getState().setIsAutoplayBlocked(true);
          }
        });
      }
    }
  }, [stream]);

  const [, setTrackStateTick] = useState(0);
  useEffect(() => {
    if (!stream) return;
    const handleTrackChange = () => {
      setTrackStateTick((tick) => tick + 1);
      const video = videoRef.current;
      if (video && stream) {
        video.muted = true;
        video.volume = 0;
        if (video.srcObject !== stream) {
          video.srcObject = stream;
        }
        void video.play().catch(() => {});
      }
    };
    stream.addEventListener('addtrack', handleTrackChange);
    stream.addEventListener('removetrack', handleTrackChange);
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.addEventListener('unmute', handleTrackChange);
      track.addEventListener('mute', handleTrackChange);
      track.addEventListener('ended', handleTrackChange);
    });
    return () => {
      stream.removeEventListener('addtrack', handleTrackChange);
      stream.removeEventListener('removetrack', handleTrackChange);
      videoTracks.forEach((track) => {
        track.removeEventListener('unmute', handleTrackChange);
        track.removeEventListener('mute', handleTrackChange);
        track.removeEventListener('ended', handleTrackChange);
      });
    };
  }, [stream]);

  // Ensure video element immediately receives stream for hardware decoding
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.muted = true;
      video.volume = 0;
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      void video.play().catch(() => {});
    }
  }, [stream]);

  const hasActiveVideoTrack = Boolean(
    stream &&
    stream.getVideoTracks().length > 0 &&
    stream.getVideoTracks().some((t) => t.enabled && t.readyState !== 'ended') &&
    !isVideoOff,
  );

  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(!isVideoOff && hasActiveVideoTrack);

  const handleVideoFrameReady = useCallback(() => {
    setIsVideoLoading(false);
  }, []);

  useEffect(() => {
    if (isVideoOff || !hasActiveVideoTrack) {
      setIsVideoLoading(false);
      return;
    }
    const video = videoRef.current;
    if (video && (video.readyState >= 2 || video.videoWidth > 0)) {
      setIsVideoLoading(false);
    } else {
      setIsVideoLoading(true);
      const timer = setTimeout(() => {
        setIsVideoLoading(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isVideoOff, hasActiveVideoTrack, stream]);

  // Safeguard: check when video is loading so it never hangs indefinitely
  useEffect(() => {
    if (isVideoOff || !isVideoLoading || !hasActiveVideoTrack) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && (video.videoWidth > 0 || video.readyState >= 2 || video.currentTime > 0)) {
        setIsVideoLoading(false);
      }
    }, 100);
    const timer = setTimeout(() => {
      setIsVideoLoading(false);
    }, 400);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isVideoOff, isVideoLoading, hasActiveVideoTrack]);

  useEffect(() => {
    if (hasActiveVideoTrack && videoRef.current && stream) {
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      void videoRef.current.play().catch(() => {});
    }
  }, [hasActiveVideoTrack, stream]);

  // WebGPU Super-Resolution Frame Processing Loop (only if active video track)
  useEffect(() => {
    if (isLocal || webGpuSuperResMode === 'off' || !hasActiveVideoTrack) return;

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
  }, [isLocal, webGpuSuperResMode, hasActiveVideoTrack]);

  // Register container for Adaptive Peer Mesh viewport optimization
  useEffect(() => {
    if (effectiveUser?.id && containerRef.current && onRegisterTileRef.current) {
      onRegisterTileRef.current(effectiveUser.id, containerRef.current);
    }
    return () => {
      if (effectiveUser?.id && onUnregisterTileRef.current) {
        onUnregisterTileRef.current(effectiveUser.id);
      }
    };
  }, [effectiveUser?.id]);

  const activeSpeaking = (!isMuted && isSpeaking) || Boolean(activeSoundboardEvent);

  return (
    <div
      ref={containerRef}
      data-simulcast-layer={currentLayer}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
      }}
      style={{
        backgroundColor: isVideoOff ? tileTheme.backgroundColor : undefined,
        transition: 'background-color 0.4s ease-out',
        ...(isSynestheticVisualizerEnabled && synestheticStyle.isSpeaking
          ? {
              borderColor: synestheticStyle.borderColor,
              boxShadow: synestheticStyle.boxShadow,
              borderWidth: synestheticStyle.borderWidth,
            }
          : {}),
      }}
      className={`group relative overflow-hidden rounded-2xl bg-zinc-900/90 flex items-center justify-center shadow-2xl transition-all duration-200 select-none ${
        activeSpeaking
          ? 'border-2 border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.35)]'
          : 'border border-white/5'
      } ${className}`}
    >
      {/* Video Feed */}
      {stream && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={true}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                videoRef.current.muted = true;
                videoRef.current.volume = 0;
              }
              videoRef.current?.play().catch(() => {});
              handleVideoFrameReady();
            }}
            onLoadedData={() => {
              if (videoRef.current) {
                videoRef.current.muted = true;
                videoRef.current.volume = 0;
              }
              handleVideoFrameReady();
            }}
            onCanPlay={() => {
              if (videoRef.current) {
                videoRef.current.muted = true;
                videoRef.current.volume = 0;
              }
              videoRef.current?.play().catch(() => {});
              handleVideoFrameReady();
            }}
            onPlaying={() => {
              if (videoRef.current) {
                videoRef.current.muted = true;
                videoRef.current.volume = 0;
              }
              handleVideoFrameReady();
            }}
            onTimeUpdate={() => {
              handleVideoFrameReady();
            }}
            onWaiting={() => {
              if (!isLocal) {
                setIsVideoLoading(true);
              }
            }}
            className={`w-full h-full transition-opacity duration-300 ${
              isScreenShare ? 'object-contain bg-black' : 'object-cover'
            } ${
              hasActiveVideoTrack && !isLocal && webGpuSuperResMode !== 'off'
                ? 'opacity-0 absolute pointer-events-none'
                : hasActiveVideoTrack
                  ? 'opacity-100'
                  : 'opacity-0 absolute'
            } ${isLocal && !isScreenShare && isMirrorVideo ? 'scale-x-[-1]' : ''}`}
          />
          {!isLocal && webGpuSuperResMode !== 'off' && (
            <canvas
              ref={canvasRef}
              className={`w-full h-full ${
                isScreenShare ? 'object-contain bg-black' : 'object-cover'
              } transition-opacity duration-300 ${
                hasActiveVideoTrack ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
              }`}
            />
          )}
        </>
      )}

      {/* Top Badges (Screen Share Live 60FPS / WebGPU Super-Res / Peer Relay / ZKP) */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-20 pointer-events-none">
        {isScreenShare && hasActiveVideoTrack && (
          <div className="flex items-center gap-1.5 bg-rose-600/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-rose-400/40 text-[10px] font-bold text-white shadow-lg tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>LIVE • 60 FPS</span>
          </div>
        )}

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

        {!isLocal && zkpProof && (
          <div className="flex items-center gap-1 bg-emerald-500/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-emerald-400/30 text-[10px] font-semibold text-emerald-300 shadow-md">
            <ShieldCheck size={11} className="text-emerald-300" />
            <span>ZK-Verified</span>
          </div>
        )}
      </div>

      {/* Floating Soundboard Playback Reaction Badge */}
      {activeSoundboardEvent && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111214]/90 backdrop-blur-xl border border-amber-400/40 shadow-[0_8px_30px_rgba(245,158,11,0.35)] text-white">
            <TelegramAppleEmoji
              emoji={activeSoundboardEvent.emoji}
              size={22}
              playAnimation={true}
              isAnimating={true}
            />
            <span className="text-xs font-bold text-amber-300 truncate max-w-[130px]">
              {activeSoundboardEvent.name}
            </span>
            <div className="flex items-end gap-0.5 h-3 pb-0.5">
              <span className="w-0.5 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="w-0.5 h-3 bg-amber-300 rounded-full animate-pulse delay-75" />
              <span className="w-0.5 h-1.5 bg-amber-400 rounded-full animate-pulse delay-150" />
            </div>
          </div>
        </div>
      )}

      {/* Video Loader (Tumbling dual purple cubes when camera is toggled on and connecting) */}
      {!isVideoOff && hasActiveVideoTrack && isVideoLoading && (
        <VideoLoader
          userName={effectiveUser?.displayName || effectiveUser?.username || 'Participant'}
          isMuted={isMuted}
        />
      )}

      {/* Audio-only / Video-off Fallback with Clean Avatar Layout */}
      {isVideoOff && (
        <div className="flex flex-col items-center justify-center select-none gap-4 p-6">
          <div
            ref={visualizerRef}
            style={{
              boxShadow:
                '0 0 var(--volume-glow, 0px) rgba(52, 211, 153, calc(var(--volume, 0) * 0.9))',
              transform: 'scale(var(--speech-scale, 1))',
            }}
            className="relative flex items-center justify-center rounded-full will-change-transform"
          >
            {/* Speaking Wave: Only when actually speaking and NOT muted */}
            {activeSpeaking && (
              <div className="absolute w-32 h-32 rounded-full bg-emerald-500/20 animate-ping opacity-60 pointer-events-none" />
            )}

            <div className="relative">
              <Avatar
                src={effectiveUser?.avatar || null}
                size="xl"
                suppressDecoration={true}
                className={`relative z-10 transition-all ${
                  activeSpeaking
                    ? 'ring-4 ring-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.7)]'
                    : 'ring-4 ring-black/20 shadow-xl'
                }`}
              />
            </div>
          </div>
          <div className="text-center">
            <p
              className={`font-bold tracking-wide text-base sm:text-lg transition-colors duration-300 ${
                tileTheme.isLight
                  ? 'text-zinc-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]'
                  : 'text-white drop-shadow-sm'
              }`}
            >
              {effectiveUser?.displayName || effectiveUser?.username || 'User'}
            </p>
          </div>
        </div>
      )}

      {/* Bottom Metadata Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none gap-2 min-w-0">
        <div
          className={`flex items-center min-w-0 max-w-[calc(100%-84px)] sm:max-w-[calc(100%-116px)] bg-[#111214]/85 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 text-xs font-medium text-white shadow-xl transition-all duration-300 pointer-events-auto ${
            !isVideoOff && !isVideoLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {/* Status & Username */}
          <div className="flex items-center gap-1.5 shrink-0 min-w-0">
            {isScreenShare && <Monitor size={12} className="text-blue-400 shrink-0" />}
            <span className="truncate max-w-[76px] sm:max-w-[110px] font-semibold text-zinc-100">
              {effectiveUser?.username
                ? `@${effectiveUser.username}`
                : effectiveUser?.displayName || 'User'}
            </span>
          </div>

          {/* Smooth horizontal expansion for Gaming / Music Activity on Hover */}
          {activityInfo && (
            <div className="flex items-center overflow-hidden whitespace-nowrap transition-all duration-300 ease-out max-w-0 opacity-0 group-hover:max-w-[130px] sm:group-hover:max-w-[160px] group-hover:opacity-100 group-hover:ml-2 min-w-0 shrink">
              <span className="w-px h-3 bg-white/20 mr-1.5 shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0">
                {activityInfo.icon}
                <span
                  className="truncate max-w-[80px] sm:max-w-[115px] text-zinc-300 text-[11px] font-medium"
                  title={activityInfo.tooltip}
                >
                  {activityInfo.label}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto z-10 ml-auto">
          {!isLocal && effectiveUser?.id && (
            <button
              type="button"
              data-speaker-mixer-trigger="true"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setIsMixerOpen((prev) => !prev);
              }}
              title="Speaker Audio Mixer (Volume, Pan)"
              className={`p-1.5 rounded-full backdrop-blur-md border transition-all duration-200 shrink-0 ${
                isMixerOpen
                  ? 'opacity-100 bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'opacity-0 group-hover:opacity-100 bg-black/60 text-zinc-300 hover:text-white hover:bg-black/80 border-white/10'
              }`}
            >
              <SlidersHorizontal size={13} />
            </button>
          )}

          {/* Quick Context Menu Button (...) */}
          {effectiveUser && (
            <button
              type="button"
              data-testid="participant-context-trigger"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setContextMenuPos({ x: rect.left, y: rect.bottom + 6 });
              }}
              title="User options"
              className="p-1.5 rounded-full backdrop-blur-md border transition-all duration-200 opacity-0 group-hover:opacity-100 bg-black/60 text-zinc-300 hover:text-white hover:bg-black/80 border-white/10 shrink-0"
            >
              <MoreHorizontal size={13} />
            </button>
          )}

          {(() => {
            const isUserDeafened = isLocal ? isLocalDeafened : Boolean(isDeafened);
            const showMuteBadge = isUserDeafened || isMuted;
            if (!showMuteBadge) return null;

            return (
              <div
                data-testid="participant-muted-badge"
                title={
                  isUserDeafened
                    ? isLocal
                      ? 'Audio deafened (headphones)'
                      : `${effectiveUser?.displayName || 'User'} is deafened`
                    : isLocal
                      ? 'Microphone muted'
                      : `${effectiveUser?.displayName || 'User'} muted microphone`
                }
                aria-label={
                  isUserDeafened
                    ? isLocal
                      ? 'Sound deafened'
                      : `${effectiveUser?.displayName || 'User'} sound deafened`
                    : isLocal
                      ? 'Microphone muted'
                      : `${effectiveUser?.displayName || 'User'} is muted`
                }
                className="flex items-center justify-center w-7 h-7 bg-rose-500/90 text-white rounded-full shadow-lg border border-white/20 shrink-0"
              >
                {isUserDeafened ? (
                  <HeadphoneOffIcon size={14} className="text-white" />
                ) : (
                  <MicOff size={14} className="text-white" />
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {!isLocal && effectiveUser?.id && (
        <SpeakerMixerPopover
          userId={effectiveUser.id}
          userName={effectiveUser?.displayName || effectiveUser?.username || 'Participant'}
          isOpen={isMixerOpen}
          onClose={() => setIsMixerOpen(false)}
        />
      )}

      {effectiveUser && contextMenuPos && (
        <ParticipantContextMenu
          user={effectiveUser as UserSnapshot}
          isLocal={isLocal}
          coords={contextMenuPos}
          onClose={() => setContextMenuPos(null)}
          onOpenPreview={() => setIsPreviewModalOpen(true)}
        />
      )}

      {isLocal && (
        <CameraPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
        />
      )}
    </div>
  );
}
