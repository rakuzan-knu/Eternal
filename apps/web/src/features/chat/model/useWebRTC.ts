import { useCallback, useEffect, useRef } from 'react';
import { useCallStore } from './callStore';
import { apiClient } from '@/shared/api/httpClient';
import type { IceServersResponse } from '@common/contracts';
import { rnnoiseManager, type DenoisedStreamHandle } from '../lib/rnnoise/rnnoiseManager';
import { attachSenderEncryption, isInsertableStreamsSupported } from '../lib/e2ee/frameCrypto';
import {
  deriveCallSessionKey,
  exportEphemeralPublicKey,
  generateEphemeralKeypair,
  signEphemeralBinding,
  verifyEphemeralBinding,
} from '../lib/e2ee/callKeyExchange';
import {
  ensureIdentityKeypair,
  ensureIdentityRegistered,
  fetchPeerIdentityKeyCached,
  fingerprintIdentityKey,
  getPinnedFingerprint,
  importIdentityPublicKey,
  pinIdentityKey,
} from '../lib/e2ee/identityKeys';
import {
  attachSenderScriptTransform,
  attachReceiverScriptTransform,
  isScriptTransformSupported,
  terminateScriptTransformWorker,
} from '../lib/webrtc/rtpScriptTransform';
import {
  configureSenderSVC,
  switchSVCScalabilityMode,
  setSVCLayerActive,
  type SVCOptions,
  type SVCScalabilityMode,
} from '../lib/webrtc/scalableVideoCoding';
import { globalCallExternalStore } from '../lib/webrtc/callExternalStore';
import { BandwidthAdapter } from '../lib/webrtc/bandwidthAdapter';
import { AudioMixer } from '../lib/webrtc/audioMixer';
import { VADEngine } from '../lib/webrtc/vadEngine';
import { VirtualBackgroundManager } from '../lib/webrtc/virtualBackground';
import { TelemetryCollector } from '../lib/webrtc/telemetryCollector';
import { SpatialAudioManager } from '../lib/webrtc/spatialAudio';
import { P2PFileManager } from '../lib/webrtc/p2pFileTransfer';
import { VoiceFXProcessor } from '../lib/webrtc/voiceFX';
import { AdaptiveMeshController } from '../lib/webrtc/adaptiveMesh';
import {
  playReconnectingChime,
  stopReconnectingChime,
  playReconnectedSuccessSound,
} from '../lib/callRingtone';
import { mungeSDP } from '../lib/webrtc/sdpMunger';
import { GossipRelayManager } from '../lib/webrtc/gossipRelay';
import { SyncPlayEngine } from '../lib/webrtc/syncPlayEngine';
import { LiveStatsCollector } from '../lib/webrtc/statsCollector';
import { WhiteboardCRDTEngine } from '../lib/webrtc/whiteboardCRDT';
import { WebCodecsStreamManager, WebGPUSuperResEngine } from '../lib/webrtc/customVideoPipeline';
import { P2PTurnRelayManager } from '../lib/webrtc/p2pTurnRelay';
import { HeadTracker } from '../lib/webrtc/headTracker';
import { WebTransportSignalingClient } from '../lib/webrtc/webTransportSignaling';
import { MobileEdgeCaseHandler } from '../lib/webrtc/mobileEdgeCaseHandler';
import { ChaosEngine } from '../lib/webrtc/chaosEngine';
import { CallAlarming } from '../lib/webrtc/callAlarming';
import { ReactionParticleEngine } from '../lib/webrtc/reactionParticleEngine';
import { BinaryDataChannelMux, MULTIPLEXED_STREAM_IDS } from '../lib/webrtc/binaryDataChannelMux';
import { PerfectNegotiationFSM } from '../lib/webrtc/perfectNegotiationFSM';
import { LocalAudioPipeline } from '../lib/webrtc/localAudioPipeline';
import { globalSpeakerMixerManager } from '../lib/webrtc/perSpeakerMixer';
import { globalSoundboardEngine } from '../lib/webrtc/soundboardEngine';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { useSoundboardStore } from './soundboardStore';
import { getSocket } from '@/shared/api/socket';

const DEFAULT_STUN = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export interface WebRTCOptions {
  onSendIceRestart?: (offer: RTCSessionDescriptionInit) => void;
  onConnectionFailed?: () => void;
  onScreenShareStopped?: () => void;
}

