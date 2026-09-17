import { create } from 'zustand';
import { registerSessionResetHandler } from '@/shared/model/resetSession';
import type { CallSessionView, UserSnapshot, ZkpCallProof } from '@common/contracts';
import type { FileTransferItem } from '../lib/webrtc/p2pFileTransfer';
import type { VoiceFXMode } from '../lib/webrtc/voiceFX';
import type { VideoCodecPreference } from '../lib/webrtc/sdpMunger';
import type { LiveConnectionStats } from '../lib/webrtc/statsCollector';
import type { SuperResMode } from '../lib/webrtc/customVideoPipeline';
import { type ChaosConfig, type ChaosPreset, CHAOS_PRESETS } from '../lib/webrtc/chaosEngine';

export interface IncomingCallData {
  callId: string;
  callerId: string;
  caller: UserSnapshot;
  conversationId: string;
  callType: 'audio' | 'video';
  sdpOffer?: unknown;
  iceCandidates?: unknown[];
  zkpProof?: ZkpCallProof | null;
  isGhostMode?: boolean;
  /** Initiator ephemeral ECDH public (SPKI b64) for the E2EE handshake. */
  e2eeEphemeralKey?: string;
  /** Identity signature over the ephemeral key (TOFU verification). */
  e2eeBindingSignature?: string;
}

export interface AvailableDevices {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'disconnected';

export interface CallNetworkStats {
  packetLoss: number;
  rtt: number;
  jitter: number;
  bitrate: number;
  quality: 'good' | 'fair' | 'poor';
  isSatellite?: boolean;
  baselineRtt?: number;
  delayGradient?: number;
}

export interface CallStoreState {
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  callType: 'audio' | 'video';
  callId: string | null;
  conversationId: string | null;
  activeCall: CallSessionView | null;
  incomingCall: IncomingCallData | null;
  remoteParticipant: UserSnapshot | null;

  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  screenShareStream: MediaStream | null;

  isMuted: boolean;
  isDeafened: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isPiP: boolean;
  isSettingsOpen: boolean;
  connectionQuality: ConnectionQuality;
  durationSec: number;

  // AI Noise Suppression (RNNoise WASM)
  isNoiseSuppressionEnabled: boolean;

  // Insertable Streams E2EE & SAS Emojis
  e2eeStatus: 'verified' | 'unverified' | 'unsupported' | 'disabled';
  e2eeFingerprint: string;
  sasCode: string;
  sasEmojis: string | null;

  // Virtual Background & Blur
  virtualBackground: 'none' | 'blur' | 'office' | 'cyber' | 'nature';

  // Voice Activity Detection & Noise Gate (Discord style)
  isVADEnabled: boolean;
  noiseGateThreshold: number; // dB, e.g. -45
  localIsSpeaking: boolean;
  remoteIsSpeaking: boolean;
  currentAudioLevel: number; // 0-100

  // Screen Share with Audio & Sidechain Ducking
  isScreenAudioSharing: boolean;
  isSidechainDuckingEnabled: boolean;

  // Spatial Audio / 3D-Sound (Disabled by default)
  isSpatialAudioEnabled: boolean;

  // Voice Modifiers (Voice FX)
  voiceFX: VoiceFXMode;

  // Reconnection Grace Period UI
  isReconnecting: boolean;
  reconnectCountdown: number;
  reconnectRestored: boolean;

  // P2P Direct File Transfers via DataChannel
  fileTransfers: Record<string, FileTransferItem>;
  isFileTransferOpen: boolean;

  // Preferred Video Codec (SDP Munging)
  preferredVideoCodec: VideoCodecPreference;

  // Discord-Style Live Stream Stats HUD
  isStatsHUDOpen: boolean;
  liveStats: LiveConnectionStats | null;

  // Frame-Accurate SyncPlay (Watch Together)
  isSyncPlayOpen: boolean;
  syncPlayDriftMs: number;
  syncPlayRttMs: number;

  // CRDT Interactive Whiteboard
  isWhiteboardOpen: boolean;
  isWhiteboardOverlay: boolean;

  // WebGPU Super-Resolution & WebCodecs
  webGpuSuperResMode: SuperResMode;
  isWebCodecsEnabled: boolean;

