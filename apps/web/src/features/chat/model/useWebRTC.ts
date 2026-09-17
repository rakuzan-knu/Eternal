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
import { useAuthStore } from '@/shared/model/useAuthStore';

const DEFAULT_STUN = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export interface WebRTCOptions {
  onSendIceRestart?: (offer: RTCSessionDescriptionInit) => void;
  onConnectionFailed?: () => void;
}

export function useWebRTC(options: WebRTCOptions = {}) {
  const { onSendIceRestart, onConnectionFailed } = options;
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

  const setupMuxChannels = useCallback((mux: BinaryDataChannelMux) => {
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
  }, []);

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
    selectedVideoInput,
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

  // Update RNNoise state dynamically if toggled
  useEffect(() => {
    denoisedHandleRef.current?.setDenoiseEnabled(isNoiseSuppressionEnabled);
  }, [isNoiseSuppressionEnabled]);

  // Voice Activity Detection & Noise Gate for local microphone
  useEffect(() => {
    if (localStream && localStream.getAudioTracks().length > 0) {
      vadEngineRef.current?.destroy();
      vadEngineRef.current = new VADEngine(localStream, {
        thresholdDb: noiseGateThreshold,
        enabled: isVADEnabled,
        onSpeakingChange: (speaking) => {
          setLocalIsSpeaking(speaking);
        },
        onVolumeChange: (_db, percent) => {
          if (useCallStore.getState().isSettingsOpen) {
            setCurrentAudioLevel(percent);
          }
        },
      });
    }
    return () => {
      vadEngineRef.current?.destroy();
      vadEngineRef.current = null;
    };
  }, [localStream, isVADEnabled, noiseGateThreshold, setLocalIsSpeaking, setCurrentAudioLevel]);

  // VAD listener for incoming remote audio
  useEffect(() => {
    const remoteList = Object.values(remoteStreams);
    if (remoteList.length > 0 && remoteList[0].getAudioTracks().length > 0) {
      remoteVadEngineRef.current?.destroy();
      remoteVadEngineRef.current = new VADEngine(remoteList[0], {
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
    try {
      if (typeof pc.restartIce === 'function') {
        pc.restartIce();
      }
      const offer = await pc.createOffer({ iceRestart: true });
      const codecPref = useCallStore.getState().preferredVideoCodec;
      if (offer.sdp) {
        offer.sdp = mungeSDP(offer.sdp, codecPref);
      }
      await pc.setLocalDescription(offer);
      onSendIceRestart?.(offer);
    } catch (err) {
      console.warn('Auto ICE-restart negotiation failed', err);
    }
  }, [onSendIceRestart]);

  const attachE2eeToTransceivers = useCallback((pc: RTCPeerConnection, key: CryptoKey) => {
    for (const sender of pc.getSenders()) {
      if (sender.track && !transformedSendersRef.current.has(sender)) {
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
      if (receiver.track && !transformedReceiversRef.current.has(receiver)) {
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
        console.log('[ontrack] fired! track:', event.track?.kind, 'receiver:', !!event.receiver);
        if (event.streams && event.streams[0]) {
          const remoteStream = event.streams[0];
          const streamId = targetUserId || 'remote';

          // Attach RTCRtpScriptTransform / Insertable Streams receiver decryption if key exists and signaling is stable
          if (
            event.receiver &&
            !transformedReceiversRef.current.has(event.receiver) &&
            pc.signalingState === 'stable'
          ) {
            if (cryptoKeyRef.current) {
              console.log('[ontrack] attaching receiver script transform...');
              try {
                if (
                  attachReceiverScriptTransform(event.receiver, {
                    cryptoKey: cryptoKeyRef.current,
                  })
                ) {
                  transformedReceiversRef.current.add(event.receiver);
                }
                console.log('[ontrack] receiver script transform attached');
              } catch (e) {
                console.warn('[ontrack] attachReceiverScriptTransform error:', e);
              }
            }
          }

          console.log('[ontrack] scheduling remote stream in Zustand...');
          setTimeout(() => {
            setRemoteStream(streamId, remoteStream);
            console.log('[ontrack] setRemoteStream done');
          }, 0);
        }
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
              noiseSuppression: true,
            }
          : { echoCancellation: true, noiseSuppression: true },
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
        console.log(
          '[acquireLocalMedia] calling getUserMedia with constraints:',
          JSON.stringify(constraints),
        );
        rawStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log(
          '[acquireLocalMedia] getUserMedia succeeded! tracks:',
          rawStream.getTracks().map((t) => t.kind),
        );
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
            rawStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
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

      // Filter microphone audio through in-browser RNNoise Neural AudioWorklet
      let finalStream = rawStream;
      if (rawStream.getAudioTracks().length > 0) {
        try {
          console.log('[acquireLocalMedia] filtering via rnnoise...');
          const denoisedHandle = await rnnoiseManager.createDenoisedStream(
            rawStream,
            isNoiseSuppressionEnabled,
          );
          console.log('[acquireLocalMedia] rnnoise filtering finished!');
          denoisedHandleRef.current = denoisedHandle;

          const tracks = [...denoisedHandle.cleanStream.getAudioTracks()];
          if (rawStream.getVideoTracks().length > 0) {
            tracks.push(...rawStream.getVideoTracks());
          }
          finalStream = new MediaStream(tracks);
        } catch (denoiseErr) {
          console.warn('[acquireLocalMedia] rnnoise error, fallback to rawStream:', denoiseErr);
          finalStream = rawStream;
        }
      }

      console.log('[acquireLocalMedia] calling setLocalStream and returning finalStream...');
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
    const existingSenders = pc.getSenders();
    stream.getTracks().forEach((track) => {
      const alreadyAdded = existingSenders.some((s) => s.track?.id === track.id);
      if (!alreadyAdded) {
        const sender = pc.addTrack(track, stream);

        // Attach RTCRtpScriptTransform only if signaling is already stable (e.g. dynamic screen share track)
        // Initial tracks are attached right after setLocalDescription in handleOffer / completeE2eeHandshake
        if (cryptoKeyRef.current && sender && pc.signalingState === 'stable') {
          attachSenderScriptTransform(sender, {
            cryptoKey: cryptoKeyRef.current,
          });
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
        offerToReceiveVideo: callType === 'video',
      });
      const codecPref = useCallStore.getState().preferredVideoCodec;
      if (offer.sdp && callType === 'video') {
        offer.sdp = mungeSDP(offer.sdp, codecPref);
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
        const codecPref = useCallStore.getState().preferredVideoCodec;
        if (answer.sdp && type === 'video') {
          answer.sdp = mungeSDP(answer.sdp, codecPref);
        }
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

    if (pc.signalingState !== 'stable') {
      const codecPref = useCallStore.getState().preferredVideoCodec;
      if (answer.sdp) {
        answer.sdp = mungeSDP(answer.sdp, codecPref);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      // Flush queued candidates
      while (queuedCandidatesRef.current.length > 0) {
        const candidate = queuedCandidatesRef.current.shift();
        if (candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
      }
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

  const handleRemoteIceRestart = useCallback(
    async (offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> => {
      const pc = pcRef.current;
      if (!pc) throw new Error('PeerConnection not active during ICE restart');

      const codecPref = useCallStore.getState().preferredVideoCodec;
      if (offer.sdp) {
        offer.sdp = mungeSDP(offer.sdp, codecPref);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      if (answer.sdp) {
        answer.sdp = mungeSDP(answer.sdp, codecPref);
      }
      await pc.setLocalDescription(answer);
      return answer;
    },
    [],
  );

  const handleIceRestartAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit): Promise<void> => {
      const pc = pcRef.current;
      if (!pc || pc.signalingState === 'stable') return;
      const codecPref = useCallStore.getState().preferredVideoCodec;
      if (answer.sdp) {
        answer.sdp = mungeSDP(answer.sdp, codecPref);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    },
    [],
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
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = !mute;
        });
      }
    },
    [localStream],
  );

  const toggleVideoTrack = useCallback(
    (videoOff: boolean) => {
      if (localStream) {
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = !videoOff;
        });
      }
    },
    [localStream],
  );

  const stopScreenShare = useCallback(async (): Promise<void> => {
    const { screenShareStream } = useCallStore.getState();
    if (screenShareStream) {
      screenShareStream.getTracks().forEach((t) => t.stop());
      setScreenShareStream(null);
    }
    setIsScreenAudioSharing(false);

    const pc = pcRef.current;
    if (pc && originalVideoTrackRef.current) {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        await sender.replaceTrack(originalVideoTrackRef.current);
      }
      originalVideoTrackRef.current = null;
    }

    // Restore original microphone audio track if screen audio was mixed
    if (pc && originalAudioTrackRef.current) {
      const audioSender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
      if (audioSender) {
        await audioSender.replaceTrack(originalAudioTrackRef.current);
      }
      originalAudioTrackRef.current = null;
    }

    if (audioMixerRef.current) {
      audioMixerRef.current.stop();
      audioMixerRef.current = null;
    }

    setIsScreenSharing(false);
  }, [setScreenShareStream, setIsScreenSharing, setIsScreenAudioSharing]);

  const startScreenShare = useCallback(async (): Promise<MediaStream> => {
    let screenStream: MediaStream;
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });
    } catch {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
    }

    const screenTrack = screenStream.getVideoTracks()[0];
    const screenAudioTrack = screenStream.getAudioTracks()[0];
    const pc = pcRef.current;

    if (pc && screenTrack) {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        originalVideoTrackRef.current = sender.track;
        await sender.replaceTrack(screenTrack);
      } else {
        const newSender = pc.addTrack(screenTrack, screenStream);
        if (cryptoKeyRef.current && newSender) {
          attachSenderEncryption(newSender, cryptoKeyRef.current);
        }
      }
    }

    // If system / tab audio is captured, mix it with current mic track
    if (pc && screenAudioTrack) {
      const audioSender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
      if (audioSender && audioSender.track) {
        originalAudioTrackRef.current = audioSender.track;
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
  }, [setScreenShareStream, setIsScreenSharing, setIsScreenAudioSharing, stopScreenShare]);

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
    sendP2PFile,
    cancelP2PTransfer,
    registerVideoTile,
    unregisterVideoTile,
    closeConnection,
    sendReaction,
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
    unblockAutoplay: async () => {
      return (await mobileHandlerRef.current?.unblockAutoplay()) ?? false;
    },
    registerMediaElement: (el: HTMLMediaElement) => {
      mobileHandlerRef.current?.registerMediaElement(el);
    },
    binaryMux: binaryMuxRef.current,
    perfectNegotiation: perfectNegotiationRef.current,
    setTransceiverDirection: (kind: 'audio' | 'video', direction: RTCRtpTransceiverDirection) => {
      return perfectNegotiationRef.current?.setTransceiverDirection(kind, direction) ?? false;
    },
    configureSVC: async (options?: Partial<SVCOptions>) => {
      const pc = pcRef.current;
      if (!pc) return false;
      const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (!videoSender) return false;
      return configureSenderSVC(videoSender, options);
    },
    switchSVCMode: async (mode: SVCScalabilityMode, maxBitrate?: number) => {
      const pc = pcRef.current;
      if (!pc) return false;
      const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (!videoSender) return false;
      return switchSVCScalabilityMode(videoSender, mode, maxBitrate);
    },
    setSVCLayers: async (active: boolean) => {
      const pc = pcRef.current;
      if (!pc) return false;
      const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (!videoSender) return false;
      return setSVCLayerActive(videoSender, active);
    },
    callExternalStore: globalCallExternalStore,
  };
}