export function useWebRTC(options: WebRTCOptions = {}) {
  const { onSendIceRestart, onConnectionFailed, onScreenShareStopped } = options;
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const queuedCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const bandwidthAdapterRef = useRef<BandwidthAdapter | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const originalAudioTrackRef = useRef<MediaStreamTrack | null>(null);
  const audioMixerRef = useRef<AudioMixer | null>(null);
  const vadEngineRef = useRef<VADEngine | null>(null);
  const remoteVadEngineRef = useRef<VADEngine | null>(null);
  const vbManagerRef = useRef<VirtualBackgroundManager | null>(null);
  const telemetryCollectorRef = useRef<TelemetryCollector | null>(null);
  const denoisedHandleRef = useRef<DenoisedStreamHandle | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const iceRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cryptoKeyRef = useRef<CryptoKey | null>(null);
  const e2eeEphemeralRef = useRef<CryptoKeyPair | null>(null);
  const spatialAudioRef = useRef<SpatialAudioManager | null>(null);
  const p2pFileManagerRef = useRef<P2PFileManager | null>(null);
  const voiceFXProcessorRef = useRef<VoiceFXProcessor | null>(null);
  const adaptiveMeshRef = useRef<AdaptiveMeshController | null>(null);
  const reconnectCountdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gossipRelayRef = useRef<GossipRelayManager | null>(null);
  const syncPlayEngineRef = useRef<SyncPlayEngine | null>(null);
  const liveStatsCollectorRef = useRef<LiveStatsCollector | null>(null);
  const transformedSendersRef = useRef<WeakSet<RTCRtpSender>>(new WeakSet());
  const transformedReceiversRef = useRef<WeakSet<RTCRtpReceiver>>(new WeakSet());
  const ensureReceiverTracksRef = useRef<((userId?: string) => void) | null>(null);
  const currentAuthUserId = useAuthStore((s) => s.userId);
  const whiteboardEngineRef = useRef<WhiteboardCRDTEngine | null>(null);
  if (!whiteboardEngineRef.current) {
    whiteboardEngineRef.current = new WhiteboardCRDTEngine({
      userId: currentAuthUserId || undefined,
      userName: currentAuthUserId ? `User ${currentAuthUserId.slice(0, 4)}` : 'You',
    });
  }

  useEffect(() => {
    if (whiteboardEngineRef.current && currentAuthUserId) {
      whiteboardEngineRef.current.updateUser(
        currentAuthUserId,
        `User ${currentAuthUserId.slice(0, 4)}`,
      );
    }
  }, [currentAuthUserId]);
  const superResEngineRef = useRef<WebGPUSuperResEngine | null>(null);
  if (!superResEngineRef.current) {
    superResEngineRef.current = new WebGPUSuperResEngine();
  }
  const webCodecsManagerRef = useRef<WebCodecsStreamManager | null>(null);
  if (!webCodecsManagerRef.current) {
    webCodecsManagerRef.current = new WebCodecsStreamManager(superResEngineRef.current);
  }
  const peerRelayManagerRef = useRef<P2PTurnRelayManager | null>(null);
  if (!peerRelayManagerRef.current) {
    peerRelayManagerRef.current = new P2PTurnRelayManager();
  }
  const headTrackerRef = useRef<HeadTracker | null>(null);
  const webTransportClientRef = useRef<WebTransportSignalingClient | null>(null);
  const mobileHandlerRef = useRef<MobileEdgeCaseHandler | null>(null);
  const chaosEngineRef = useRef<ChaosEngine | null>(null);
  if (!chaosEngineRef.current) {
    chaosEngineRef.current = new ChaosEngine();
  }
  const reactionEngineRef = useRef<ReactionParticleEngine | null>(null);
  if (!reactionEngineRef.current) {
    reactionEngineRef.current = new ReactionParticleEngine();
  }
  const reactionChannelRef = useRef<RTCDataChannel | null>(null);
  const binaryMuxRef = useRef<BinaryDataChannelMux>(new BinaryDataChannelMux());
  const perfectNegotiationRef = useRef<PerfectNegotiationFSM | null>(null);
  const callAudioPipelineRef = useRef<LocalAudioPipeline | null>(null);

  const soundboardPendingTransfersRef = useRef<
    Map<
      string,
      {
        meta: {
          soundId: string;
          name: string;
          emoji: string;
          volume: number;
          durationMs: number;
          senderUserId: string;
        };
        chunks: string[];
        received: number;
        totalChunks: number;
      }
    >
  >(new Map());

  const lastHandledSoundboardRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });

  const handleSoundboardIncomingMessage = useCallback((data: any) => {
    if (!data || typeof data !== 'object') return;

    const currentUserId = useAuthStore.getState().userId || 'me';
    const senderId = data.senderUserId || 'remote';

    // 1. NEVER process own messages (prevents loopback/self-echo)
    if (
      senderId === currentUserId ||
      (currentUserId !== 'remote' && currentUserId !== 'me' && senderId === currentUserId)
    ) {
      return;
    }

    // 2. Deduplicate messages arriving via multiple channels (binaryMux + reactionChannel)
    const eventKey = `${data.soundId || ''}_${senderId}_${data.timestamp || ''}`;
    const now = Date.now();
    if (
      eventKey &&
      lastHandledSoundboardRef.current.key === eventKey &&
      now - lastHandledSoundboardRef.current.time < 1500
    ) {
      return;
    }
    lastHandledSoundboardRef.current = { key: eventKey, time: now };

    // 3. Check if recipient has muted soundboards from this specific sender
    const remoteUserId = useCallStore.getState().remoteParticipant?.id;
    const isSenderSoundboardMuted =
      globalSpeakerMixerManager.isSoundboardMuted(senderId) ||
      (senderId !== 'remote' && globalSpeakerMixerManager.isSoundboardMuted('remote')) ||
      (Boolean(remoteUserId) && globalSpeakerMixerManager.isSoundboardMuted(remoteUserId!));

    if (isSenderSoundboardMuted) {
      // User has checked "Заглушить звуковую панель" for this sender!
      // COMPLETELY SILENT! Do not play audio, do not show badge.
      return;
    }

    // 4. Check global soundboard mute and deafened status
    const isGlobalMuted = useSoundboardStore.getState().isSoundboardMuted;
    const isDeafened = useCallStore.getState().isDeafened;

    // 5. Play sound locally for the recipient strictly into local speakers (isolated playback)
    if (!isGlobalMuted && !isDeafened && data.soundId) {
      const peerProfile = globalSpeakerMixerManager.getProfile(senderId);
      const peerVol = peerProfile.volume ?? 1.0;
      const globalSbVol = useSoundboardStore.getState().soundboardVolume ?? 1.0;
      const effectiveVol = (data.volume ?? 1.0) * globalSbVol * peerVol;

      // isPreview = true guarantees it outputs ONLY to local speakers and is NEVER injected into mic track
      globalSoundboardEngine.play(data.soundId, data.audioData, effectiveVol, true);
    }

    // 6. Trigger floating Discord-style emoji badge and speaking ring on sender's tile
    if (
      (data.type === 'SOUNDBOARD_BADGE' ||
        data.type === 'SOUNDBOARD_PLAY' ||
        data.type === 'SOUNDBOARD_AUDIO_START') &&
      data.soundId
    ) {
      useCallStore.getState().triggerSoundboardEvent({
        soundId: data.soundId,
        name: data.name || data.soundId,
        emoji: data.emoji || '🔊',
        senderUserId: senderId,
      });
      if (senderId !== 'remote') {
        useCallStore.getState().triggerSoundboardEvent({
          soundId: data.soundId,
          name: data.name || data.soundId,
          emoji: data.emoji || '🔊',
          senderUserId: 'remote',
        });
      }

      useCallStore.getState().setRemoteIsSpeaking(true);
      setTimeout(
        () => {
          useCallStore.getState().setRemoteIsSpeaking(false);
        },
        Math.max(1500, data.durationMs || 2000),
      );
    }
  }, []);

  // Listen to socket-relayed soundboard events
  useEffect(() => {
    const socket = getSocket();
    const handleSocketSoundboard = (data: any) => {
      handleSoundboardIncomingMessage(data);
    };
    socket.on('soundboard:play', handleSocketSoundboard);
    return () => {
      socket.off('soundboard:play', handleSocketSoundboard);
    };
  }, [handleSoundboardIncomingMessage]);

  const setupMuxChannels = useCallback(
    (mux: BinaryDataChannelMux) => {
      const reactionStream = mux.getStream(MULTIPLEXED_STREAM_IDS.REACTION_EMOTES);
      reactionStream.onmessage = (event) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : null;
          if (data && data.type === 'EMOTE_REACTION' && data.emoji) {
            reactionEngineRef.current?.spawn(
              data.emoji,
              typeof window !== 'undefined' ? window.innerWidth : 800,
              typeof window !== 'undefined' ? window.innerHeight : 600,
              data.x,
            );
          }
        } catch {
          // Ignore
        }
      };

      const controlPttStream = mux.getStream(MULTIPLEXED_STREAM_IDS.CONTROL_PTT);
      controlPttStream.onmessage = (event) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : null;
          if (data && data.type === 'SPEAKING_STATE') {
            useCallStore.getState().setRemoteIsSpeaking(Boolean(data.isSpeaking));
          }
        } catch {
          // Ignore
        }
      };

      const soundboardStream = mux.getStream(MULTIPLEXED_STREAM_IDS.SOUNDBOARD);
      soundboardStream.onmessage = (event) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : null;
          handleSoundboardIncomingMessage(data);
        } catch {
          // Ignore
        }
      };

      const activityStream = mux.getStream(MULTIPLEXED_STREAM_IDS.ACTIVITY);
      activityStream.onmessage = (event) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : null;
          if (data && data.type === 'CALL_ACTIVITY') {
            const senderId = data.senderUserId || 'remote';
            const normalized = data.activity
              ? {
                  ...data.activity,
                  type:
                    data.activity.type === 'music' || data.activity.trackId
                      ? 'spotify'
                      : data.activity.type,
                }
              : null;
            useCallStore.getState().setParticipantActivity(senderId, normalized);
            if (senderId !== 'remote' && senderId !== 'me' && normalized) {
              usePresenceStore.getState().setUserActivity(senderId, normalized);
            }
          }
        } catch {
          // Ignore
        }
      };
    },
    [handleSoundboardIncomingMessage],
  );

  const {
    localStream,
    setLocalStream,
    setRemoteStream,
    remoteStreams,
    screenShareStream,
    setScreenShareStream,
    setIsScreenSharing,
    setConnectionQuality,
    selectedAudioInput,
    selectedAudioOutput,
    selectedVideoInput,
    inputVolume,
    isPTTEnabled,
    isPTTActive,
    pttReleaseTailMs,
    isMuted,
    isNoiseSuppressionEnabled,
    setE2EEInfo,
    setNetworkStats,
    callId,
    virtualBackground,
    isVADEnabled,
    noiseGateThreshold,
    setLocalIsSpeaking,
    setRemoteIsSpeaking,
    setCurrentAudioLevel,
    isScreenSharing,
    localIsSpeaking,
    remoteIsSpeaking,
    isScreenAudioSharing,
    setIsScreenAudioSharing,
    isSpatialAudioEnabled,
    isSidechainDuckingEnabled,
    voiceFX,
    setIsReconnecting,
    setReconnectCountdown,
    setReconnectRestored,
    upsertFileTransfer,
    setLiveStats,
    setSyncPlayMetrics,
    setIsPeerRelayActive,
    isHeadTrackingEnabled,
    setHeadAngles,
    setTransportProtocol,
    setQuicStats,
    setIsAutoplayBlocked,
    chaosConfig,
    setAvailableDevices,
    isSatelliteModeEnabled,
    isTravelerModeEnabled,
  } = useCallStore();

  const fetchIceServers = useCallback(async (): Promise<RTCIceServer[]> => {
    try {
      const res = await apiClient.get<IceServersResponse>('/calls/ice-servers');
      if (res.data?.iceServers && res.data.iceServers.length > 0) {
        return res.data.iceServers.map(
          (s: { urls: string | string[]; username?: string; credential?: string }) => ({
            urls: s.urls,
            username: s.username,
            credential: s.credential,
          }),
        );
      }
    } catch {
      // fallback to default STUN
    }
    return DEFAULT_STUN;
  }, []);

  // 1. Dynamic Real-Time Microphone Input Volume (0-200%)
  useEffect(() => {
    callAudioPipelineRef.current?.setInputVolume(inputVolume);

    const isAudioEffectivelyMuted = isMuted || inputVolume === 0;
    const shouldBeEnabled = isPTTEnabled ? isPTTActive : !isAudioEffectivelyMuted;

    const storeStream = useCallStore.getState().localStream;
    storeStream?.getAudioTracks().forEach((track) => {
      track.enabled = shouldBeEnabled;
    });

    rawStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = shouldBeEnabled;
    });

    const procTrack = callAudioPipelineRef.current?.getProcessedTrack();
    if (procTrack) {
      procTrack.enabled = shouldBeEnabled;
    }

    const pc = pcRef.current;
    if (pc) {
      pc.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = shouldBeEnabled;
        }
      });
    }

    if (inputVolume === 0) {
      setLocalIsSpeaking(false);
      callAudioPipelineRef.current?.setGateOpen(false, 0);
    }
  }, [inputVolume, isMuted, isPTTEnabled, isPTTActive, setLocalIsSpeaking]);

  // 2. Real-Time Push-to-Talk (PTT) Gate & Track Enablement
  useEffect(() => {
    callAudioPipelineRef.current?.setPTTMode(isPTTEnabled, isPTTActive, pttReleaseTailMs);
    const storeStream = useCallStore.getState().localStream;
    const isAudioEffectivelyMuted = useCallStore.getState().isMuted || inputVolume === 0;
    const shouldBeEnabled = isPTTEnabled ? isPTTActive : !isAudioEffectivelyMuted;
    storeStream?.getAudioTracks().forEach((track) => {
      track.enabled = shouldBeEnabled;
    });

    const pc = pcRef.current;
    if (pc) {
      pc.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === 'audio') {
          sender.track.enabled = shouldBeEnabled;
        }
      });
    }
  }, [isPTTEnabled, isPTTActive, pttReleaseTailMs, inputVolume]);

  // 3. Dynamic Voice Activity Detection & Noise Gate Threshold
  useEffect(() => {
    callAudioPipelineRef.current?.setVAD(isVADEnabled, noiseGateThreshold, (speaking) => {
      if (inputVolume === 0 || isMuted) {
        setLocalIsSpeaking(false);
      } else {
        setLocalIsSpeaking(speaking);
      }
    });
  }, [isVADEnabled, noiseGateThreshold, setLocalIsSpeaking, inputVolume, isMuted]);

  // 4. Dynamic Noise Suppression Filter
  useEffect(() => {
    callAudioPipelineRef.current?.setDenoiseEnabled(isNoiseSuppressionEnabled);
    denoisedHandleRef.current?.setDenoiseEnabled(isNoiseSuppressionEnabled);
  }, [isNoiseSuppressionEnabled]);

  // 5. Dynamic Voice FX (Robot / Radio / Deep / Cosmic / None)
  useEffect(() => {
    callAudioPipelineRef.current?.setVoiceFX(voiceFX);
    const pc = pcRef.current;
    if (pc && rawStreamRef.current) {
      const rawAudioTrack = rawStreamRef.current.getAudioTracks()[0];
      const processedTrack = callAudioPipelineRef.current?.getProcessedTrack();
      const targetTrack = processedTrack || rawAudioTrack;
      if (targetTrack) {
        const transceivers = typeof pc.getTransceivers === 'function' ? pc.getTransceivers() : [];
        const matchingTransceiver = transceivers.find(
          (t) => t.sender.track?.kind === 'audio' || t.receiver.track.kind === 'audio',
        );
        const isAudioEffectivelyMuted =
          useCallStore.getState().isMuted || useCallStore.getState().inputVolume === 0;
        const shouldEnableAudio = useCallStore.getState().isPTTEnabled
          ? useCallStore.getState().isPTTActive
          : !isAudioEffectivelyMuted;
        targetTrack.enabled = shouldEnableAudio;
        if (matchingTransceiver && matchingTransceiver.sender.track?.id !== targetTrack.id) {
          void matchingTransceiver.sender.replaceTrack(targetTrack);
        } else {
          const audioSender = pc.getSenders().find((s) => s.track?.kind === 'audio');
          if (audioSender && audioSender.track?.id !== targetTrack.id) {
            void audioSender.replaceTrack(targetTrack);
          }
        }
      }
    }
  }, [voiceFX]);

  // Voice Activity Detection & Noise Gate for local microphone
  useEffect(() => {
    if (localStream && localStream.getAudioTracks().length > 0) {
      vadEngineRef.current?.destroy();
      vadEngineRef.current = new VADEngine(localStream, {
        thresholdDb: noiseGateThreshold,
        enabled: isVADEnabled && inputVolume > 0 && !isMuted,
        onSpeakingChange: (speaking) => {
          if (inputVolume === 0 || isMuted) {
            setLocalIsSpeaking(false);
          } else {
            setLocalIsSpeaking(speaking);
          }
        },
        onVolumeChange: (_db, percent) => {
          if (useCallStore.getState().isSettingsOpen) {
            setCurrentAudioLevel(
              inputVolume === 0 || isMuted ? 0 : Math.round(percent * (inputVolume / 100)),
            );
          }
        },
      });
    }
    return () => {
      vadEngineRef.current?.destroy();
      vadEngineRef.current = null;
    };
  }, [
    localStream,
    isVADEnabled,
    noiseGateThreshold,
    setLocalIsSpeaking,
    setCurrentAudioLevel,
    inputVolume,
    isMuted,
  ]);

  // Broadcast speaking state directly to peer via WebRTC DataChannel (0ms latency Tier-1)
  useEffect(() => {
    try {
      const pttStream = binaryMuxRef.current?.getStream(MULTIPLEXED_STREAM_IDS.CONTROL_PTT);
      if (pttStream && pttStream.readyState === 'open') {
        pttStream.send(
          JSON.stringify({
            type: 'SPEAKING_STATE',
            isSpeaking: localIsSpeaking,
          }),
        );
      }
    } catch {
      // Ignore transient DC state error
    }
  }, [localIsSpeaking]);

  // VAD listener for incoming remote audio
  useEffect(() => {
    const remoteList = Object.values(remoteStreams);
    const audioStream =
      remoteList.find(
        (s) =>
          s &&
          s.getAudioTracks().length > 0 &&
          s.getAudioTracks().some((t) => t.readyState === 'live'),
      ) || remoteList.find((s) => s && s.getAudioTracks().length > 0);

    if (audioStream) {
      remoteVadEngineRef.current?.destroy();
      remoteVadEngineRef.current = new VADEngine(audioStream, {
        thresholdDb: -45,
        enabled: true,
        onSpeakingChange: (speaking) => {
          setRemoteIsSpeaking(speaking);
        },
      });
    }
    return () => {
      remoteVadEngineRef.current?.destroy();
      remoteVadEngineRef.current = null;
    };
  }, [remoteStreams, setRemoteIsSpeaking]);

  // Virtual Background controller
  useEffect(() => {
    if (localStream && localStream.getVideoTracks().length > 0) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (!vbManagerRef.current) {
        vbManagerRef.current = new VirtualBackgroundManager(videoTrack);
      }
      vbManagerRef.current.setMode(virtualBackground);

      const pc = pcRef.current;
      if (pc && !isScreenSharing) {
        const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          const targetTrack = vbManagerRef.current.getProcessedTrack();
          void videoSender.replaceTrack(targetTrack);
        }
      }
    }
  }, [localStream, virtualBackground, isScreenSharing]);

  // Spatial Audio Manager instance
  useEffect(() => {
    if (!spatialAudioRef.current) {
      spatialAudioRef.current = new SpatialAudioManager(isSpatialAudioEnabled);
    } else {
      spatialAudioRef.current.setEnabled(isSpatialAudioEnabled);
    }
  }, [isSpatialAudioEnabled]);

  // Dynamic native noise suppression update
  useEffect(() => {
    if (rawStreamRef.current) {
      rawStreamRef.current.getAudioTracks().forEach((track) => {
        void track
          .applyConstraints({
            noiseSuppression: isNoiseSuppressionEnabled,
            echoCancellation: true,
            autoGainControl: true,
          })
          .catch(() => {});
      });
    }
  }, [isNoiseSuppressionEnabled]);

  // Sync remote streams to spatial audio manager
  useEffect(() => {
    if (!spatialAudioRef.current) return;
    Object.entries(remoteStreams).forEach(([userId, stream]) => {
      spatialAudioRef.current?.addParticipant(userId, stream);
    });
    spatialAudioRef.current.updatePositions(Object.keys(remoteStreams));
  }, [remoteStreams]);

  // Dynamic Head Tracking 3D Spatial Audio (MediaPipe HRTF)
  useEffect(() => {
    if (!isHeadTrackingEnabled) {
      headTrackerRef.current?.stop();
      headTrackerRef.current = null;
      spatialAudioRef.current?.resetHeadOrientation();
      setHeadAngles({ yaw: 0, pitch: 0, roll: 0 });
      return;
    }

    if (localStream && localStream.getVideoTracks().length > 0) {
      if (!headTrackerRef.current) {
        headTrackerRef.current = new HeadTracker(0.22);
        headTrackerRef.current.onOrientationUpdate((angles, vectors) => {
          setHeadAngles(angles);
          spatialAudioRef.current?.updateHeadOrientation(vectors.forward, vectors.up);
        });
      }
      headTrackerRef.current.start(localStream);
    }

    return () => {
      headTrackerRef.current?.stop();
    };
  }, [isHeadTrackingEnabled, localStream, setHeadAngles]);

  // Satellite & Extreme Network Congestion Control (Satellite-GCC) sync
  useEffect(() => {
    bandwidthAdapterRef.current?.setSatelliteMode(isSatelliteModeEnabled ? 'enabled' : 'auto');
  }, [isSatelliteModeEnabled]);

  // WebTransport (HTTP/3 QUIC) Datagram Client
  useEffect(() => {
    if (!webTransportClientRef.current) {
      const client = new WebTransportSignalingClient();
      client.onStateChange((mode) => {
        setTransportProtocol(mode);
        const stats = client.getStats();
        setQuicStats({
          datagramsSent: stats.datagramsSent,
          datagramsReceived: stats.datagramsReceived,
          rttMs: stats.rttMs,
        });
      });
      client.onIceCandidate((candidate, remoteCallId) => {
        if (remoteCallId === callId && pcRef.current) {
          void pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });
      webTransportClientRef.current = client;
    }
    return () => {
      webTransportClientRef.current?.disconnect();
      webTransportClientRef.current = null;
    };
  }, [callId, setTransportProtocol, setQuicStats]);

  // Mobile Safari / iOS Edge Cases (Autoplay Policy, Bluetooth headset switch)
  useEffect(() => {
    if (!mobileHandlerRef.current) {
      mobileHandlerRef.current = new MobileEdgeCaseHandler({
        onAutoplayBlocked: (isBlocked) => setIsAutoplayBlocked(isBlocked),
        onDeviceListChanged: (devices) => {
          setAvailableDevices({
            audioInputs: devices.filter((d) => d.kind === 'audioinput'),
            videoInputs: devices.filter((d) => d.kind === 'videoinput'),
            audioOutputs: devices.filter((d) => d.kind === 'audiooutput'),
          });
        },
      });
      mobileHandlerRef.current.init();
    }
    return () => {
      mobileHandlerRef.current?.destroy();
      mobileHandlerRef.current = null;
    };
  }, [setIsAutoplayBlocked, setAvailableDevices]);

  // Chaos Engineering & Network Throttling Sync
  useEffect(() => {
    if (chaosEngineRef.current) {
      chaosEngineRef.current.updateConfig(chaosConfig);
      void chaosEngineRef.current.applyToPeerConnection(pcRef.current);
    }
  }, [chaosConfig]);

  // Sidechain Audio Ducking: ducks system/screen audio when user speaks
  useEffect(() => {
    if (audioMixerRef.current && isScreenAudioSharing) {
      audioMixerRef.current.duckSystemAudio(isSidechainDuckingEnabled && localIsSpeaking);
    }
  }, [localIsSpeaking, isScreenAudioSharing, isSidechainDuckingEnabled]);

  // Voice FX Processor
  useEffect(() => {
    if (localStream && localStream.getAudioTracks().length > 0) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (!voiceFXProcessorRef.current) {
        voiceFXProcessorRef.current = new VoiceFXProcessor(audioTrack);
      }
      voiceFXProcessorRef.current.setMode(voiceFX);

      const pc = pcRef.current;
      if (pc && !isScreenAudioSharing) {
        const audioSender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
        if (audioSender) {
          const targetTrack = voiceFXProcessorRef.current.getProcessedTrack();
          void audioSender.replaceTrack(targetTrack);
        }
      }
    }
  }, [localStream, voiceFX, isScreenAudioSharing]);

  // Adaptive Peer Mesh
  useEffect(() => {
    adaptiveMeshRef.current = new AdaptiveMeshController(() => pcRef.current);
    return () => {
      adaptiveMeshRef.current?.destroy();
      adaptiveMeshRef.current = null;
    };
  }, []);

  // Update active speaker priority in adaptive mesh
  useEffect(() => {
    if (remoteIsSpeaking) {
      const firstRemoteId = Object.keys(remoteStreams)[0] || null;
      adaptiveMeshRef.current?.setActiveSpeaker(firstRemoteId);
    } else {
      adaptiveMeshRef.current?.setActiveSpeaker(null);
    }
  }, [remoteIsSpeaking, remoteStreams]);

  const triggerIceRestart = useCallback(async (): Promise<void> => {
    const pc = pcRef.current;
    if (!pc || pc.signalingState === 'closed') return;
    if (pc.signalingState !== 'stable') {
      console.warn('[useWebRTC] triggerIceRestart deferred: signalingState is', pc.signalingState);
      return;
    }
    try {
      const isScreenShareActive =
        useCallStore.getState().isScreenSharing || useCallStore.getState().isRemoteScreenSharing;
      const codecPref = isScreenShareActive ? 'vp8' : useCallStore.getState().preferredVideoCodec;

      // Prioritize VP8 on video transceivers via standard W3C API for flawless screen sharing across all browsers
      if (
        isScreenShareActive &&
        typeof RTCRtpReceiver.getCapabilities === 'function' &&
        typeof pc.getTransceivers === 'function'
      ) {
        try {
          const capabilities = RTCRtpReceiver.getCapabilities('video');
          if (capabilities?.codecs) {
            const vp8Codecs = capabilities.codecs.filter(
              (c) => c.mimeType.toLowerCase() === 'video/vp8',
            );
            const otherCodecs = capabilities.codecs.filter(
              (c) => c.mimeType.toLowerCase() !== 'video/vp8',
            );
            pc.getTransceivers().forEach((t) => {
              if (
                t.receiver.track.kind === 'video' &&
                typeof t.setCodecPreferences === 'function'
              ) {
                try {
                  t.setCodecPreferences([...vp8Codecs, ...otherCodecs]);
                } catch {}
              }
            });
          }
        } catch {}
      }

      // Standard track renegotiation without dropping existing ICE state
      const offer = await pc.createOffer();
      if (offer.sdp) {
        offer.sdp = mungeSDP(offer.sdp, codecPref, false, isScreenShareActive);
      }
      await pc.setLocalDescription(offer);
      onSendIceRestart?.(offer);
    } catch (err) {
      console.warn('Auto renegotiation failed', err);
    }
  }, [onSendIceRestart]);

  const attachE2eeToTransceivers = useCallback((pc: RTCPeerConnection, key: CryptoKey) => {
    const isScreenShareActive =
      useCallStore.getState().isScreenSharing || useCallStore.getState().isRemoteScreenSharing;
    const isVideoCall = useCallStore.getState().callType === 'video';
    if (isScreenShareActive || !isVideoCall) return;

    for (const sender of pc.getSenders()) {
      if (
        sender.track &&
        sender.track.kind === 'video' &&
        !transformedSendersRef.current.has(sender)
      ) {
        try {
          if (attachSenderScriptTransform(sender, { cryptoKey: key })) {
            transformedSendersRef.current.add(sender);
          }
        } catch (e) {
          console.warn('[E2EE] attachSenderScriptTransform error:', e);
        }
      }
    }
    for (const receiver of pc.getReceivers()) {
      if (
        receiver.track &&
        receiver.track.kind === 'video' &&
        !transformedReceiversRef.current.has(receiver)
      ) {
        try {
          if (attachReceiverScriptTransform(receiver, { cryptoKey: key })) {
            transformedReceiversRef.current.add(receiver);
          }
        } catch (e) {
          console.warn('[E2EE] attachReceiverScriptTransform error:', e);
        }
      }
    }
  }, []);

  const initPeerConnection = useCallback(
    async (
      onIceCandidate: (candidate: RTCIceCandidate) => void,
      targetUserId?: string,
    ): Promise<RTCPeerConnection> => {
      if (pcRef.current) {
        return pcRef.current;
      }

      console.log('[initPeerConnection] fetching ICE servers...');
      const iceServers = await fetchIceServers();
      console.log('[initPeerConnection] creating RTCPeerConnection...');
      const pc = new RTCPeerConnection({
        iceServers,
        bundlePolicy: 'max-bundle',
      });
      pcRef.current = pc;
      if (typeof window !== 'undefined') {
        (window as unknown as { __PC__?: RTCPeerConnection }).__PC__ = pc;
      }

      // Pre-allocate audio and video transceivers with sendrecv so that
      // SDP offer/answer always contains both m=audio and m=video sections.
      // This allows instant video/screen-share track replacement without renegotiation glitches.
      try {
        if (typeof pc.addTransceiver === 'function') {
          const transceivers = pc.getTransceivers();
          if (!transceivers.some((t) => t.receiver.track.kind === 'audio')) {
            pc.addTransceiver('audio', { direction: 'sendrecv' });
          }
          if (!transceivers.some((t) => t.receiver.track.kind === 'video')) {
            pc.addTransceiver('video', { direction: 'sendrecv' });
          }
        }
      } catch (err) {
        console.warn('[initPeerConnection] failed to pre-add transceivers:', err);
      }

      // E2EE session keys are established by the explicit handshake
      // (prepareE2eeOffer / acceptE2eeOffer / completeE2eeHandshake) once both
      // ephemeral publics have crossed signaling. Nothing is derived here:
      // any key the server could recompute is not end-to-end (see F1).
      if (callId) {
        console.log('[initPeerConnection] E2EE pending handshake for callId:', callId);
        if (!isInsertableStreamsSupported() && !isScriptTransformSupported()) {
          setE2EEInfo('unsupported', '', '');
        }
      }
      console.log('[initPeerConnection] done!');

      // Initialize P2P Gossip Relay mesh manager
      if (!gossipRelayRef.current) {
        gossipRelayRef.current = new GossipRelayManager('local-user');
        gossipRelayRef.current.onSignal((msg) => {
          if (msg.type === 'ICE_CANDIDATE' && msg.payload) {
            const candidate = msg.payload as RTCIceCandidateInit;
            if (pcRef.current?.remoteDescription) {
              pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
            } else {
              queuedCandidatesRef.current.push(candidate);
            }
          }
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          if (callId && webTransportClientRef.current?.getTransportMode() === 'quic') {
            webTransportClientRef.current.sendIceCandidate(
              callId,
              event.candidate.toJSON(),
              targetUserId,
            );
          } else {
            onIceCandidate(event.candidate);
          }
          // Fallback mesh broadcast when WebSocket drops
          gossipRelayRef.current?.broadcast(
            'ICE_CANDIDATE',
            event.candidate.toJSON(),
            targetUserId,
          );
        }
      };

      pc.ontrack = (event) => {
        const streamId = targetUserId || 'remote';
        console.log(
          '[ontrack] fired! track:',
          event.track?.kind,
          'streamId:',
          streamId,
          'receiver:',
          !!event.receiver,
        );

        let remoteStream = event.streams?.[0];
        if (!remoteStream) {
          const currentRemote = useCallStore.getState().remoteStreams[streamId];
          if (currentRemote) {
            if (event.track.kind === 'video') {
              // Replace any older/dummy video tracks so the newly incoming live video track is ALWAYS primary
              currentRemote.getVideoTracks().forEach((oldTrack) => {
                if (oldTrack.id !== event.track.id) {
                  currentRemote.removeTrack(oldTrack);
                }
              });
              if (!currentRemote.getTracks().some((t) => t.id === event.track.id)) {
                currentRemote.addTrack(event.track);
              }
            } else if (event.track.kind === 'audio') {
              if (!currentRemote.getTracks().some((t) => t.id === event.track.id)) {
                currentRemote.addTrack(event.track);
              }
            }
            remoteStream = currentRemote;
          } else {
            remoteStream = new MediaStream([event.track]);
          }
        } else {
          const currentRemote = useCallStore.getState().remoteStreams[streamId];
          if (currentRemote) {
            for (const t of currentRemote.getTracks()) {
              if (t.kind === 'video' && event.track.kind === 'video' && t.id !== event.track.id) {
                continue;
              }
              if (!remoteStream.getTracks().some((rt) => rt.id === t.id)) {
                remoteStream.addTrack(t);
              }
            }
          }
        }

        // Attach RTCRtpScriptTransform receiver decryption for video tracks if key exists, signaling is stable,
        // and track is NOT a screen share track (screen share uses native DTLS-SRTP for line-rate 60 FPS decoding)
        const isScreenShareActive =
          useCallStore.getState().isScreenSharing || useCallStore.getState().isRemoteScreenSharing;
        if (
          !isScreenShareActive &&
          event.receiver &&
          event.track.kind === 'video' &&
          event.track.contentHint !== 'motion' &&
          !transformedReceiversRef.current.has(event.receiver) &&
          pc.signalingState === 'stable'
        ) {
          if (cryptoKeyRef.current) {
            console.log('[ontrack] attaching video receiver script transform...');
            try {
              if (
                attachReceiverScriptTransform(event.receiver, {
                  cryptoKey: cryptoKeyRef.current,
                })
              ) {
                transformedReceiversRef.current.add(event.receiver);
              }
              console.log('[ontrack] video receiver script transform attached');
            } catch (e) {
              console.warn('[ontrack] attachReceiverScriptTransform error:', e);
            }
          }
        }

        const updateRemoteStore = () => {
          if (ensureReceiverTracksRef.current) {
            ensureReceiverTracksRef.current(streamId);
          } else if (remoteStream) {
            setRemoteStream(streamId, new MediaStream(remoteStream.getTracks()));
            if (targetUserId) {
              setRemoteStream('remote', new MediaStream(remoteStream.getTracks()));
            }
          }
        };

        if (event.track) {
          event.track.enabled = true;
          event.track.onunmute = () => {
            console.log('[ontrack] track unmuted:', event.track.kind);
            updateRemoteStore();
          };

          event.track.onmute = () => {
            console.log('[ontrack] track muted:', event.track.kind);
            updateRemoteStore();
          };

          event.track.onended = () => {
            console.log('[ontrack] track ended:', event.track.kind);
            updateRemoteStore();
          };
        }

        console.log('[ontrack] updating remote stream in Zustand...');
        updateRemoteStore();
      };

      const currentUserId = useAuthStore.getState().userId;
      const isPolite = currentUserId && targetUserId ? currentUserId < targetUserId : true;
      perfectNegotiationRef.current = new PerfectNegotiationFSM({
        pc,
        isPolite,
        sendSignal: (signal) => {
          if (signal.candidate) {
            onIceCandidate(signal.candidate as unknown as RTCIceCandidate);
          }
        },
      });
      // CRITICAL: Disable automatic onnegotiationneeded on the peer connection.
      // Negotiation is explicitly driven by useWebRTC / useCallManager signaling handlers.
      // Having an untargeted pc.onnegotiationneeded calling pc.setLocalDescription() behind the scenes
      // causes Offer Collision / Glare and "Called in wrong state: stable" crashes!
      pc.onnegotiationneeded = null;

      // Receivers for P2P DataChannels (Unified Mux, File transfer, Gossip relay, SyncPlay)
      pc.ondatachannel = (event) => {
        const label = event.channel.label;
        if (label === 'p2p-binary-mux') {
          binaryMuxRef.current.bindDataChannel(event.channel);
          setupMuxChannels(binaryMuxRef.current);
        } else if (label === 'p2p-file-transfer') {
          if (!p2pFileManagerRef.current) {
            p2pFileManagerRef.current = new P2PFileManager((item) => {
              upsertFileTransfer(item);
            });
          }
          p2pFileManagerRef.current.bindDataChannel(event.channel);
        } else if (label === 'p2p-gossip-signaling') {
          gossipRelayRef.current?.bindDataChannel(targetUserId || 'peer', event.channel);
        } else if (label === 'p2p-syncplay') {
          if (!syncPlayEngineRef.current) {
            syncPlayEngineRef.current = new SyncPlayEngine({
              onDriftUpdate: (drift, rtt) => setSyncPlayMetrics(drift, rtt),
            });
          }
          syncPlayEngineRef.current.bindDataChannel(event.channel, false);
        } else if (label === 'p2p-crdt-whiteboard') {
          if (!whiteboardEngineRef.current) {
            whiteboardEngineRef.current = new WhiteboardCRDTEngine();
          }
          whiteboardEngineRef.current.bindDataChannel(targetUserId || 'peer', event.channel);
        } else if (label === 'p2p-webcodecs-stream') {
          webCodecsManagerRef.current?.bindDataChannel(event.channel);
        } else if (label === 'p2p-turn-relay') {
          peerRelayManagerRef.current?.bindClientRelayChannel(event.channel, 'active-relay');
          setIsPeerRelayActive(true, 'active-relay');
        } else if (label === 'p2p-reaction-emotes') {
          reactionChannelRef.current = event.channel;
          event.channel.onmessage = (msgEvent) => {
            try {
              const data = JSON.parse(msgEvent.data);
              if (data.type === 'EMOTE_REACTION' && data.emoji) {
                reactionEngineRef.current?.spawn(
                  data.emoji,
                  typeof window !== 'undefined' ? window.innerWidth : 800,
                  typeof window !== 'undefined' ? window.innerHeight : 600,
                  data.x,
                );
              } else if (data.type?.startsWith('SOUNDBOARD_')) {
                handleSoundboardIncomingMessage(data);
              }
            } catch {
              // Ignore malformed emote payload
            }
          };
        }
      };

      pc.onconnectionstatechange = () => {
        globalCallExternalStore.update({
          peerConnectionState: pc.connectionState,
        });
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'connected' || state === 'completed') {
          globalCallExternalStore.transition('CONNECTED');
          globalCallExternalStore.update({
            iceConnectionState: state,
            connectionQuality: 'excellent',
          });
          setConnectionQuality('excellent');
          if (useCallStore.getState().isReconnecting) {
            stopReconnectingChime();
            if (reconnectCountdownTimerRef.current) {
              clearInterval(reconnectCountdownTimerRef.current);
              reconnectCountdownTimerRef.current = null;
            }
            setIsReconnecting(false);
            setReconnectRestored(true);
            playReconnectedSuccessSound();
            setTimeout(() => {
              setReconnectRestored(false);
            }, 2500);
          }
        } else if (state === 'disconnected' || state === 'failed') {
          if (state === 'failed') {
            void CallAlarming.captureCallAlarm({
              callId: callId || 'unknown',
              remoteUserId: targetUserId,
              error: new Error('WebRTC ICE Connection Failed'),
              category: 'ICE_HANDSHAKE_FAILURE',
              pc,
            });
          }
          globalCallExternalStore.transition('RECONNECTING');
          globalCallExternalStore.update({
            iceConnectionState: state,
            connectionQuality: 'poor',
          });
          setConnectionQuality('disconnected');
          if (!useCallStore.getState().isReconnecting) {
            setIsReconnecting(true);
            setReconnectCountdown(15);
            playReconnectingChime();
            void triggerIceRestart();

            if (reconnectCountdownTimerRef.current) {
              clearInterval(reconnectCountdownTimerRef.current);
            }
            let remaining = 15;
            reconnectCountdownTimerRef.current = setInterval(() => {
              remaining--;
              setReconnectCountdown(remaining);
              if (remaining <= 0) {
                if (reconnectCountdownTimerRef.current) {
                  clearInterval(reconnectCountdownTimerRef.current);
                  reconnectCountdownTimerRef.current = null;
                }
                stopReconnectingChime();
                setIsReconnecting(false);
                void CallAlarming.captureCallAlarm({
                  callId: callId || 'unknown',
                  remoteUserId: targetUserId,
                  error: new Error('WebRTC Connection Dropped: Reconnection Expired'),
                  category: 'CONNECTION_DROPPED',
                  pc,
                });
                onConnectionFailed?.();
              }
            }, 1000);
          }
        }
      };

      // Start Telemetry & Smart Bandwidth Adaptation engine
      telemetryCollectorRef.current = new TelemetryCollector(callId || 'unknown', pc);

      if (bandwidthAdapterRef.current) {
        bandwidthAdapterRef.current.stop();
      }
      const adapter = new BandwidthAdapter(
        pc,
        {
          onStatsUpdate: (stats) => {
            setNetworkStats(stats);
            telemetryCollectorRef.current?.recordSample(stats.rtt, stats.packetLoss, stats.jitter);
          },
          onQualityChange: (quality) => {
            setConnectionQuality(
              quality === 'good' ? 'excellent' : quality === 'fair' ? 'good' : 'poor',
            );
          },
          onAudioOnlyFallback: (enabled, reason) => {
            useCallStore.getState().setIsAudioOnlyFallbackActive(enabled, reason);
          },
        },
        isSatelliteModeEnabled ? 'enabled' : 'auto',
      );
      adapter.start(2000);
      bandwidthAdapterRef.current = adapter;
      // Start Discord-Style Live Stats Collector (1s polling)
      if (liveStatsCollectorRef.current) {
        liveStatsCollectorRef.current.stop();
      }
      const statsCollector = new LiveStatsCollector(
        () => pcRef.current,
        (stats) => setLiveStats(stats),
      );
      statsCollector.start(1000);
      liveStatsCollectorRef.current = statsCollector;

      return pc;
    },
    [
      fetchIceServers,
      setRemoteStream,
      setConnectionQuality,
      callId,
      setE2EEInfo,
      triggerIceRestart,
      setNetworkStats,
      setIsReconnecting,
      setReconnectCountdown,
      setReconnectRestored,
      onConnectionFailed,
      upsertFileTransfer,
      setLiveStats,
      setSyncPlayMetrics,
      setIsPeerRelayActive,
      isSatelliteModeEnabled,
      setupMuxChannels,
    ],
  );

  const acquireLocalMedia = useCallback(
    async (callType: 'audio' | 'video'): Promise<MediaStream> => {
      const type = ((callType as unknown as string) || 'audio').toLowerCase() as 'audio' | 'video';
      console.log('[acquireLocalMedia] started. type:', type);
      // If we already have an active local stream with required tracks, return it
      if (localStream && localStream.active) {
        const hasVideo = localStream.getVideoTracks().length > 0;
        if (type === 'audio' || (type === 'video' && hasVideo)) {
          console.log('[acquireLocalMedia] returning existing active stream');
          return localStream;
        }
      }

      const constraints: MediaStreamConstraints = {
        audio: selectedAudioInput
          ? {
              deviceId: { exact: selectedAudioInput },
              echoCancellation: true,
              noiseSuppression: isNoiseSuppressionEnabled,
              autoGainControl: true,
            }
          : {
              echoCancellation: true,
              noiseSuppression: isNoiseSuppressionEnabled,
              autoGainControl: true,
            },
        video:
          type === 'video'
            ? selectedVideoInput
              ? {
                  deviceId: { exact: selectedVideoInput },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                }
              : { width: { ideal: 1280 }, height: { ideal: 720 } }
            : false,
      };

      let rawStream: MediaStream;
      try {
        rawStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.error('[acquireLocalMedia] getUserMedia FAILED:', err);
        void CallAlarming.captureCallAlarm({
          callId: callId || 'initiation',
          error: err,
          pc: pcRef.current,
        });

        // Fallback to audio-only if camera request fails
        if (type === 'video') {
          try {
            rawStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: isNoiseSuppressionEnabled,
                autoGainControl: true,
              },
              video: false,
            });
          } catch (audioErr) {
            void CallAlarming.captureCallAlarm({
              callId: callId || 'initiation',
              error: audioErr,
              pc: pcRef.current,
            });
            throw audioErr;
          }
        } else {
          throw err;
        }
      }

      rawStreamRef.current = rawStream;

      if (callAudioPipelineRef.current) {
        callAudioPipelineRef.current.destroy();
        callAudioPipelineRef.current = null;
      }

      const currentCallState = useCallStore.getState();
      const pipeline = new LocalAudioPipeline(rawStream, {
        inputVolume: currentCallState.inputVolume,
        isDenoiseEnabled: currentCallState.isNoiseSuppressionEnabled,
        sampleRate: 48000,
        voiceFX: currentCallState.voiceFX,
        isPTT: currentCallState.isPTTEnabled,
        isPTTTalking: currentCallState.isPTTActive,
        vadThresholdDb: currentCallState.noiseGateThreshold,
        onSpeakingChange: (speaking) => {
          setLocalIsSpeaking(speaking);
        },
      });
      callAudioPipelineRef.current = pipeline;

      const rawAudioTrack = rawStream.getAudioTracks()[0];
      const processedAudioTrack = pipeline.getProcessedTrack();
      const outgoingAudioTrack = processedAudioTrack || rawAudioTrack;

      const isAudioEffectivelyMuted =
        currentCallState.isMuted || currentCallState.inputVolume === 0;
      const shouldEnableAudio = currentCallState.isPTTEnabled
        ? currentCallState.isPTTActive
        : !isAudioEffectivelyMuted;
      if (rawAudioTrack) {
        rawAudioTrack.enabled = shouldEnableAudio;
      }
      if (processedAudioTrack) {
        processedAudioTrack.enabled = shouldEnableAudio;
      }
      if (!shouldEnableAudio) {
        pipeline.setGateOpen(false, 0);
      }

      const finalTracks: MediaStreamTrack[] = [outgoingAudioTrack];
      rawStream.getVideoTracks().forEach((vt) => finalTracks.push(vt));
      const finalStream = new MediaStream(finalTracks);

      setLocalStream(finalStream);
      return finalStream;
    },
    [
      localStream,
      selectedAudioInput,
      selectedVideoInput,
      setLocalStream,
      isNoiseSuppressionEnabled,
      callId,
    ],
  );

  const attachLocalStream = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach((track) => {
      const transceivers = typeof pc.getTransceivers === 'function' ? pc.getTransceivers() : [];
      const matchingTransceiver = transceivers.find(
        (t) =>
          t.sender.track?.id === track.id ||
          t.sender.track?.kind === track.kind ||
          (!t.sender.track && t.receiver.track.kind === track.kind),
      );
      if (matchingTransceiver) {
        matchingTransceiver.direction = 'sendrecv';
        if (matchingTransceiver.sender.track?.id !== track.id) {
          void matchingTransceiver.sender.replaceTrack(track);
        }
        if (track.kind === 'video' && cryptoKeyRef.current && pc.signalingState === 'stable') {
          attachSenderScriptTransform(matchingTransceiver.sender, {
            cryptoKey: cryptoKeyRef.current,
          });
        }
      } else {
        const existingSenders = pc.getSenders();
        const existingSenderForKind = existingSenders.find(
          (s) => s.track?.id === track.id || s.track?.kind === track.kind,
        );
        if (existingSenderForKind) {
          if (existingSenderForKind.track?.id !== track.id) {
            void existingSenderForKind.replaceTrack(track);
          }
        } else {
          const sender = pc.addTrack(track, stream);

          // Attach RTCRtpScriptTransform only to video tracks if signaling is already stable
          if (
            track.kind === 'video' &&
            cryptoKeyRef.current &&
            sender &&
            pc.signalingState === 'stable'
          ) {
            attachSenderScriptTransform(sender, {
              cryptoKey: cryptoKeyRef.current,
            });
          }
        }
      }
    });
  }, []);

  const createOffer = useCallback(
    async (
      callType: 'audio' | 'video',
      onIceCandidate: (candidate: RTCIceCandidate) => void,
      targetUserId?: string,
    ): Promise<RTCSessionDescriptionInit> => {
      const pc = await initPeerConnection(onIceCandidate, targetUserId);
      const stream = await acquireLocalMedia(callType);
      attachLocalStream(pc, stream);

      globalCallExternalStore.transition('CALLING');
      globalCallExternalStore.transition('SIGNALING');
      globalCallExternalStore.update({
        callType,
        callId: callId || null,
        localStream: stream,
      });

      // Create unified Binary DataChannel Multiplexer (zero-GC)
      try {
        const muxChannel = pc.createDataChannel('p2p-binary-mux');
        binaryMuxRef.current.bindDataChannel(muxChannel);
        setupMuxChannels(binaryMuxRef.current);
      } catch (err) {
        console.warn('[BinaryMux] Failed to create data channel on offer:', err);
      }

      // Create P2P DataChannel for File Transfers on initiator
      if (!p2pFileManagerRef.current) {
        p2pFileManagerRef.current = new P2PFileManager((item) => {
          upsertFileTransfer(item);
        });
      }
      try {
        const channel = pc.createDataChannel('p2p-file-transfer');
        p2pFileManagerRef.current.bindDataChannel(channel);
      } catch (err) {
        console.warn('[P2PFile] Failed to create data channel on offer:', err);
      }

      // Create P2P DataChannel for Gossip Signaling Relay
      try {
        const gossipChannel = pc.createDataChannel('p2p-gossip-signaling');
        gossipRelayRef.current?.bindDataChannel(targetUserId || 'peer', gossipChannel);
      } catch (err) {
        console.warn('[GossipRelay] Failed to create data channel on offer:', err);
      }

      // Create P2P DataChannel for SyncPlay Watch Together
      try {
        if (!syncPlayEngineRef.current) {
          syncPlayEngineRef.current = new SyncPlayEngine({
            onDriftUpdate: (drift, rtt) => setSyncPlayMetrics(drift, rtt),
          });
        }
        const syncChannel = pc.createDataChannel('p2p-syncplay');
        syncPlayEngineRef.current.bindDataChannel(syncChannel, true);
      } catch (err) {
        console.warn('[SyncPlay] Failed to create data channel on offer:', err);
      }

      // Create P2P DataChannel for CRDT Whiteboard
      try {
        if (!whiteboardEngineRef.current) {
          whiteboardEngineRef.current = new WhiteboardCRDTEngine();
        }
        const wbChannel = pc.createDataChannel('p2p-crdt-whiteboard');
        whiteboardEngineRef.current.bindDataChannel(targetUserId || 'peer', wbChannel);
      } catch (err) {
        console.warn('[Whiteboard] Failed to create data channel on offer:', err);
      }

      // Create P2P DataChannel for WebCodecs custom video pipeline
      try {
        const webCodecsChannel = pc.createDataChannel('p2p-webcodecs-stream');
        webCodecsManagerRef.current?.bindDataChannel(webCodecsChannel);
      } catch (err) {
        console.warn('[WebCodecs] Failed to create data channel on offer:', err);
      }

      // Create P2P DataChannel for P2P TURN Relay Mesh
      try {
        const relayChannel = pc.createDataChannel('p2p-turn-relay');
        peerRelayManagerRef.current?.bindClientRelayChannel(relayChannel, 'client-relay');
      } catch (err) {
        console.warn('[PeerRelay] Failed to create data channel on offer:', err);
      }

      // Create P2P DataChannel for Floating Reaction Emotes
      try {
        const reactionChannel = pc.createDataChannel('p2p-reaction-emotes');
        reactionChannelRef.current = reactionChannel;
        reactionChannel.onmessage = (msgEvent) => {
          try {
            const data = JSON.parse(msgEvent.data);
            if (data.type === 'EMOTE_REACTION' && data.emoji) {
              reactionEngineRef.current?.spawn(
                data.emoji,
                typeof window !== 'undefined' ? window.innerWidth : 800,
                typeof window !== 'undefined' ? window.innerHeight : 600,
                data.x,
              );
            } else if (data.type?.startsWith('SOUNDBOARD_')) {
              handleSoundboardIncomingMessage(data);
            }
          } catch {
            // Ignore malformed emote payload
          }
        };
      } catch (err) {
        console.warn('[Reactions] Failed to create data channel on offer:', err);
      }

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      const codecPref = useCallStore.getState().preferredVideoCodec;
      if (offer.sdp && callType === 'video') {
        offer.sdp = mungeSDP(offer.sdp, codecPref, false);
      }
      await pc.setLocalDescription(offer);
      return offer;
    },
    [
      initPeerConnection,
      acquireLocalMedia,
      attachLocalStream,
      upsertFileTransfer,
      setSyncPlayMetrics,
      callId,
      setupMuxChannels,
    ],
  );

  const handleOffer = useCallback(
    async (
      offer: RTCSessionDescriptionInit,
      type: 'audio' | 'video',
      onIceCandidate: (candidate: RTCIceCandidate) => void,
      callerUserId?: string,
    ): Promise<RTCSessionDescriptionInit> => {
      console.log('[handleOffer] STEP 1: acquireLocalMedia...');
      const stream = await acquireLocalMedia(type);

      console.log('[handleOffer] STEP 2: initPeerConnection...');
      const pc = await initPeerConnection(onIceCandidate, callerUserId);

      console.log('[handleOffer] STEP 2.5: attachLocalStream...');
      attachLocalStream(pc, stream);

      console.log(
        '[handleOffer] STEP 3: setRemoteDescription...',
        typeof offer,
        offer?.type,
        offer?.sdp ? offer.sdp.slice(0, 40) : 'NO_SDP',
      );
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log('[handleOffer] STEP 3 setRemoteDescription SUCCEEDED!');
      } catch (e) {
        console.error('[handleOffer] STEP 3 setRemoteDescription EXCEPTION:', e);
        throw e;
      }

      // Flush any queued candidates that arrived before remoteDescription
      while (queuedCandidatesRef.current.length > 0) {
        const candidate = queuedCandidatesRef.current.shift();
        if (candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
      }

      globalCallExternalStore.transition('RINGING');
      globalCallExternalStore.transition('SIGNALING');
      globalCallExternalStore.update({
        callType: type,
        callId: callId || null,
        localStream: stream,
      });

      console.log('[handleOffer] STEP 5: createAnswer starting...', {
        signalingState: pc.signalingState,
        iceConnectionState: pc.iceConnectionState,
        senders: pc.getSenders().length,
        receivers: pc.getReceivers().length,
      });
      try {
        const answer = await Promise.race([
          pc.createAnswer(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('pc.createAnswer timed out after 10000ms')), 10000),
          ),
        ]);
        console.log('[handleOffer] STEP 5.5: createAnswer succeeded!');
        console.log('[handleOffer] STEP 6: setLocalDescription...');
        await pc.setLocalDescription(answer);
        console.log('[handleOffer] STEP 7: attaching E2EE transforms...');
        if (cryptoKeyRef.current) {
          attachE2eeToTransceivers(pc, cryptoKeyRef.current);
        }
        console.log('[handleOffer] STEP 8: returning answer!');
        return answer;
      } catch (e) {
        console.error('[handleOffer] STEP 5/6 Answer creation EXCEPTION:', e);
        throw e;
      }
    },
    [initPeerConnection, acquireLocalMedia, attachLocalStream, attachE2eeToTransceivers, callId],
  );

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit): Promise<void> => {
    const pc = pcRef.current;
    if (!pc) return;

    if (pc.signalingState === 'stable' || pc.signalingState === 'closed') {
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      // Flush queued candidates
      while (queuedCandidatesRef.current.length > 0) {
        const candidate = queuedCandidatesRef.current.shift();
        if (candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
      }

      ensureReceiverTracksRef.current?.();
    } catch (err: any) {
      if (err?.name === 'InvalidStateError' || err?.message?.includes('Called in wrong state')) {
        console.warn(
          '[useWebRTC] handleAnswer ignored: peer connection already in state',
          pc.signalingState,
        );
        return;
      }
      throw err;
    }
  }, []);

  // --- E2EE handshake (ephemeral ECDH + HKDF; server relays publics only) ---

  const isE2eeCapable = (): boolean =>
    isInsertableStreamsSupported() || isScriptTransformSupported();

  /** Ephemeral public + optional identity signature traveling in signaling. */
  type E2eeOfferBundle = { publicKey: string; signature: string | null };

  /** Last peer identity seen during handshake (for TOFU pinning on confirm). */
  const e2eePeerRef = useRef<{ userId: string; identityB64: string } | null>(null);

  /** Best-effort identity signature over our ephemeral (null when unavailable). */
  const signOwnEphemeral = async (ephemeralPubB64: string): Promise<string | null> => {
    try {
      const { privateKey } = await ensureIdentityKeypair();
      void ensureIdentityRegistered().catch((err: unknown) => {
        console.warn('[E2EE] identity registration failed:', err);
      });
      return await signEphemeralBinding(privateKey, ephemeralPubB64);
    } catch (err) {
      console.warn('[E2EE] ephemeral signing unavailable:', err);
      return null;
    }
  };

  /**
   * TOFU trust resolution. Deliberately NEVER auto-promotes to 'verified' in
   * v1: a pinned directory key could itself have been planted before first
   * contact, so only a fresh SAS compare (or a future out-of-band identity
   * proof) promotes. This still verifies signatures for tamper/key-change
   * warnings and records the peer identity for pinning on SAS confirm.
   * Returns the honest status: always 'unverified' for now.
   */
  const resolvePeerTrust = async (
    peerUserId: string | undefined,
    peerEphemeralB64: string,
    peerSig: string | null | undefined,
  ): Promise<'verified' | 'unverified'> => {
    if (!peerUserId || !peerSig) return 'unverified';
    try {
      const dirKey = await fetchPeerIdentityKeyCached(peerUserId);
      if (!dirKey) return 'unverified';
      e2eePeerRef.current = { userId: peerUserId, identityB64: dirKey };
      const pinnedFp = getPinnedFingerprint(peerUserId);
      if (pinnedFp) {
        try {
          const currentFp = await fingerprintIdentityKey(dirKey);
          if (currentFp.toLowerCase() !== pinnedFp) {
            console.warn(
              '[E2EE] peer identity key CHANGED since pinning — re-verify SAS carefully (reinstall or MITM)',
            );
          }
        } catch {
          // Fingerprint failure must not break the call.
        }
      }
      const idKey = await importIdentityPublicKey(dirKey);
      const sigOk = await verifyEphemeralBinding(idKey, peerEphemeralB64, peerSig);
      if (!sigOk) {
        console.warn(
          '[E2EE] peer ephemeral signature invalid — possible signaling tamper; compare SAS',
        );
      }
      return 'unverified';
    } catch (err) {
      console.warn('[E2EE] trust resolution failed:', err);
      return 'unverified';
    }
  };

  /** Initiator step 1: ephemeral keypair for this call; returns SPKI b64 for signaling. */
  const prepareE2eeOffer = useCallback(async (): Promise<E2eeOfferBundle | null> => {
    if (!isE2eeCapable()) return null;
    try {
      const pair = await generateEphemeralKeypair();
      e2eeEphemeralRef.current = pair;
      const publicKey = await exportEphemeralPublicKey(pair.publicKey);
      return { publicKey, signature: await signOwnEphemeral(publicKey) };
    } catch (err) {
      console.warn('[E2EE] prepareE2eeOffer failed:', err);
      return null;
    }
  }, []);

  /**
   * Callee step: derive the session from the initiator pubkey found in the
   * incoming call payload; returns our own bundle for CALL_ACCEPT.
   * State becomes 'unverified' — NOT 'verified' (see F2).
   */
  const acceptE2eeOffer = useCallback(
    async (
      peerKeyB64: string | undefined,
      peerSig: string | null | undefined,
      peerUserId: string | undefined,
      callId: string,
    ): Promise<E2eeOfferBundle | null> => {
      if (!peerKeyB64 || !isE2eeCapable()) return null;
      try {
        const pair = await generateEphemeralKeypair();
        e2eeEphemeralRef.current = pair;
        const session = await deriveCallSessionKey(pair.privateKey, peerKeyB64, callId);
        cryptoKeyRef.current = session.key;
        const trust = await resolvePeerTrust(peerUserId, peerKeyB64, peerSig);
        setE2EEInfo(trust, session.fingerprint, session.sasCode, session.sasEmojis);
        if (pcRef.current) {
          attachE2eeToTransceivers(pcRef.current, session.key);
        }
        const publicKey = await exportEphemeralPublicKey(pair.publicKey);
        return { publicKey, signature: await signOwnEphemeral(publicKey) };
      } catch (err) {
        console.warn('[E2EE] acceptE2eeOffer failed:', err);
        return null;
      }
    },
    [setE2EEInfo, attachE2eeToTransceivers],
  );

  /**
   * Initiator step 2: complete with the callee pubkey from CALL_ACCEPTED and
   * attach to already-live senders (receivers attach on track events).
   */
  const completeE2eeHandshake = useCallback(
    async (
      peerKeyB64: string | undefined,
      peerSig: string | null | undefined,
      peerUserId: string | undefined,
      callId: string,
    ): Promise<boolean> => {
      const local = e2eeEphemeralRef.current;
      if (!peerKeyB64 || !local || !isE2eeCapable()) return false;
      try {
        const session = await deriveCallSessionKey(local.privateKey, peerKeyB64, callId);
        cryptoKeyRef.current = session.key;
        const trust = await resolvePeerTrust(peerUserId, peerKeyB64, peerSig);
        setE2EEInfo(trust, session.fingerprint, session.sasCode, session.sasEmojis);
        if (pcRef.current) {
          attachE2eeToTransceivers(pcRef.current, session.key);
        }
        return true;
      } catch (err) {
        console.warn('[E2EE] completeE2eeHandshake failed:', err);
        return false;
      }
    },
    [setE2EEInfo, attachE2eeToTransceivers],
  );

  /**
   * Call ONLY after the out-of-band SAS compare ceremony (voice/video confirm
   * of sasCode/sasEmojis) or identity-signature verification. This is what
   * promotes 'unverified' to 'verified' — never set 'verified' otherwise.
   */
  const confirmE2eeSasMatch = useCallback((): void => {
    const state = useCallStore.getState();
    if (!cryptoKeyRef.current && !state.sasEmojis) return;
    // Pin the peer identity observed during this SAS-confirmed session so
    // future key changes surface as explicit warnings (TOFU).
    const peer = e2eePeerRef.current;
    if (peer && peer.identityB64) {
      fingerprintIdentityKey(peer.identityB64)
        .then((fp) => pinIdentityKey(peer.userId, fp))
        .catch(() => {});
    }
    setE2EEInfo('verified', state.e2eeFingerprint, state.sasCode, state.sasEmojis);
  }, [setE2EEInfo]);

  const ensureReceiverTracks = useCallback(
    (userId?: string) => {
      const pc = pcRef.current;
      if (!pc) return;
      const isScreenShareActive =
        useCallStore.getState().isScreenSharing || useCallStore.getState().isRemoteScreenSharing;

      // When screen sharing, ensure receivers have any previous script transforms cleared
      // so hardware decoding delivers uncorrupted 60 FPS video
      if (isScreenShareActive) {
        pc.getReceivers().forEach((r) => {
          if (r.track && r.track.kind === 'video') {
            if ('transform' in r) {
              try {
                (r as { transform?: unknown }).transform = null;
              } catch {}
            }
          }
        });
      }

      const streamId = userId || 'remote';
      const receivers = pc.getReceivers();

      const audioTracks = receivers
        .map((r) => r.track)
        .filter((t): t is MediaStreamTrack =>
          Boolean(t && t.kind === 'audio' && t.readyState !== 'ended'),
        );

      const videoReceivers = receivers.filter(
        (r): r is RTCRtpReceiver & { track: MediaStreamTrack } =>
          Boolean(r.track && r.track.kind === 'video' && r.track.readyState !== 'ended'),
      );

      // CRITICAL: When screen sharing or when multiple video transceivers exist (dummy transceiver + screen share),
      // we MUST prioritize the unmuted active video track (which is decoding live RTP frames).
      // Placing dead/dummy video tracks into the stream causes HTMLVideoElement to render pure black.
      const activeVideoReceiver =
        videoReceivers.find((r) => !r.track.muted && r.track.readyState === 'live') ||
        videoReceivers.find((r) => r.track.readyState === 'live') ||
        (videoReceivers.length > 0 ? videoReceivers[videoReceivers.length - 1] : null);

      const activeVideoTrack = activeVideoReceiver?.track || null;
      if (activeVideoTrack) {
        activeVideoTrack.enabled = true;
      }

      const activeReceiverTracks: MediaStreamTrack[] = [
        ...audioTracks,
        ...(activeVideoTrack ? [activeVideoTrack] : []),
      ];

      if (activeReceiverTracks.length > 0) {
        const stream = new MediaStream(activeReceiverTracks);
        setRemoteStream(streamId, stream);
        if (userId && userId !== streamId) {
          setRemoteStream(userId, new MediaStream(activeReceiverTracks));
        }
        setRemoteStream('remote', new MediaStream(activeReceiverTracks));
      }

      receivers.forEach((r) => {
        if (r.track) {
          r.track.enabled = true;
          const handleTrackEvent = () => {
            // Re-sync on unmute/mute/ended to dynamically update the active video track in Zustand
            ensureReceiverTracksRef.current?.(userId);
          };
          r.track.onunmute = handleTrackEvent;
          r.track.onmute = handleTrackEvent;
          r.track.onended = handleTrackEvent;
        }
      });
    },
    [setRemoteStream],
  );
  ensureReceiverTracksRef.current = ensureReceiverTracks;

  const handleRemoteIceRestart = useCallback(
    async (
      offer: RTCSessionDescriptionInit,
      senderUserId?: string,
    ): Promise<RTCSessionDescriptionInit> => {
      const pc = pcRef.current;
      if (!pc || pc.signalingState === 'closed') {
        throw new Error('PeerConnection not active during ICE restart');
      }

      // Handle glare / unexpected offer collision
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') {
        try {
          await pc.setLocalDescription({ type: 'rollback' });
        } catch {
          // Ignore rollback failure if not supported
        }
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // CRITICAL: Ensure local video transceivers are set to 'recvonly' if not already sendrecv
      // so createAnswer() generates a=recvonly instead of a=inactive, allowing video RTP packets to flow!
      if (typeof pc.getTransceivers === 'function') {
        pc.getTransceivers().forEach((t) => {
          if (t.receiver.track.kind === 'video' && t.direction !== 'sendrecv') {
            t.direction = 'recvonly';
          }
        });
      }

      const answer = await pc.createAnswer();

      if (pc.signalingState === 'have-remote-offer') {
        await pc.setLocalDescription(answer);
      }

      // Collect all receiver tracks and ensure they are populated in remoteStreams
      ensureReceiverTracks(senderUserId);
      if (senderUserId) {
        ensureReceiverTracks();
      }

      return answer;
    },
    [ensureReceiverTracks],
  );

  const handleIceRestartAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit): Promise<void> => {
      const pc = pcRef.current;
      if (!pc || pc.signalingState === 'stable') return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      // Flush queued candidates
      while (queuedCandidatesRef.current.length > 0) {
        const candidate = queuedCandidatesRef.current.shift();
        if (candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
      }

      ensureReceiverTracks();
    },
    [ensureReceiverTracks],
  );

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit): Promise<void> => {
    const pc = pcRef.current;
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    } else {
      queuedCandidatesRef.current.push(candidate);
    }
  }, []);

  const toggleMuteTrack = useCallback(
    (mute: boolean) => {
      if (!mute) {
        callAudioPipelineRef.current?.resume();
      }

      const currentInputVol = useCallStore.getState().inputVolume;
      const shouldBeEnabled = !mute && currentInputVol > 0;

      // 0. Update LocalAudioPipeline software gate
      callAudioPipelineRef.current?.setGateOpen(shouldBeEnabled, 0);

      // 1. Mute localStream in Zustand store
      const storeStream = useCallStore.getState().localStream;
      storeStream?.getAudioTracks().forEach((track) => {
        track.enabled = shouldBeEnabled;
      });

      // 2. Mute raw hardware microphone stream
      rawStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = shouldBeEnabled;
      });

      const procTrack = callAudioPipelineRef.current?.getProcessedTrack();
      if (procTrack) {
        procTrack.enabled = shouldBeEnabled;
      }

      // 3. Directly mute all active audio senders on the RTCPeerConnection
      const pc = pcRef.current;
      if (pc) {
        pc.getSenders().forEach((sender) => {
          if (sender.track && sender.track.kind === 'audio') {
            sender.track.enabled = shouldBeEnabled;
          }
        });
      }

      if (!shouldBeEnabled) {
        setLocalIsSpeaking(false);
      }
    },
    [setLocalIsSpeaking],
  );

  const toggleVideoTrack = useCallback(
    async (videoOff: boolean): Promise<boolean> => {
      const pc = pcRef.current;
      const currentStream = useCallStore.getState().localStream;

      if (videoOff) {
        // Turning camera OFF:
        // 1. Disable and stop all camera video tracks so hardware webcam turns off
        currentStream?.getVideoTracks().forEach((track) => {
          track.enabled = false;
          try {
            track.stop();
          } catch {}
        });
        rawStreamRef.current?.getVideoTracks().forEach((track) => {
          track.enabled = false;
          try {
            track.stop();
          } catch {}
        });

        // 2. Remove video track from localStream in store
        if (currentStream) {
          const audioOnlyTracks = currentStream.getAudioTracks();
          setLocalStream(new MediaStream(audioOnlyTracks));
        }

        // 3. Clear video sender on RTCPeerConnection
        if (pc) {
          const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (videoSender) {
            await videoSender.replaceTrack(null);
          }
          // Renegotiate so remote peer knows video stopped
          void triggerIceRestart();
        }
        return true;
      } else {
        // Turning camera ON:
        try {
          const constraints: MediaStreamConstraints = {
            audio: false,
            video: selectedVideoInput
              ? {
                  deviceId: { exact: selectedVideoInput },
                  width: { ideal: 1280, max: 1920 },
                  height: { ideal: 720, max: 1080 },
                  frameRate: { ideal: 30, max: 30 },
                }
              : {
                  width: { ideal: 1280, max: 1920 },
                  height: { ideal: 720, max: 1080 },
                  frameRate: { ideal: 30, max: 30 },
                },
          };

          const cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
          const cameraTrack = cameraStream.getVideoTracks()[0];
          if (!cameraTrack) {
            throw new Error('No video track returned from camera');
          }

          cameraTrack.enabled = true;

          // Keep rawStreamRef updated
          if (rawStreamRef.current) {
            rawStreamRef.current.getVideoTracks().forEach((t) => {
              try {
                t.stop();
              } catch {}
              rawStreamRef.current?.removeTrack(t);
            });
            rawStreamRef.current.addTrack(cameraTrack);
          }

          // Attach to localStream in Zustand store
          const existingAudioTracks = currentStream ? currentStream.getAudioTracks() : [];
          const newLocalStream = new MediaStream([...existingAudioTracks, cameraTrack]);
          setLocalStream(newLocalStream);

          // Attach or replace track on RTCPeerConnection
          if (pc) {
            const videoTransceiver =
              typeof pc.getTransceivers === 'function'
                ? pc.getTransceivers().find((t) => t.receiver.track.kind === 'video')
                : null;
            const videoSender =
              videoTransceiver?.sender ||
              pc
                .getSenders()
                .find(
                  (s) => s.track?.kind === 'video' || (!s.track && videoTransceiver?.sender === s),
                );

            if (videoSender) {
              await videoSender.replaceTrack(cameraTrack);
              if (videoTransceiver) {
                videoTransceiver.direction = 'sendrecv';
              }
            } else {
              pc.addTrack(cameraTrack, newLocalStream);
            }

            // Prioritize audio traffic over video (like Discord / Google Meet)
            try {
              const sender =
                videoSender || pc.getSenders().find((s) => s.track?.id === cameraTrack.id);
              if (sender) {
                const params = sender.getParameters();
                if (!params.encodings || params.encodings.length === 0) {
                  params.encodings = [{}];
                }
                for (const enc of params.encodings) {
                  enc.active = true;
                  enc.maxBitrate = 2_500_000;
                  enc.maxFramerate = 30;
                  (enc as { priority?: string; networkPriority?: string }).priority = 'low';
                  (enc as { priority?: string; networkPriority?: string }).networkPriority = 'low';
                }
                params.degradationPreference = 'balanced';
                await sender.setParameters(params);
              }
            } catch {}

            // Ensure audio senders always retain high network priority
            try {
              const audioSender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
              if (audioSender) {
                const aParams = audioSender.getParameters();
                if (aParams.encodings && aParams.encodings.length > 0) {
                  (
                    aParams.encodings[0] as { priority?: string; networkPriority?: string }
                  ).priority = 'high';
                  (
                    aParams.encodings[0] as { priority?: string; networkPriority?: string }
                  ).networkPriority = 'high';
                  await audioSender.setParameters(aParams);
                }
              }
            } catch {}

            // Renegotiate track with peer so remote side receives camera video
            void triggerIceRestart();
          }

          return true;
        } catch (err) {
          console.error('[toggleVideoTrack] Failed to acquire camera:', err);
          return false;
        }
      }
    },
    [selectedVideoInput, setLocalStream, triggerIceRestart],
  );

  const stopScreenShare = useCallback(async (): Promise<void> => {
    const { screenShareStream } = useCallStore.getState();
    if (screenShareStream) {
      screenShareStream.getTracks().forEach((t) => t.stop());
      setScreenShareStream(null);
    }
    setIsScreenAudioSharing(false);

    const pc = pcRef.current;
    if (pc) {
      const videoTransceiver =
        typeof pc.getTransceivers === 'function'
          ? pc.getTransceivers().find((t) => t.receiver.track.kind === 'video')
          : null;
      const videoSender =
        videoTransceiver?.sender ||
        pc.getSenders().find((s) => s.track && s.track.kind === 'video');

      if (videoSender) {
        const restoreTrack = originalVideoTrackRef.current || null;
        await videoSender.replaceTrack(restoreTrack);
        if (!restoreTrack && videoTransceiver) {
          videoTransceiver.direction = 'sendrecv';
        }
        originalVideoTrackRef.current = null;
      }

      // Restore original microphone audio track if screen audio was mixed
      if (originalAudioTrackRef.current) {
        const audioSender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
        if (audioSender) {
          await audioSender.replaceTrack(originalAudioTrackRef.current);
        }
        originalAudioTrackRef.current = null;
      }
    }

    if (audioMixerRef.current) {
      audioMixerRef.current.stop();
      audioMixerRef.current = null;
    }

    setIsScreenSharing(false);
    onScreenShareStopped?.();
    void triggerIceRestart();
  }, [
    setScreenShareStream,
    setIsScreenSharing,
    setIsScreenAudioSharing,
    onScreenShareStopped,
    triggerIceRestart,
  ]);

  const startScreenShare = useCallback(async (): Promise<MediaStream> => {
    let screenStream: MediaStream;
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 60, max: 60 },
        },
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });
    } catch {
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { ideal: 60, max: 60 },
          },
          audio: true,
        });
      } catch {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
      }
    }

    const screenTrack = screenStream.getVideoTracks()[0];
    const screenAudioTrack = screenStream.getAudioTracks()[0];
    if (screenTrack) {
      screenTrack.enabled = true;
      if ('contentHint' in screenTrack) {
        screenTrack.contentHint = 'motion';
      }
      try {
        await screenTrack.applyConstraints({
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
        });
      } catch {
        // Advisory
      }
    }

    const pc = pcRef.current;
    if (pc && screenTrack) {
      const videoTransceiver =
        typeof pc.getTransceivers === 'function'
          ? pc.getTransceivers().find((t) => t.receiver.track.kind === 'video')
          : null;
      const videoSender =
        videoTransceiver?.sender ||
        pc.getSenders().find((s) => s.track && s.track.kind === 'video');

      if (videoSender) {
        if (
          !originalVideoTrackRef.current &&
          videoSender.track &&
          videoSender.track !== screenTrack
        ) {
          originalVideoTrackRef.current = videoSender.track;
        }
        if (videoTransceiver) {
          videoTransceiver.direction = 'sendrecv';
        }
        if (
          typeof pc.getTransceivers === 'function' &&
          typeof RTCRtpReceiver.getCapabilities === 'function'
        ) {
          try {
            const capabilities = RTCRtpReceiver.getCapabilities('video');
            if (capabilities?.codecs) {
              const vp8Codecs = capabilities.codecs.filter(
                (c) => c.mimeType.toLowerCase() === 'video/vp8',
              );
              const otherCodecs = capabilities.codecs.filter(
                (c) => c.mimeType.toLowerCase() !== 'video/vp8',
              );
              pc.getTransceivers().forEach((t) => {
                if (
                  t.receiver.track.kind === 'video' &&
                  typeof t.setCodecPreferences === 'function'
                ) {
                  try {
                    t.setCodecPreferences([...vp8Codecs, ...otherCodecs]);
                  } catch {}
                }
              });
            }
          } catch {}
        }
        await videoSender.replaceTrack(screenTrack);

        try {
          const params = videoSender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          for (const enc of params.encodings) {
            enc.active = true;
            enc.maxBitrate = 8_000_000; // 8 Mbps for pristine 1080p60 Discord quality
            enc.maxFramerate = 60;
            enc.scaleResolutionDownBy = 1.0;
          }
          params.degradationPreference = 'maintain-framerate';
          await videoSender.setParameters(params);
        } catch (e) {
          console.warn('[ScreenShare] setParameters failed:', e);
        }

        // Screen share streams must bypass application-layer transform to prevent frame corruption
        if ('transform' in videoSender) {
          try {
            (videoSender as { transform?: unknown }).transform = null;
          } catch {}
        }
      } else {
        const newSender = pc.addTrack(screenTrack, screenStream);
        try {
          const params = newSender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          for (const enc of params.encodings) {
            enc.active = true;
            enc.maxBitrate = 8_000_000;
            enc.maxFramerate = 60;
            enc.scaleResolutionDownBy = 1.0;
          }
          params.degradationPreference = 'maintain-framerate';
          await newSender.setParameters(params);
        } catch (e) {
          console.warn('[ScreenShare] setParameters on newSender failed:', e);
        }
      }

      // CRITICAL: Set screen share active in Zustand BEFORE renegotiating SDP
      // so triggerIceRestart / triggerRenegotiation recognizes that screen sharing is active!
      setScreenShareStream(screenStream);
      setIsScreenSharing(true);

      // CRITICAL: Renegotiate SDP when screen share starts so the remote peer
      // updates its video transceiver direction to sendrecv and begins receiving video RTP packets
      void triggerIceRestart();
    }

    // If system / tab audio is captured, mix it with current mic track
    if (pc && screenAudioTrack) {
      const audioSender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
      if (audioSender && audioSender.track) {
        if (!originalAudioTrackRef.current) {
          originalAudioTrackRef.current = audioSender.track;
        }
        const mixer = new AudioMixer(audioSender.track, screenAudioTrack);
        audioMixerRef.current = mixer;
        const mixedTrack = mixer.getMixedTrack();
        if (mixedTrack) {
          await audioSender.replaceTrack(mixedTrack);
          setIsScreenAudioSharing(true);
        }
      }
    }

    screenTrack.onended = () => {
      void stopScreenShare();
    };

    setScreenShareStream(screenStream);
    setIsScreenSharing(true);
    return screenStream;
  }, [
    setScreenShareStream,
    setIsScreenSharing,
    setIsScreenAudioSharing,
    stopScreenShare,
    triggerIceRestart,
  ]);

  const sendP2PFile = useCallback(async (file: File): Promise<string> => {
    if (!p2pFileManagerRef.current) {
      throw new Error('P2P File Transfer channel is not initialized');
    }
    return p2pFileManagerRef.current.sendFile(file);
  }, []);

  const cancelP2PTransfer = useCallback((id: string): void => {
    p2pFileManagerRef.current?.cancelTransfer(id);
  }, []);

  const registerVideoTile = useCallback((userId: string, el: HTMLElement): void => {
    adaptiveMeshRef.current?.registerElement(userId, el);
  }, []);

  const unregisterVideoTile = useCallback((userId: string): void => {
    adaptiveMeshRef.current?.unregisterElement(userId);
  }, []);

  const closeConnection = useCallback(() => {
    stopReconnectingChime();
    if (reconnectCountdownTimerRef.current) {
      clearInterval(reconnectCountdownTimerRef.current);
      reconnectCountdownTimerRef.current = null;
    }
    setIsReconnecting(false);

    if (iceRestartTimerRef.current) {
      clearTimeout(iceRestartTimerRef.current);
      iceRestartTimerRef.current = null;
    }
    if (bandwidthAdapterRef.current) {
      bandwidthAdapterRef.current.stop();
      bandwidthAdapterRef.current = null;
    }
    if (denoisedHandleRef.current) {
      denoisedHandleRef.current.destroy();
      denoisedHandleRef.current = null;
    }
    if (audioMixerRef.current) {
      audioMixerRef.current.stop();
      audioMixerRef.current = null;
    }
    if (callAudioPipelineRef.current) {
      callAudioPipelineRef.current.destroy();
      callAudioPipelineRef.current = null;
    }
    spatialAudioRef.current?.destroy();
    spatialAudioRef.current = null;
    p2pFileManagerRef.current?.destroy();
    p2pFileManagerRef.current = null;
    voiceFXProcessorRef.current?.destroy();
    voiceFXProcessorRef.current = null;
    adaptiveMeshRef.current?.destroy();
    adaptiveMeshRef.current = null;

    vadEngineRef.current?.destroy();
    vadEngineRef.current = null;
    remoteVadEngineRef.current?.destroy();
    remoteVadEngineRef.current = null;
    vbManagerRef.current?.destroy();
    vbManagerRef.current = null;
    void telemetryCollectorRef.current?.finalizeAndSend();
    telemetryCollectorRef.current = null;

    liveStatsCollectorRef.current?.destroy();
    liveStatsCollectorRef.current = null;
    gossipRelayRef.current?.destroy();
    gossipRelayRef.current = null;
    syncPlayEngineRef.current?.destroy();
    syncPlayEngineRef.current = null;
    whiteboardEngineRef.current?.destroy();
    whiteboardEngineRef.current = new WhiteboardCRDTEngine({
      userId: useAuthStore.getState().userId || undefined,
      userName: useAuthStore.getState().userId
        ? `User ${useAuthStore.getState().userId!.slice(0, 4)}`
        : 'You',
    });
    webCodecsManagerRef.current?.destroy();
    webCodecsManagerRef.current = new WebCodecsStreamManager(superResEngineRef.current!);
    peerRelayManagerRef.current?.destroy();
    peerRelayManagerRef.current = new P2PTurnRelayManager();

    headTrackerRef.current?.stop();
    headTrackerRef.current = null;
    webTransportClientRef.current?.disconnect();
    webTransportClientRef.current = null;
    chaosEngineRef.current?.destroy();

    if (rawStreamRef.current) {
      rawStreamRef.current.getTracks().forEach((t) => t.stop());
      rawStreamRef.current = null;
    }
    if (originalVideoTrackRef.current) {
      originalVideoTrackRef.current.stop();
      originalVideoTrackRef.current = null;
    }
    if (originalAudioTrackRef.current) {
      originalAudioTrackRef.current.stop();
      originalAudioTrackRef.current = null;
    }
    localStream?.getTracks().forEach((t) => t.stop());
    screenShareStream?.getTracks().forEach((t) => t.stop());
    Object.values(remoteStreams).forEach((s) => s.getTracks().forEach((t) => t.stop()));

    if (pcRef.current) {
      const pc = pcRef.current;
      try {
        pc.getSenders().forEach((s) => {
          try {
            s.track?.stop();
          } catch {
            // Ignored
          }
        });
        pc.getTransceivers().forEach((t) => {
          try {
            t.stop();
          } catch {
            // Ignored
          }
        });
      } catch {
        // Ignored
      }

      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.ondatachannel = null;
      pc.oniceconnectionstatechange = null;
      pc.onconnectionstatechange = null;
      pc.onsignalingstatechange = null;

      pc.close();
      pcRef.current = null;
    }

    binaryMuxRef.current.close();
    perfectNegotiationRef.current = null;
    queuedCandidatesRef.current = [];
    cryptoKeyRef.current = null;
    e2eeEphemeralRef.current = null;
    transformedSendersRef.current = new WeakSet();
    transformedReceiversRef.current = new WeakSet();
    terminateScriptTransformWorker();
    globalCallExternalStore.transition('ENDED');
    globalCallExternalStore.reset();
  }, [setIsReconnecting, localStream, screenShareStream, remoteStreams]);

  const resetPeerConnectionOnly = useCallback(() => {
    if (pcRef.current) {
      const pc = pcRef.current;
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.ondatachannel = null;
      pc.oniceconnectionstatechange = null;
      pc.onconnectionstatechange = null;
      pc.onsignalingstatechange = null;
      try {
        pc.close();
      } catch {
        // Ignored
      }
      pcRef.current = null;
    }
    queuedCandidatesRef.current = [];
    perfectNegotiationRef.current = null;
  }, []);

  // Traveler Mode / Eco-Mode: suspend incoming video track decoding and throttle Opus audio bitrate
  useEffect(() => {
    const pc = pcRef.current;
    if (!pc) return;

    pc.getReceivers().forEach((receiver: RTCRtpReceiver) => {
      if (receiver.track && receiver.track.kind === 'video') {
        receiver.track.enabled = !isTravelerModeEnabled;
      }
    });

    pc.getSenders().forEach((sender: RTCRtpSender) => {
      if (sender.track && sender.track.kind === 'audio') {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        params.encodings[0].maxBitrate = isTravelerModeEnabled ? 12_000 : 64_000;
        void sender.setParameters(params).catch(() => {});
      }
    });
  }, [isTravelerModeEnabled]);

  // Dynamic Frame Rate Scaler on Tab Visibility Changes (5 FPS background saver)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isHidden = typeof document !== 'undefined' && document.hidden;
      useCallStore.setState({ isTabHidden: isHidden });

      const pc = pcRef.current;
      if (!pc) return;

      pc.getSenders().forEach((sender: RTCRtpSender) => {
        if (sender.track && sender.track.kind === 'video') {
          try {
            const params = sender.getParameters();
            if (!params.encodings || params.encodings.length === 0) {
              params.encodings = [{}];
            }
            params.encodings[0].maxFramerate = isHidden ? 5 : 30;
            params.encodings[0].scaleResolutionDownBy = isHidden ? 2 : 1;
            void sender.setParameters(params).catch(() => {});
          } catch {
            // Browser may not support sender encoding parameter adjustments
          }
        }
      });
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, []);

  // Dynamic video input device switch via sender.replaceTrack
  const prevVideoInputRef = useRef(selectedVideoInput);
  useEffect(() => {
    if (prevVideoInputRef.current === selectedVideoInput) return;
    prevVideoInputRef.current = selectedVideoInput;

    const pc = pcRef.current;
    if (!pc || !localStream || pc.connectionState === 'closed') return;
    if (localStream.getVideoTracks().length === 0) return;

    const switchVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideoInput
            ? {
                deviceId: { exact: selectedVideoInput },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const newTrack = stream.getVideoTracks()[0];
        if (newTrack) {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(newTrack);
          }
          const oldTrack = localStream.getVideoTracks()[0];
          if (oldTrack) {
            oldTrack.stop();
            localStream.removeTrack(oldTrack);
          }
          localStream.addTrack(newTrack);
        }
      } catch (err) {
        console.warn('[useWebRTC] Dynamic video device switch failed:', err);
      }
    };
    void switchVideo();
  }, [selectedVideoInput, localStream]);

  // Dynamic audio input device switch via sender.replaceTrack (real-time microphone change)
  const prevAudioInputRef = useRef(selectedAudioInput);
  useEffect(() => {
    if (prevAudioInputRef.current === selectedAudioInput) return;
    prevAudioInputRef.current = selectedAudioInput;

    const pc = pcRef.current;
    if (!pc || !localStream || pc.connectionState === 'closed') return;
    if (localStream.getAudioTracks().length === 0) return;

    const switchAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: selectedAudioInput
            ? {
                deviceId: { exact: selectedAudioInput },
                echoCancellation: true,
                noiseSuppression: isNoiseSuppressionEnabled,
                autoGainControl: true,
              }
            : {
                echoCancellation: true,
                noiseSuppression: isNoiseSuppressionEnabled,
                autoGainControl: true,
              },
          video: false,
        });
        rawStreamRef.current = stream;

        if (callAudioPipelineRef.current) {
          callAudioPipelineRef.current.switchSourceStream(stream);
          const rawTrack = stream.getAudioTracks()[0];
          const isVoiceFXActive = Boolean(
            useCallStore.getState().voiceFX && useCallStore.getState().voiceFX !== 'none',
          );
          const targetTrack = isVoiceFXActive
            ? callAudioPipelineRef.current.getProcessedTrack()
            : rawTrack;
          const shouldEnable = useCallStore.getState().isPTTEnabled
            ? useCallStore.getState().isPTTActive
            : !useCallStore.getState().isMuted;
          if (targetTrack) {
            targetTrack.enabled = shouldEnable;
          }

          const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
          if (sender && targetTrack) {
            await sender.replaceTrack(targetTrack);
          }
          const oldTrack = localStream.getAudioTracks()[0];
          if (oldTrack && oldTrack !== targetTrack) {
            oldTrack.stop();
            localStream.removeTrack(oldTrack);
            if (targetTrack) {
              localStream.addTrack(targetTrack);
            }
          }
        } else {
          const newTrack = stream.getAudioTracks()[0];
          if (newTrack) {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
            if (sender) {
              await sender.replaceTrack(newTrack);
            }
            const oldTrack = localStream.getAudioTracks()[0];
            if (oldTrack) {
              oldTrack.stop();
              localStream.removeTrack(oldTrack);
            }
            localStream.addTrack(newTrack);
          }
        }
      } catch (err) {
        console.warn('[useWebRTC] Dynamic audio device switch failed:', err);
      }
    };
    void switchAudio();
  }, [selectedAudioInput, localStream, isNoiseSuppressionEnabled]);

  // Dynamic audio output dispatching via setSinkId
  useEffect(() => {
    if (selectedAudioOutput && mobileHandlerRef.current) {
      void mobileHandlerRef.current.setAllAudioOutputs(selectedAudioOutput);
    }
  }, [selectedAudioOutput]);

  const sendReaction = useCallback((emoji: string) => {
    // 1. Spawn locally
    reactionEngineRef.current?.spawn(
      emoji,
      typeof window !== 'undefined' ? window.innerWidth : 800,
      typeof window !== 'undefined' ? window.innerHeight : 600,
    );

    const payload = JSON.stringify({
      type: 'EMOTE_REACTION',
      emoji,
      x: 0.3 + Math.random() * 0.4,
    });

    // 2. Broadcast via Zero-GC Binary DataChannel Multiplexer
    binaryMuxRef.current.sendFrame(MULTIPLEXED_STREAM_IDS.REACTION_EMOTES, payload);

    // 3. Fallback to legacy reaction channel if open
    if (reactionChannelRef.current && reactionChannelRef.current.readyState === 'open') {
      try {
        reactionChannelRef.current.send(payload);
      } catch {
        // DataChannel send error
      }
    }
  }, []);

  const broadcastSoundboard = useCallback(
    (sound: {
      soundId: string;
      name: string;
      emoji: string;
      audioData?: string;
      volume?: number;
      durationMs?: number;
    }) => {
      // 0. Ensure mic is unmuted if needed so outgoing track is active
      if (useCallStore.getState().isMuted) {
        useCallStore.getState().setIsMuted(false);
        toggleMuteTrack(false);
      }

      // 0. Ensure audio pipeline is active
      if (callAudioPipelineRef.current) {
        callAudioPipelineRef.current.resume();
      }

      // 1. Play locally in pure stereo (isPreview = true -> strictly outputs to local speakers, never into mic track)
      globalSoundboardEngine.play(sound.soundId, sound.audioData, sound.volume ?? 1.0, true);

      const currentUserId = useAuthStore.getState().userId || 'me';

      // 2. Trigger local visual feedback for both currentUserId and 'me' fallback
      useCallStore.getState().triggerSoundboardEvent({
        soundId: sound.soundId,
        name: sound.name,
        emoji: sound.emoji,
        senderUserId: currentUserId,
      });
      if (currentUserId !== 'me') {
        useCallStore.getState().triggerSoundboardEvent({
          soundId: sound.soundId,
          name: sound.name,
          emoji: sound.emoji,
          senderUserId: 'me',
        });
      }

      // 3. Activate green speaking indicator on sender
      useCallStore.getState().setLocalIsSpeaking(true);
      setTimeout(
        () => {
          useCallStore.getState().setLocalIsSpeaking(false);
        },
        Math.max(1500, sound.durationMs || 2000),
      );

      // 4. Broadcast play payload to remote peers via DataChannel and Socket
      const payload = JSON.stringify({
        type: 'SOUNDBOARD_PLAY',
        soundId: sound.soundId,
        name: sound.name,
        emoji: sound.emoji,
        durationMs: sound.durationMs || 2000,
        audioData: sound.audioData,
        volume: sound.volume ?? 1.0,
        senderUserId: currentUserId,
        timestamp: Date.now(),
      });

      if (binaryMuxRef.current) {
        binaryMuxRef.current.sendFrame(MULTIPLEXED_STREAM_IDS.SOUNDBOARD, payload);
      }
      if (reactionChannelRef.current && reactionChannelRef.current.readyState === 'open') {
        try {
          reactionChannelRef.current.send(payload);
        } catch {
          // DataChannel send error
        }
      }

      const activeCallId = useCallStore.getState().callId;
      const conversationId = useCallStore.getState().conversationId;
      try {
        const socket = getSocket();
        if (socket?.connected && (conversationId || activeCallId)) {
          socket.emit('soundboard:play', {
            conversationId: conversationId || activeCallId,
            soundId: sound.soundId,
            name: sound.name,
            emoji: sound.emoji,
            durationMs: sound.durationMs || 2000,
            audioData: sound.audioData,
            volume: sound.volume ?? 1.0,
            senderUserId: currentUserId,
            timestamp: Date.now(),
          });
        }
      } catch {
        // Socket emit error
      }
    },
    [],
  );

  const sendCallActivity = useCallback((activity: any) => {
    const currentUserId = useAuthStore.getState().userId || 'me';
    const payload = JSON.stringify({
      type: 'CALL_ACTIVITY',
      activity,
      senderUserId: currentUserId,
      timestamp: Date.now(),
    });
    if (binaryMuxRef.current) {
      binaryMuxRef.current.sendFrame(MULTIPLEXED_STREAM_IDS.ACTIVITY, payload);
    }
    if (reactionChannelRef.current && reactionChannelRef.current.readyState === 'open') {
      try {
        reactionChannelRef.current.send(payload);
      } catch {
        // DataChannel send error
      }
    }
  }, []);

  const unblockAutoplay = useCallback(async () => {
    globalSpeakerMixerManager.resumeAll();
    callAudioPipelineRef.current?.resume();
    return (await mobileHandlerRef.current?.unblockAutoplay()) ?? false;
  }, []);

  const registerMediaElement = useCallback((el: HTMLMediaElement) => {
    mobileHandlerRef.current?.registerMediaElement(el);
  }, []);

  const setTransceiverDirection = useCallback(
    (kind: 'audio' | 'video', direction: RTCRtpTransceiverDirection) => {
      return perfectNegotiationRef.current?.setTransceiverDirection(kind, direction) ?? false;
    },
    [],
  );

  const configureSVC = useCallback(async (options?: Partial<SVCOptions>) => {
    const pc = pcRef.current;
    if (!pc) return false;
    const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
    if (!videoSender) return false;
    return configureSenderSVC(videoSender, options);
  }, []);

  const switchSVCMode = useCallback(async (mode: SVCScalabilityMode, maxBitrate?: number) => {
    const pc = pcRef.current;
    if (!pc) return false;
    const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
    if (!videoSender) return false;
    return switchSVCScalabilityMode(videoSender, mode, maxBitrate);
  }, []);

  const setSVCLayers = useCallback(async (active: boolean) => {
    const pc = pcRef.current;
    if (!pc) return false;
    const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
    if (!videoSender) return false;
    return setSVCLayerActive(videoSender, active);
  }, []);

  return {
    pcRef,
    initPeerConnection,
    acquireLocalMedia,
    createOffer,
    handleOffer,
    handleAnswer,
    handleRemoteIceRestart,
    prepareE2eeOffer,
    acceptE2eeOffer,
    completeE2eeHandshake,
    confirmE2eeSasMatch,
    handleIceRestartAnswer,
    triggerIceRestart,
    addIceCandidate,
    toggleMuteTrack,
    toggleVideoTrack,
    startScreenShare,
    stopScreenShare,
    ensureReceiverTracks,
    sendP2PFile,
    cancelP2PTransfer,
    registerVideoTile,
    unregisterVideoTile,
    closeConnection,
    resetPeerConnectionOnly,
    sendReaction,
    broadcastSoundboard,
    sendCallActivity,
    reactionEngine: reactionEngineRef.current,
    syncPlayEngine: syncPlayEngineRef.current,
    whiteboardEngine: whiteboardEngineRef.current,
    superResEngine: superResEngineRef.current,
    webCodecsManager: webCodecsManagerRef.current,
    peerRelayManager: peerRelayManagerRef.current,
    gossipRelay: gossipRelayRef.current,
    headTracker: headTrackerRef.current,
    webTransportClient: webTransportClientRef.current,
    chaosEngine: chaosEngineRef.current,
    mobileHandler: mobileHandlerRef.current,
    unblockAutoplay,
    registerMediaElement,
    binaryMux: binaryMuxRef.current,
    perfectNegotiation: perfectNegotiationRef.current,
    setTransceiverDirection,
    configureSVC,
    switchSVCMode,
    setSVCLayers,
    resumeAudioContext: () => {
      callAudioPipelineRef.current?.resume();
      globalSpeakerMixerManager.resumeAll();
    },
    callExternalStore: globalCallExternalStore,
  };
}