  // Zero-Knowledge Proof (ZKP) Identity & Ghost Mode
  isGhostMode: boolean;
  zkpProof: ZkpCallProof | null;

  // P2P Hole Punching Mesh (Peer-as-a-TURN Relay)
  isPeerRelayActive: boolean;
  peerRelaySessionId: string | null;

  // Head Tracking 3D Spatial Audio
  isHeadTrackingEnabled: boolean;
  headAngles: { yaw: number; pitch: number; roll: number };

  // WebTransport (HTTP/3 QUIC) Signaling
  transportProtocol: 'quic' | 'websocket';
  quicStats: { datagramsSent: number; datagramsReceived: number; rttMs: number } | null;

  // Mobile Safari Autoplay Policy
  isAutoplayBlocked: boolean;

  // Chaos Engineering & P2P Lab
  chaosConfig: ChaosConfig;

  // Satellite & Extreme Network GCC (Starlink / Airplane Wi-Fi)
  isSatelliteModeEnabled: boolean;

  // Visual Ringing & Tactile Feedback (Deaf & Hard-of-Hearing Accessibility)
  isVisualRingingEnabled: boolean;

  // Push-to-Talk (PTT) with Audio Release Tail & Radio Chirps
  isPTTEnabled: boolean;
  isPTTActive: boolean;
  pttReleaseTailMs: number;
  isPTTSoundEnabled: boolean;

  // Traveler / Eco-Mode (Battery & Data Saver)
  isTravelerModeEnabled: boolean;

  // Dynamic Background Tab Visibility Throttle
  isTabHidden: boolean;

  // Synesthetic Audio Visualizer (A11Y Lip-Reading Border)
  isSynestheticVisualizerEnabled: boolean;

  // Voice-to-UI Hands-Free Command Engine
  isVoiceCommandsEnabled: boolean;

  // Automatic Audio-Only Fallback with Jitter Buffer Adaptation
  isAudioOnlyFallbackActive: boolean;
  audioOnlyFallbackReason: string | null;

  // Dominant Speaker Hysteresis Engine
  dominantSpeakerId: string | null;

  // WebGL Multi-Video Grid Virtualization
  isWebGLGridEnabled: boolean;

  // Tactile Vibration Feedback (Vibration API)
  isHapticsEnabled: boolean;

  // Document Picture-in-Picture (Interactive OS Floating Window)
  isDocumentPiP: boolean;

  // Live Screen Share Drawing & Annotations
  isScreenAnnotationActive: boolean;
  screenAnnotationTool: 'laser' | 'pen' | 'arrow';
  screenAnnotationColor: string;

  // Interactive Soundboard with Sidechain Ducking
  isSoundboardOpen: boolean;
  setIsSoundboardOpen: (open: boolean) => void;
  toggleSoundboard: () => void;

  // AI Live Summary («What did I miss?»)
  isLiveSummaryOpen: boolean;
  setIsLiveSummaryOpen: (open: boolean) => void;
  toggleLiveSummary: () => void;

  // Dual-Camera Mode
  isDualCameraOpen: boolean;
  setIsDualCameraOpen: (open: boolean) => void;
  toggleDualCamera: () => void;

  // 3D Gaussian Splatting Holographic Call Modal
  isHolographicCallOpen: boolean;
  setIsHolographicCallOpen: (open: boolean) => void;
  toggleHolographicCall: () => void;

  // Smart Bandwidth & Network Diagnostics
  networkStats: CallNetworkStats | null;

  availableDevices: AvailableDevices;
  selectedAudioInput: string;
  selectedVideoInput: string;
  selectedAudioOutput: string;

