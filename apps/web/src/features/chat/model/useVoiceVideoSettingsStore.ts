import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCallStore } from './callStore';

export type InputProfileType = 'isolation' | 'studio' | 'custom';
export type NoiseSuppressionType = 'krisp' | 'standard' | 'off';
export type VirtualBackgroundType =
  | 'none'
  | 'blur'
  | 'custom'
  | 'neon-smoke'
  | 'synthwave-grid'
  | 'cosmic-aurora'
  | 'cyber'
  | 'office'
  | 'nature'
  | 'space';

export interface CustomBackgroundItem {
  id: string;
  name: string;
  url: string;
}

export interface VoiceVideoSettingsState {
  // Device IDs
  selectedAudioInput: string;
  selectedAudioOutput: string;
  selectedVideoInput: string;

  // Audio Levels
  inputVolume: number; // 0 - 100
  outputVolume: number; // 0 - 100

  // Input Profile
  inputProfile: InputProfileType;

  // Voice Processing
  autoSensitivity: boolean;
  sensitivityThreshold: number; // dB (-80 to -20)
  noiseSuppression: NoiseSuppressionType;
  echoCancellation: boolean;
  autoGainControl: boolean;

  // Push-to-Talk (PTT)
  isPTTEnabled: boolean;
  pttKey: string; // e.g. 'KeyV', 'Space'
  pttKeyLabel: string; // e.g. 'V', 'Пробел'
  pttReleaseTailMs: number; // 100 - 600 ms
  isPTTSoundEnabled: boolean;
  isPTTActive: boolean;

  // Mic Test & Feedback Protection
  isHearSelfEnabled: boolean;

  // Video Settings
  isMirrorVideo: boolean;
  virtualBackground: VirtualBackgroundType;
  customBackgroundUrl: string | null;
  customBackgrounds: CustomBackgroundItem[];
  alwaysPreviewVideo: boolean;
  showStreamPreview: boolean;

  // Advanced Voice & Audio Controls
  showAdvancedVoice: boolean;
  disableAudioProcessing: boolean;
  reverbSuppression: boolean;
  duckingEnabled: boolean;
  duckingStrength: number; // 0 - 100
  spatialAudio: boolean;
  voiceFX: 'none' | 'robot' | 'radio' | 'deep' | 'cosmic';
  isHeadTrackingEnabled: boolean;

  // Video & Codec Enhancements
  preferredVideoCodec: 'av1' | 'vp9' | 'h264' | 'vp8';
  webGpuSuperResMode: 'off' | 'cas' | 'fsr_2x' | 'neural_4k';
  isWebCodecsEnabled: boolean;

  // Network & Privacy Modes
  isGhostMode: boolean;
  isSatelliteModeEnabled: boolean;
  isTravelerModeEnabled: boolean;
  isSynestheticVisualizerEnabled: boolean;
  isVisualRingingEnabled: boolean;
  isVoiceCommandsEnabled: boolean;
  isWebGLGridEnabled: boolean;

  // Audio Warnings
  warnNoAudioInput: boolean;
  warnMutedSpeaking: boolean;
  streamOverlay: boolean;

  // Actions
  setSelectedAudioInput: (id: string) => void;
  setSelectedAudioOutput: (id: string) => void;
  setSelectedVideoInput: (id: string) => void;
  setInputVolume: (vol: number) => void;
  setOutputVolume: (vol: number) => void;
  setInputProfile: (profile: InputProfileType) => void;
  setAutoSensitivity: (auto: boolean) => void;
  setSensitivityThreshold: (db: number) => void;
  setNoiseSuppression: (mode: NoiseSuppressionType) => void;
  setEchoCancellation: (enabled: boolean) => void;
  setAutoGainControl: (enabled: boolean) => void;
  setIsPTTEnabled: (enabled: boolean) => void;
  setPttKey: (code: string, label: string) => void;
  setPttReleaseTailMs: (ms: number) => void;
  setIsPTTSoundEnabled: (enabled: boolean) => void;
  setIsPTTActive: (active: boolean) => void;
  setIsHearSelfEnabled: (enabled: boolean) => void;
  setIsMirrorVideo: (enabled: boolean) => void;
  setVirtualBackground: (bg: VirtualBackgroundType) => void;
  setCustomBackgroundUrl: (url: string | null) => void;
  addCustomBackground: (item: CustomBackgroundItem) => void;
  removeCustomBackground: (id: string) => void;
  setAlwaysPreviewVideo: (enabled: boolean) => void;
  setShowAdvancedVoice: (show: boolean) => void;
  setDisableAudioProcessing: (disabled: boolean) => void;
  setReverbSuppression: (enabled: boolean) => void;
  setDuckingEnabled: (enabled: boolean) => void;
  setDuckingStrength: (strength: number) => void;
  setSpatialAudio: (enabled: boolean) => void;
  setVoiceFX: (fx: 'none' | 'robot' | 'radio' | 'deep' | 'cosmic') => void;
  setIsHeadTrackingEnabled: (enabled: boolean) => void;
  setPreferredVideoCodec: (codec: 'av1' | 'vp9' | 'h264' | 'vp8') => void;
  setWebGpuSuperResMode: (mode: 'off' | 'cas' | 'fsr_2x' | 'neural_4k') => void;
  setIsWebCodecsEnabled: (enabled: boolean) => void;
  setIsGhostMode: (enabled: boolean) => void;
  setIsSatelliteModeEnabled: (enabled: boolean) => void;
  setIsTravelerModeEnabled: (enabled: boolean) => void;
  setIsSynestheticVisualizerEnabled: (enabled: boolean) => void;
  setIsVisualRingingEnabled: (enabled: boolean) => void;
  setIsVoiceCommandsEnabled: (enabled: boolean) => void;
  setIsWebGLGridEnabled: (enabled: boolean) => void;
  setWarnNoAudioInput: (enabled: boolean) => void;
  setWarnMutedSpeaking: (enabled: boolean) => void;
  setShowStreamPreview: (enabled: boolean) => void;
  setStreamOverlay: (enabled: boolean) => void;
  resetAllSettings: () => void;
}