  // Setters & Actions
  setCallStatus: (status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended') => void;
  setIncomingCall: (incoming: IncomingCallData | null) => void;
  clearIncomingCall: () => void;
  setActiveCall: (call: CallSessionView | null, remoteParticipant?: UserSnapshot | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (userId: string, stream: MediaStream) => void;
  removeRemoteStream: (userId: string) => void;
  setScreenShareStream: (stream: MediaStream | null) => void;
  setIsMuted: (isMuted: boolean) => void;
  setIsDeafened: (isDeafened: boolean) => void;
  setIsVideoOff: (isVideoOff: boolean) => void;
  setIsScreenSharing: (isScreenSharing: boolean) => void;
  setIsPiP: (isPiP: boolean) => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setConnectionQuality: (quality: ConnectionQuality) => void;
  setDurationSec: (duration: number) => void;
  incrementDuration: () => void;
  setIsNoiseSuppressionEnabled: (enabled: boolean) => void;
  setE2EEInfo: (
    status: 'verified' | 'unverified' | 'unsupported' | 'disabled',
    fingerprint: string,
    sasCode: string,
    sasEmojis?: string | null,
  ) => void;
  setSasEmojis: (emojis: string | null) => void;
  setVirtualBackground: (bg: 'none' | 'blur' | 'office' | 'cyber' | 'nature') => void;
  setIsVADEnabled: (enabled: boolean) => void;
  setNoiseGateThreshold: (threshold: number) => void;
  setLocalIsSpeaking: (isSpeaking: boolean) => void;
  setRemoteIsSpeaking: (isSpeaking: boolean) => void;
  setCurrentAudioLevel: (level: number) => void;
  setIsScreenAudioSharing: (isSharing: boolean) => void;
  setIsSidechainDuckingEnabled: (enabled: boolean) => void;
  setIsSpatialAudioEnabled: (enabled: boolean) => void;
  setVoiceFX: (mode: VoiceFXMode) => void;
  setIsReconnecting: (isReconnecting: boolean) => void;
  setReconnectCountdown: (count: number) => void;
  setReconnectRestored: (restored: boolean) => void;
  upsertFileTransfer: (transfer: FileTransferItem) => void;
  removeFileTransfer: (id: string) => void;
  setIsFileTransferOpen: (open: boolean) => void;
  setNetworkStats: (stats: CallNetworkStats | null) => void;
  setAvailableDevices: (devices: AvailableDevices) => void;
  setSelectedAudioInput: (deviceId: string) => void;
  setSelectedVideoInput: (deviceId: string) => void;
  setSelectedAudioOutput: (deviceId: string) => void;
  setPreferredVideoCodec: (codec: VideoCodecPreference) => void;
  setIsStatsHUDOpen: (open: boolean) => void;
  toggleStatsHUD: () => void;
  setLiveStats: (stats: LiveConnectionStats | null) => void;
  setIsSyncPlayOpen: (open: boolean) => void;
  toggleSyncPlay: () => void;
  setSyncPlayMetrics: (driftMs: number, rttMs: number) => void;
  setIsWhiteboardOpen: (open: boolean) => void;
  toggleWhiteboard: () => void;
  setIsWhiteboardOverlay: (overlay: boolean) => void;
  setWebGpuSuperResMode: (mode: SuperResMode) => void;
  setIsWebCodecsEnabled: (enabled: boolean) => void;
  setIsGhostMode: (enabled: boolean) => void;
  setZkpProof: (proof: ZkpCallProof | null) => void;
  setIsPeerRelayActive: (active: boolean, sessionId?: string | null) => void;
  setIsHeadTrackingEnabled: (enabled: boolean) => void;
  setHeadAngles: (angles: { yaw: number; pitch: number; roll: number }) => void;
  setTransportProtocol: (protocol: 'quic' | 'websocket') => void;
  setQuicStats: (
    stats: { datagramsSent: number; datagramsReceived: number; rttMs: number } | null,
  ) => void;
  setIsAutoplayBlocked: (isBlocked: boolean) => void;
  setChaosConfig: (updates: Partial<ChaosConfig>) => void;
  setChaosPreset: (preset: ChaosPreset) => void;
  setIsSatelliteModeEnabled: (enabled: boolean) => void;
  setIsVisualRingingEnabled: (enabled: boolean) => void;
  setIsPTTEnabled: (enabled: boolean) => void;
  setIsPTTActive: (active: boolean) => void;
  setPttReleaseTailMs: (ms: number) => void;
  setIsPTTSoundEnabled: (enabled: boolean) => void;
  setIsTravelerModeEnabled: (enabled: boolean) => void;
  setIsTabHidden: (hidden: boolean) => void;
  setIsSynestheticVisualizerEnabled: (enabled: boolean) => void;
  setIsVoiceCommandsEnabled: (enabled: boolean) => void;
  setIsAudioOnlyFallbackActive: (active: boolean, reason?: string | null) => void;
  setDominantSpeakerId: (dominantSpeakerId: string | null) => void;
  setIsWebGLGridEnabled: (enabled: boolean) => void;
  setIsHapticsEnabled: (enabled: boolean) => void;
  setIsDocumentPiP: (isPiP: boolean) => void;
  setIsScreenAnnotationActive: (active: boolean) => void;
  setScreenAnnotationTool: (tool: 'laser' | 'pen' | 'arrow') => void;
  setScreenAnnotationColor: (color: string) => void;
  resetCall: () => void;
}

export const useCallStore = create<CallStoreState>((set) => ({
  callStatus: 'idle',
  callType: 'audio',
  callId: null,
  conversationId: null,
  activeCall: null,
  incomingCall: null,
  remoteParticipant: null,

  localStream: null,
  remoteStreams: {},
  screenShareStream: null,

  isMuted: false,
  isDeafened: false,
  isVideoOff: false,
  isScreenSharing: false,
  isPiP: false,
  isSettingsOpen: false,
  connectionQuality: 'excellent',
  durationSec: 0,

  isNoiseSuppressionEnabled: true,
  // No crypto has run at store init — never default to 'verified' (F2).
  e2eeStatus: 'disabled',
  e2eeFingerprint: '',
  sasCode: '',
  sasEmojis: null,

  virtualBackground: 'none',

  isVADEnabled: true,
  noiseGateThreshold: -45,
  localIsSpeaking: false,
  remoteIsSpeaking: false,
  currentAudioLevel: 0,
  isScreenAudioSharing: false,
  isSidechainDuckingEnabled: true,
  isSpatialAudioEnabled: false,
  voiceFX: 'none',
  isReconnecting: false,
  reconnectCountdown: 15,
  reconnectRestored: false,
  fileTransfers: {},
  isFileTransferOpen: false,

  preferredVideoCodec: 'av1',
  isStatsHUDOpen: false,
  liveStats: null,
  isSyncPlayOpen: false,
  syncPlayDriftMs: 0,
  syncPlayRttMs: 0,
  isWhiteboardOpen: false,
  isWhiteboardOverlay: false,

  webGpuSuperResMode: 'cas',
  isWebCodecsEnabled: false,
  isGhostMode: false,
  zkpProof: null,
  isPeerRelayActive: false,
  peerRelaySessionId: null,

  isHeadTrackingEnabled: false,
  headAngles: { yaw: 0, pitch: 0, roll: 0 },
  transportProtocol: 'websocket',
  quicStats: null,

  isAutoplayBlocked: false,
  chaosConfig: {
    preset: 'clean',
    packetLossRatio: 0,
    rttDelayMs: 0,
    jitterMs: 0,
    bandwidthLimitKbps: 0,
    isFlapping: false,
    flappingIntervalMs: 5000,
  },
  isSatelliteModeEnabled: false,
  isVisualRingingEnabled: true,
  isPTTEnabled: false,
  isPTTActive: false,
  pttReleaseTailMs: 250,
  isPTTSoundEnabled: true,
  isTravelerModeEnabled: false,
  isTabHidden: false,
  isSynestheticVisualizerEnabled: false,
  isVoiceCommandsEnabled: false,
  isAudioOnlyFallbackActive: false,
  audioOnlyFallbackReason: null,
  dominantSpeakerId: null,
  isWebGLGridEnabled: false,
  isHapticsEnabled: true,
  isDocumentPiP: false,
  isScreenAnnotationActive: false,
  screenAnnotationTool: 'laser',
  screenAnnotationColor: '#ef4444',

  isSoundboardOpen: false,
  isLiveSummaryOpen: false,
  isDualCameraOpen: false,
  isHolographicCallOpen: false,

  networkStats: null,

  availableDevices: {
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  },
  selectedAudioInput: '',
  selectedVideoInput: '',
  selectedAudioOutput: '',

  setCallStatus: (callStatus) => set({ callStatus }),
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  clearIncomingCall: () => set({ incomingCall: null }),
  setActiveCall: (activeCall, remoteParticipant) =>
    set((state) => ({
      activeCall,
      callId: activeCall?.id ?? state.callId,
      conversationId: activeCall?.conversationId ?? state.conversationId,
      callType: (activeCall?.type?.toLowerCase() as 'audio' | 'video') || state.callType,
      remoteParticipant:
        remoteParticipant !== undefined ? remoteParticipant : state.remoteParticipant,
    })),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (userId, stream) =>
    set((state) => ({
      remoteStreams: { ...state.remoteStreams, [userId]: stream },
    })),
  removeRemoteStream: (userId) =>
    set((state) => {
      const copy = { ...state.remoteStreams };
      delete copy[userId];
      return { remoteStreams: copy };
    }),
  setScreenShareStream: (screenShareStream) => set({ screenShareStream }),
  setIsMuted: (isMuted) => set({ isMuted }),
  setIsDeafened: (isDeafened) => set({ isDeafened }),
  setIsVideoOff: (isVideoOff) => set({ isVideoOff }),
  setIsScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  setIsPiP: (isPiP) => set({ isPiP }),
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setConnectionQuality: (connectionQuality) => set({ connectionQuality }),
  setDurationSec: (durationSec) => set({ durationSec }),
  incrementDuration: () => set((state) => ({ durationSec: state.durationSec + 1 })),
  setIsNoiseSuppressionEnabled: (isNoiseSuppressionEnabled) => set({ isNoiseSuppressionEnabled }),
  setE2EEInfo: (e2eeStatus, e2eeFingerprint, sasCode, sasEmojis) =>
    set((state) => ({
      e2eeStatus,
      e2eeFingerprint,
      sasCode,
      sasEmojis: sasEmojis !== undefined ? sasEmojis : state.sasEmojis,
    })),
  setSasEmojis: (sasEmojis) => set({ sasEmojis }),
  setVirtualBackground: (virtualBackground) => set({ virtualBackground }),
  setIsVADEnabled: (isVADEnabled) => set({ isVADEnabled }),
  setNoiseGateThreshold: (noiseGateThreshold) => set({ noiseGateThreshold }),
  setLocalIsSpeaking: (localIsSpeaking) => set({ localIsSpeaking }),
  setRemoteIsSpeaking: (remoteIsSpeaking) => set({ remoteIsSpeaking }),
  setCurrentAudioLevel: (currentAudioLevel) =>
    set((state) =>
      Math.abs(state.currentAudioLevel - currentAudioLevel) < 5 ? state : { currentAudioLevel },
    ),
  setIsScreenAudioSharing: (isScreenAudioSharing) => set({ isScreenAudioSharing }),
  setIsSidechainDuckingEnabled: (isSidechainDuckingEnabled) => set({ isSidechainDuckingEnabled }),
  setIsSpatialAudioEnabled: (isSpatialAudioEnabled) => set({ isSpatialAudioEnabled }),
  setVoiceFX: (voiceFX) => set({ voiceFX }),
  setIsReconnecting: (isReconnecting) => set({ isReconnecting }),
  setReconnectCountdown: (reconnectCountdown) => set({ reconnectCountdown }),
  setReconnectRestored: (reconnectRestored) => set({ reconnectRestored }),
  upsertFileTransfer: (transfer) =>
    set((state) => ({
      fileTransfers: { ...state.fileTransfers, [transfer.id]: transfer },
    })),
  removeFileTransfer: (id) =>
    set((state) => {
      const copy = { ...state.fileTransfers };
      delete copy[id];
      return { fileTransfers: copy };
    }),
  setIsFileTransferOpen: (isFileTransferOpen) => set({ isFileTransferOpen }),
  setNetworkStats: (networkStats) => set({ networkStats }),
  setAvailableDevices: (availableDevices) => set({ availableDevices }),
  setSelectedAudioInput: (selectedAudioInput) => set({ selectedAudioInput }),
  setSelectedVideoInput: (selectedVideoInput) => set({ selectedVideoInput }),
  setSelectedAudioOutput: (selectedAudioOutput) => set({ selectedAudioOutput }),
  setPreferredVideoCodec: (preferredVideoCodec) => set({ preferredVideoCodec }),
  setIsStatsHUDOpen: (isStatsHUDOpen) => set({ isStatsHUDOpen }),
  toggleStatsHUD: () => set((state) => ({ isStatsHUDOpen: !state.isStatsHUDOpen })),
  setLiveStats: (liveStats) => set({ liveStats }),
  setIsSyncPlayOpen: (isSyncPlayOpen) => set({ isSyncPlayOpen }),
  toggleSyncPlay: () => set((state) => ({ isSyncPlayOpen: !state.isSyncPlayOpen })),
  setSyncPlayMetrics: (syncPlayDriftMs, syncPlayRttMs) => set({ syncPlayDriftMs, syncPlayRttMs }),
  setIsWhiteboardOpen: (isWhiteboardOpen) => set({ isWhiteboardOpen }),
  toggleWhiteboard: () => set((state) => ({ isWhiteboardOpen: !state.isWhiteboardOpen })),
  setIsWhiteboardOverlay: (isWhiteboardOverlay) => set({ isWhiteboardOverlay }),
  setWebGpuSuperResMode: (webGpuSuperResMode) => set({ webGpuSuperResMode }),
  setIsWebCodecsEnabled: (isWebCodecsEnabled) => set({ isWebCodecsEnabled }),
  setIsGhostMode: (isGhostMode) => set({ isGhostMode }),
  setZkpProof: (zkpProof) => set({ zkpProof }),
  setIsPeerRelayActive: (isPeerRelayActive, peerRelaySessionId = null) =>
    set({ isPeerRelayActive, peerRelaySessionId }),
  setIsHeadTrackingEnabled: (isHeadTrackingEnabled) => set({ isHeadTrackingEnabled }),
  setHeadAngles: (headAngles) => set({ headAngles }),
  setTransportProtocol: (transportProtocol) => set({ transportProtocol }),
  setQuicStats: (quicStats) => set({ quicStats }),
  setIsAutoplayBlocked: (isAutoplayBlocked) => set({ isAutoplayBlocked }),
  setChaosConfig: (updates) =>
    set((state) => ({
      chaosConfig: {
        ...state.chaosConfig,
        ...updates,
        preset: updates.preset ?? 'custom',
      },
    })),
  setChaosPreset: (preset) =>
    set((state) => {
      const p = CHAOS_PRESETS[preset];
      return {
        chaosConfig: {
          ...state.chaosConfig,
          ...p,
          preset,
        },
      };
    }),
  setIsSatelliteModeEnabled: (isSatelliteModeEnabled) => set({ isSatelliteModeEnabled }),
  setIsVisualRingingEnabled: (isVisualRingingEnabled) => set({ isVisualRingingEnabled }),
  setIsPTTEnabled: (isPTTEnabled) => set({ isPTTEnabled }),
  setIsPTTActive: (isPTTActive) => set({ isPTTActive }),
  setPttReleaseTailMs: (pttReleaseTailMs) => set({ pttReleaseTailMs }),
  setIsPTTSoundEnabled: (isPTTSoundEnabled) => set({ isPTTSoundEnabled }),
  setIsTravelerModeEnabled: (isTravelerModeEnabled) => set({ isTravelerModeEnabled }),
  setIsTabHidden: (isTabHidden) => set({ isTabHidden }),
  setIsSynestheticVisualizerEnabled: (isSynestheticVisualizerEnabled) =>
    set({ isSynestheticVisualizerEnabled }),
  setIsVoiceCommandsEnabled: (isVoiceCommandsEnabled) => set({ isVoiceCommandsEnabled }),
  setIsAudioOnlyFallbackActive: (isAudioOnlyFallbackActive, audioOnlyFallbackReason = null) =>
    set({ isAudioOnlyFallbackActive, audioOnlyFallbackReason }),
  setDominantSpeakerId: (dominantSpeakerId) =>
    set((state) => (state.dominantSpeakerId === dominantSpeakerId ? state : { dominantSpeakerId })),
  setIsWebGLGridEnabled: (isWebGLGridEnabled) => set({ isWebGLGridEnabled }),
  setIsHapticsEnabled: (isHapticsEnabled) => set({ isHapticsEnabled }),
  setIsDocumentPiP: (isDocumentPiP) => set({ isDocumentPiP }),
  setIsScreenAnnotationActive: (isScreenAnnotationActive) => set({ isScreenAnnotationActive }),
  setScreenAnnotationTool: (screenAnnotationTool) => set({ screenAnnotationTool }),
  setScreenAnnotationColor: (screenAnnotationColor) => set({ screenAnnotationColor }),

  setIsSoundboardOpen: (isSoundboardOpen) => set({ isSoundboardOpen }),
  toggleSoundboard: () => set((state) => ({ isSoundboardOpen: !state.isSoundboardOpen })),

  setIsLiveSummaryOpen: (isLiveSummaryOpen) => set({ isLiveSummaryOpen }),
  toggleLiveSummary: () => set((state) => ({ isLiveSummaryOpen: !state.isLiveSummaryOpen })),

  setIsDualCameraOpen: (isDualCameraOpen) => set({ isDualCameraOpen }),
  toggleDualCamera: () => set((state) => ({ isDualCameraOpen: !state.isDualCameraOpen })),

  setIsHolographicCallOpen: (isHolographicCallOpen) => set({ isHolographicCallOpen }),
  toggleHolographicCall: () =>
    set((state) => ({ isHolographicCallOpen: !state.isHolographicCallOpen })),

  resetCall: () =>
    set((state) => {
      // Stop all tracks on streams
      state.localStream?.getTracks().forEach((t) => t.stop());
      state.screenShareStream?.getTracks().forEach((t) => t.stop());
      Object.values(state.remoteStreams).forEach((s) => s.getTracks().forEach((t) => t.stop()));

      return {
        callStatus: 'idle',
        callId: null,
        conversationId: null,
        activeCall: null,
        incomingCall: null,
        remoteParticipant: null,
        localStream: null,
        remoteStreams: {},
        screenShareStream: null,
        isMuted: false,
        isDeafened: false,
        isVideoOff: false,
        isScreenSharing: false,
        isPiP: false,
        isSettingsOpen: false,
        connectionQuality: 'excellent',
        durationSec: 0,
        networkStats: null,
        localIsSpeaking: false,
        remoteIsSpeaking: false,
        isScreenAudioSharing: false,
        isReconnecting: false,
        reconnectCountdown: 15,
        reconnectRestored: false,
        isFileTransferOpen: false,
        isStatsHUDOpen: false,
        liveStats: null,
        isSyncPlayOpen: false,
        syncPlayDriftMs: 0,
        syncPlayRttMs: 0,
        isWhiteboardOpen: false,
        isWhiteboardOverlay: false,
        isGhostMode: false,
        zkpProof: null,
        isPeerRelayActive: false,
        peerRelaySessionId: null,
        isHeadTrackingEnabled: false,
        headAngles: { yaw: 0, pitch: 0, roll: 0 },
        transportProtocol: 'websocket',
        quicStats: null,
        isAutoplayBlocked: false,
        isPTTActive: false,
        isTabHidden: false,
        isAudioOnlyFallbackActive: false,
        audioOnlyFallbackReason: null,
        dominantSpeakerId: null,
        isDocumentPiP: false,
        isScreenAnnotationActive: false,
        isSoundboardOpen: false,
        isLiveSummaryOpen: false,
        isDualCameraOpen: false,
        isHolographicCallOpen: false,
      };
    }),
}));

if (typeof window !== 'undefined') {
  (window as unknown as { __CALL_STORE__?: typeof useCallStore }).__CALL_STORE__ = useCallStore;
}

/**
 * RESET_STORES: end any live call on logout/switch. `resetCall` stops all
 * media tracks (mic/camera must never stay live across accounts) and
 * returns the slice to idle. Device prefs (codecs, FX, toggles) are kept.
 */
registerSessionResetHandler(() => {
  try {
    useCallStore.getState().resetCall();
  } catch {
    // ignore in tests
  }
});