function syncToCallStore(partial: Partial<VoiceVideoSettingsState>) {
  try {
    const callStoreState: Record<string, any> = {};
    if (partial.selectedAudioInput !== undefined)
      callStoreState.selectedAudioInput = partial.selectedAudioInput;
    if (partial.selectedAudioOutput !== undefined)
      callStoreState.selectedAudioOutput = partial.selectedAudioOutput;
    if (partial.selectedVideoInput !== undefined)
      callStoreState.selectedVideoInput = partial.selectedVideoInput;
    if (partial.inputVolume !== undefined) {
      callStoreState.inputVolume = partial.inputVolume;
      if (partial.inputVolume === 0) callStoreState.localIsSpeaking = false;
    }
    if (partial.pttKey !== undefined) callStoreState.pttKey = partial.pttKey;
    if (partial.virtualBackground !== undefined) {
      callStoreState.virtualBackground =
        partial.virtualBackground === 'custom' ? 'none' : partial.virtualBackground;
    }
    if (partial.noiseSuppression !== undefined) {
      callStoreState.isNoiseSuppressionEnabled = partial.noiseSuppression !== 'off';
    }
    if (partial.autoSensitivity !== undefined)
      callStoreState.isVADEnabled = partial.autoSensitivity;
    if (partial.sensitivityThreshold !== undefined)
      callStoreState.noiseGateThreshold = partial.sensitivityThreshold;
    if (partial.isPTTEnabled !== undefined) callStoreState.isPTTEnabled = partial.isPTTEnabled;
    if (partial.spatialAudio !== undefined)
      callStoreState.isSpatialAudioEnabled = partial.spatialAudio;
    if (partial.duckingEnabled !== undefined)
      callStoreState.isSidechainDuckingEnabled = partial.duckingEnabled;
    if (partial.pttReleaseTailMs !== undefined)
      callStoreState.pttReleaseTailMs = partial.pttReleaseTailMs;
    if (partial.isPTTSoundEnabled !== undefined)
      callStoreState.isPTTSoundEnabled = partial.isPTTSoundEnabled;
    if (partial.isMirrorVideo !== undefined) callStoreState.isMirrorVideo = partial.isMirrorVideo;
    if (partial.warnNoAudioInput !== undefined)
      callStoreState.warnNoAudioInput = partial.warnNoAudioInput;
    if (partial.warnMutedSpeaking !== undefined)
      callStoreState.warnMutedSpeaking = partial.warnMutedSpeaking;
    if (partial.showStreamPreview !== undefined)
      callStoreState.showStreamPreview = partial.showStreamPreview;

    // Advanced & video call settings sync
    if (partial.voiceFX !== undefined) callStoreState.voiceFX = partial.voiceFX;
    if (partial.isHeadTrackingEnabled !== undefined)
      callStoreState.isHeadTrackingEnabled = partial.isHeadTrackingEnabled;
    if (partial.preferredVideoCodec !== undefined)
      callStoreState.preferredVideoCodec = partial.preferredVideoCodec;
    if (partial.webGpuSuperResMode !== undefined)
      callStoreState.webGpuSuperResMode = partial.webGpuSuperResMode;
    if (partial.isWebCodecsEnabled !== undefined)
      callStoreState.isWebCodecsEnabled = partial.isWebCodecsEnabled;
    if (partial.isGhostMode !== undefined) callStoreState.isGhostMode = partial.isGhostMode;
    if (partial.isSatelliteModeEnabled !== undefined)
      callStoreState.isSatelliteModeEnabled = partial.isSatelliteModeEnabled;
    if (partial.isTravelerModeEnabled !== undefined)
      callStoreState.isTravelerModeEnabled = partial.isTravelerModeEnabled;
    if (partial.isSynestheticVisualizerEnabled !== undefined)
      callStoreState.isSynestheticVisualizerEnabled = partial.isSynestheticVisualizerEnabled;
    if (partial.isVisualRingingEnabled !== undefined)
      callStoreState.isVisualRingingEnabled = partial.isVisualRingingEnabled;
    if (partial.isVoiceCommandsEnabled !== undefined)
      callStoreState.isVoiceCommandsEnabled = partial.isVoiceCommandsEnabled;
    if (partial.isWebGLGridEnabled !== undefined)
      callStoreState.isWebGLGridEnabled = partial.isWebGLGridEnabled;

    if (Object.keys(callStoreState).length > 0) {
      useCallStore.setState(callStoreState);
    }
  } catch {
    // Non-blocking in test environment
  }
}

const DEFAULT_VOICE_VIDEO_SETTINGS: Omit<
  VoiceVideoSettingsState,
  | 'setSelectedAudioInput'
  | 'setSelectedAudioOutput'
  | 'setSelectedVideoInput'
  | 'setInputVolume'
  | 'setOutputVolume'
  | 'setInputProfile'
  | 'setAutoSensitivity'
  | 'setSensitivityThreshold'
  | 'setNoiseSuppression'
  | 'setEchoCancellation'
  | 'setAutoGainControl'
  | 'setIsPTTEnabled'
  | 'setPttKey'
  | 'setPttReleaseTailMs'
  | 'setIsPTTSoundEnabled'
  | 'setIsPTTActive'
  | 'setIsHearSelfEnabled'
  | 'setIsMirrorVideo'
  | 'setVirtualBackground'
  | 'setCustomBackgroundUrl'
  | 'addCustomBackground'
  | 'removeCustomBackground'
  | 'setAlwaysPreviewVideo'
  | 'setShowAdvancedVoice'
  | 'setDisableAudioProcessing'
  | 'setReverbSuppression'
  | 'setDuckingEnabled'
  | 'setDuckingStrength'
  | 'setSpatialAudio'
  | 'setVoiceFX'
  | 'setIsHeadTrackingEnabled'
  | 'setPreferredVideoCodec'
  | 'setWebGpuSuperResMode'
  | 'setIsWebCodecsEnabled'
  | 'setIsGhostMode'
  | 'setIsSatelliteModeEnabled'
  | 'setIsTravelerModeEnabled'
  | 'setIsSynestheticVisualizerEnabled'
  | 'setIsVisualRingingEnabled'
  | 'setIsVoiceCommandsEnabled'
  | 'setIsWebGLGridEnabled'
  | 'setWarnNoAudioInput'
  | 'setWarnMutedSpeaking'
  | 'setShowStreamPreview'
  | 'setStreamOverlay'
  | 'resetAllSettings'
> = {
  selectedAudioInput: '',
  selectedAudioOutput: '',
  selectedVideoInput: '',

  inputVolume: 100,
  outputVolume: 100,

  inputProfile: 'isolation',

  autoSensitivity: true,
  sensitivityThreshold: -45,
  noiseSuppression: 'krisp',
  echoCancellation: true,
  autoGainControl: true,

  isPTTEnabled: false,
  pttKey: 'KeyV',
  pttKeyLabel: 'V',
  pttReleaseTailMs: 200,
  isPTTSoundEnabled: true,
  isPTTActive: false,

  isHearSelfEnabled: false,

  isMirrorVideo: true,
  virtualBackground: 'none',
  customBackgroundUrl: null,
  customBackgrounds: [],
  alwaysPreviewVideo: false,
  showStreamPreview: false,

  showAdvancedVoice: false,
  disableAudioProcessing: false,
  reverbSuppression: true,
  duckingEnabled: false,
  duckingStrength: 75,
  spatialAudio: false,
  voiceFX: 'none',
  isHeadTrackingEnabled: false,

  preferredVideoCodec: 'h264',
  webGpuSuperResMode: 'off',
  isWebCodecsEnabled: false,

  isGhostMode: false,
  isSatelliteModeEnabled: false,
  isTravelerModeEnabled: false,
  isSynestheticVisualizerEnabled: false,
  isVisualRingingEnabled: false,
  isVoiceCommandsEnabled: false,
  isWebGLGridEnabled: true,

  warnNoAudioInput: true,
  warnMutedSpeaking: true,
  streamOverlay: false,
};

export const useVoiceVideoSettingsStore = create<VoiceVideoSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_VOICE_VIDEO_SETTINGS,

      setSelectedAudioInput: (selectedAudioInput) => {
        set({ selectedAudioInput });
        syncToCallStore({ selectedAudioInput });
      },
      setSelectedAudioOutput: (selectedAudioOutput) => {
        set({ selectedAudioOutput });
        syncToCallStore({ selectedAudioOutput });
      },
      setSelectedVideoInput: (selectedVideoInput) => {
        set({ selectedVideoInput });
        syncToCallStore({ selectedVideoInput });
      },
      setInputVolume: (inputVolume) => {
        set({ inputVolume });
        syncToCallStore({ inputVolume });
      },
      setOutputVolume: (outputVolume) => set({ outputVolume }),

      setInputProfile: (inputProfile) => {
        if (inputProfile === 'isolation') {
          set({
            inputProfile: 'isolation',
            noiseSuppression: 'krisp',
            echoCancellation: true,
            autoGainControl: true,
            autoSensitivity: true,
            disableAudioProcessing: false,
          });
          syncToCallStore({
            noiseSuppression: 'krisp',
            autoSensitivity: true,
          });
        } else if (inputProfile === 'studio') {
          set({
            inputProfile: 'studio',
            noiseSuppression: 'off',
            echoCancellation: false,
            autoGainControl: false,
            autoSensitivity: false,
            disableAudioProcessing: true,
          });
          syncToCallStore({
            noiseSuppression: 'off',
            autoSensitivity: false,
          });
        } else {
          set({ inputProfile: 'custom' });
        }
      },

      setAutoSensitivity: (autoSensitivity) => {
        set({ autoSensitivity });
        syncToCallStore({ autoSensitivity });
      },
      setSensitivityThreshold: (sensitivityThreshold) => {
        set({ sensitivityThreshold });
        syncToCallStore({ sensitivityThreshold });
      },
      setNoiseSuppression: (noiseSuppression) => {
        set({ noiseSuppression });
        syncToCallStore({ noiseSuppression });
      },
      setEchoCancellation: (echoCancellation) => set({ echoCancellation }),
      setAutoGainControl: (autoGainControl) => set({ autoGainControl }),

      setIsPTTEnabled: (isPTTEnabled) => {
        set({ isPTTEnabled, isPTTActive: false });
        syncToCallStore({ isPTTEnabled });
        try {
          useCallStore.setState({
            isPTTEnabled,
            isPTTActive: false,
            isMuted: isPTTEnabled ? true : useCallStore.getState().isMuted,
          });
        } catch {
          // Safe
        }
      },
      setPttKey: (pttKey, pttKeyLabel) => {
        set({ pttKey, pttKeyLabel });
        syncToCallStore({ pttKey });
      },
      setPttReleaseTailMs: (pttReleaseTailMs) => {
        set({ pttReleaseTailMs });
        syncToCallStore({ pttReleaseTailMs });
      },
      setIsPTTSoundEnabled: (isPTTSoundEnabled) => {
        set({ isPTTSoundEnabled });
        syncToCallStore({ isPTTSoundEnabled });
      },
      setIsPTTActive: (isPTTActive) => {
        set({ isPTTActive });
        try {
          useCallStore.setState({ isPTTActive });
        } catch {
          // Safe
        }
      },

      setIsHearSelfEnabled: (isHearSelfEnabled) => set({ isHearSelfEnabled }),
      setIsMirrorVideo: (isMirrorVideo) => {
        set({ isMirrorVideo });
        syncToCallStore({ isMirrorVideo });
      },

      setVirtualBackground: (virtualBackground) => {
        set({ virtualBackground });
        syncToCallStore({ virtualBackground });
      },
      setCustomBackgroundUrl: (customBackgroundUrl) => set({ customBackgroundUrl }),
      addCustomBackground: (item) =>
        set((state) => ({ customBackgrounds: [item, ...state.customBackgrounds] })),
      removeCustomBackground: (id) =>
        set((state) => ({
          customBackgrounds: state.customBackgrounds.filter((bg) => bg.id !== id),
          customBackgroundUrl: state.customBackgroundUrl === id ? null : state.customBackgroundUrl,
          virtualBackground:
            state.virtualBackground === 'custom' && state.customBackgroundUrl === id
              ? 'none'
              : state.virtualBackground,
        })),

      setAlwaysPreviewVideo: (alwaysPreviewVideo) => set({ alwaysPreviewVideo }),
      setShowAdvancedVoice: (showAdvancedVoice) => set({ showAdvancedVoice }),
      setDisableAudioProcessing: (disableAudioProcessing) => set({ disableAudioProcessing }),
      setReverbSuppression: (reverbSuppression) => set({ reverbSuppression }),
      setDuckingEnabled: (duckingEnabled) => {
        set({ duckingEnabled });
        syncToCallStore({ duckingEnabled });
      },
      setDuckingStrength: (duckingStrength) => set({ duckingStrength }),
      setSpatialAudio: (spatialAudio) => {
        set({ spatialAudio });
        syncToCallStore({ spatialAudio });
      },
      setVoiceFX: (voiceFX) => {
        set({ voiceFX });
        syncToCallStore({ voiceFX });
      },
      setIsHeadTrackingEnabled: (isHeadTrackingEnabled) => {
        set({ isHeadTrackingEnabled });
        syncToCallStore({ isHeadTrackingEnabled });
      },
      setPreferredVideoCodec: (preferredVideoCodec) => {
        set({ preferredVideoCodec });
        syncToCallStore({ preferredVideoCodec });
      },
      setWebGpuSuperResMode: (webGpuSuperResMode) => {
        set({ webGpuSuperResMode });
        syncToCallStore({ webGpuSuperResMode });
      },
      setIsWebCodecsEnabled: (isWebCodecsEnabled) => {
        set({ isWebCodecsEnabled });
        syncToCallStore({ isWebCodecsEnabled });
      },
      setIsGhostMode: (isGhostMode) => {
        set({ isGhostMode });
        syncToCallStore({ isGhostMode });
      },
      setIsSatelliteModeEnabled: (isSatelliteModeEnabled) => {
        set({ isSatelliteModeEnabled });
        syncToCallStore({ isSatelliteModeEnabled });
      },
      setIsTravelerModeEnabled: (isTravelerModeEnabled) => {
        set({ isTravelerModeEnabled });
        syncToCallStore({ isTravelerModeEnabled });
      },
      setIsSynestheticVisualizerEnabled: (isSynestheticVisualizerEnabled) => {
        set({ isSynestheticVisualizerEnabled });
        syncToCallStore({ isSynestheticVisualizerEnabled });
      },
      setIsVisualRingingEnabled: (isVisualRingingEnabled) => {
        set({ isVisualRingingEnabled });
        syncToCallStore({ isVisualRingingEnabled });
      },
      setIsVoiceCommandsEnabled: (isVoiceCommandsEnabled) => {
        set({ isVoiceCommandsEnabled });
        syncToCallStore({ isVoiceCommandsEnabled });
      },
      setIsWebGLGridEnabled: (isWebGLGridEnabled) => {
        set({ isWebGLGridEnabled });
        syncToCallStore({ isWebGLGridEnabled });
      },
      setWarnNoAudioInput: (warnNoAudioInput) => {
        set({ warnNoAudioInput });
        syncToCallStore({ warnNoAudioInput });
      },
      setWarnMutedSpeaking: (warnMutedSpeaking) => {
        set({ warnMutedSpeaking });
        syncToCallStore({ warnMutedSpeaking });
      },
      setShowStreamPreview: (showStreamPreview) => {
        set({ showStreamPreview });
        syncToCallStore({ showStreamPreview });
      },
      setStreamOverlay: (streamOverlay) => set({ streamOverlay }),
      resetAllSettings: () => {
        set(DEFAULT_VOICE_VIDEO_SETTINGS);
        syncToCallStore(DEFAULT_VOICE_VIDEO_SETTINGS);
      },
    }),
    {
      name: 'voice-video-settings-v2',
      partialize: (state) => ({
        selectedAudioInput: state.selectedAudioInput,
        selectedAudioOutput: state.selectedAudioOutput,
        selectedVideoInput: state.selectedVideoInput,
        inputVolume: state.inputVolume,
        outputVolume: state.outputVolume,
        inputProfile: state.inputProfile,
        autoSensitivity: state.autoSensitivity,
        sensitivityThreshold: state.sensitivityThreshold,
        noiseSuppression: state.noiseSuppression,
        echoCancellation: state.echoCancellation,
        autoGainControl: state.autoGainControl,
        isPTTEnabled: state.isPTTEnabled,
        pttKey: state.pttKey,
        pttKeyLabel: state.pttKeyLabel,
        pttReleaseTailMs: state.pttReleaseTailMs,
        isPTTSoundEnabled: state.isPTTSoundEnabled,
        isMirrorVideo: state.isMirrorVideo,
        virtualBackground: state.virtualBackground,
        customBackgroundUrl: state.customBackgroundUrl,
        customBackgrounds: state.customBackgrounds,
        alwaysPreviewVideo: state.alwaysPreviewVideo,
        showStreamPreview: state.showStreamPreview,
        showAdvancedVoice: state.showAdvancedVoice,
        disableAudioProcessing: state.disableAudioProcessing,
        reverbSuppression: state.reverbSuppression,
        duckingEnabled: state.duckingEnabled,
        duckingStrength: state.duckingStrength,
        spatialAudio: state.spatialAudio,
        voiceFX: state.voiceFX,
        isHeadTrackingEnabled: state.isHeadTrackingEnabled,
        preferredVideoCodec: state.preferredVideoCodec,
        webGpuSuperResMode: state.webGpuSuperResMode,
        isWebCodecsEnabled: state.isWebCodecsEnabled,
        isGhostMode: state.isGhostMode,
        isSatelliteModeEnabled: state.isSatelliteModeEnabled,
        isTravelerModeEnabled: state.isTravelerModeEnabled,
        isSynestheticVisualizerEnabled: state.isSynestheticVisualizerEnabled,
        isVisualRingingEnabled: state.isVisualRingingEnabled,
        isVoiceCommandsEnabled: state.isVoiceCommandsEnabled,
        isWebGLGridEnabled: state.isWebGLGridEnabled,
        warnNoAudioInput: state.warnNoAudioInput,
        warnMutedSpeaking: state.warnMutedSpeaking,
        streamOverlay: state.streamOverlay,
      }),
    },
  ),
);
