import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Video,
  ChevronDown,
  AlertCircle,
  Headphones,
  Plus,
  Trash2,
  Ban,
  ImagePlus,
  Play,
  Sparkles,
  User,
  Radio,
  Sliders,
  Music,
  Mic2,
  Compass,
  Layers,
  Zap,
  Cpu,
} from 'lucide-react';
import { useVoiceVideoSettingsStore } from '@/features/chat/model/useVoiceVideoSettingsStore';
import { useCallStore } from '@/features/chat/model/callStore';
import { useMediaDevices } from '@/features/chat/model/useMediaDevices';
import { LocalAudioPipeline } from '@/features/chat/lib/webrtc/localAudioPipeline';
import { VirtualBackgroundManager } from '@/features/chat/lib/webrtc/virtualBackground';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { Select, SelectOption } from '@/shared/ui/Select';
import { Slider } from '@/shared/ui/Slider';
import { VoiceSoundsSection } from './VoiceSoundsSection';
import { VoiceAdvancedSection } from './VoiceAdvancedSection';

export interface VoiceVideoTabProps {
  onNavigateToNotifications?: () => void;
}

export default function VoiceVideoTab({ onNavigateToNotifications }: VoiceVideoTabProps = {}) {
  const accentColor = useThemeStore((s) => s.accentColor) || '#5865F2';
  const textOnAccent = useThemeStore((s) => s.textOnAccent) || '#ffffff';
  const headAngles = useCallStore((s) => s.headAngles);

  // Store state & actions
  const {
    selectedAudioInput,
    selectedAudioOutput,
    selectedVideoInput,
    inputVolume,
    outputVolume,
    inputProfile,
    autoSensitivity,
    sensitivityThreshold,
    noiseSuppression,
    echoCancellation,
    autoGainControl,
    isPTTEnabled,
    pttKey,
    pttKeyLabel,
    pttReleaseTailMs,
    isHearSelfEnabled,
    isMirrorVideo,
    virtualBackground,
    customBackgroundUrl,
    customBackgrounds,
    alwaysPreviewVideo,
    showAdvancedVoice,
    disableAudioProcessing,
    reverbSuppression,
    duckingEnabled,
    duckingStrength,
    spatialAudio,
    voiceFX,
    isHeadTrackingEnabled,
    preferredVideoCodec,
    webGpuSuperResMode,
    isWebCodecsEnabled,
    warnNoAudioInput,
    warnMutedSpeaking,
    showStreamPreview,
    setShowStreamPreview,

    setSelectedAudioInput,
    setSelectedAudioOutput,
    setSelectedVideoInput,
    setInputVolume,
    setOutputVolume,
    setInputProfile,
    setAutoSensitivity,
    setSensitivityThreshold,
    setNoiseSuppression,
    setEchoCancellation,
    setAutoGainControl,
    setIsPTTEnabled,
    setPttKey,
    setPttReleaseTailMs,
    setIsHearSelfEnabled,
    setIsMirrorVideo,
    setVirtualBackground,
    setCustomBackgroundUrl,
    addCustomBackground,
    removeCustomBackground,
    setAlwaysPreviewVideo,
    setShowAdvancedVoice,
    setDisableAudioProcessing,
    setReverbSuppression,
    setDuckingEnabled,
    setDuckingStrength,
    setSpatialAudio,
    setVoiceFX,
    setIsHeadTrackingEnabled,
    setPreferredVideoCodec,
    setWebGpuSuperResMode,
    setIsWebCodecsEnabled,
    setWarnNoAudioInput,
    setWarnMutedSpeaking,
  } = useVoiceVideoSettingsStore();

  // Hardware devices
  const { audioInputs, audioOutputs, videoInputs, hasPermissions, requestPermissions } =
    useMediaDevices();

  // Test state (Isolated from active call streams)
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0); // 0-100
  const [isRecordingPTTKey, setIsRecordingPTTKey] = useState(false);

  // Video preview state
  const [isVideoPreviewing, setIsVideoPreviewing] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [showAdvancedStream, setShowAdvancedStream] = useState(false);
  const [previewFps, setPreviewFps] = useState<number>(30);

  // References
  const testPipelineRef = useRef<LocalAudioPipeline | null>(null);
  const testRawStreamRef = useRef<MediaStream | null>(null);
  const testAudioElRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewRawStreamRef = useRef<MediaStream | null>(null);
  const previewVbManagerRef = useRef<VirtualBackgroundManager | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* -------------------------------------------------------------------------- */
  /*                            1. MIC TEST LIFECYCLE                           */
  /* -------------------------------------------------------------------------- */
  const stopMicTest = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (testAudioElRef.current) {
      testAudioElRef.current.pause();
      testAudioElRef.current.srcObject = null;
      testAudioElRef.current = null;
    }
    if (testPipelineRef.current) {
      testPipelineRef.current.destroy();
      testPipelineRef.current = null;
    }
    if (testRawStreamRef.current) {
      testRawStreamRef.current.getTracks().forEach((t) => t.stop());
      testRawStreamRef.current = null;
    }
    setIsMicTesting(false);
    setMicLevel(0);
  }, []);

  const startMicTest = useCallback(async () => {
    stopMicTest();

    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedAudioInput
          ? {
              deviceId: { exact: selectedAudioInput },
              echoCancellation,
              noiseSuppression: noiseSuppression !== 'off',
              autoGainControl,
            }
          : { echoCancellation, noiseSuppression: noiseSuppression !== 'off', autoGainControl },
        video: false,
      };

      const rawStream = await navigator.mediaDevices.getUserMedia(constraints);
      testRawStreamRef.current = rawStream;

      const pipeline = new LocalAudioPipeline(rawStream, {
        inputVolume,
        isDenoiseEnabled: noiseSuppression !== 'off',
        isGateOpen: true,
      });
      testPipelineRef.current = pipeline;

      const analyser = pipeline.getAnalyserNode();

      // Loopback monitor audio element with setSinkId
      if (isHearSelfEnabled) {
        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.srcObject = pipeline.getProcessedStream();
        audioEl.volume = Math.min(1.0, (outputVolume / 100) * 0.7);

        if (
          selectedAudioOutput &&
          typeof (audioEl as unknown as { setSinkId?: (id: string) => Promise<void> }).setSinkId ===
            'function'
        ) {
          void (audioEl as unknown as { setSinkId: (id: string) => Promise<void> })
            .setSinkId(selectedAudioOutput)
            .catch(() => {});
        }
        testAudioElRef.current = audioEl;
      }

      setIsMicTesting(true);

      // Real-time animation loop for LED meter & threshold
      if (analyser) {
        const buffer = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          if (!analyser || testPipelineRef.current !== pipeline) return;
          analyser.getByteFrequencyData(buffer);

          if (inputVolume === 0) {
            setMicLevel(0);
          } else {
            let sum = 0;
            for (let i = 0; i < buffer.length; i++) {
              sum += buffer[i];
            }
            const avg = sum / buffer.length;
            const normalized = Math.min(100, Math.round((avg / 64) * 100));
            setMicLevel(normalized);
          }

          animFrameRef.current = requestAnimationFrame(loop);
        };
        animFrameRef.current = requestAnimationFrame(loop);
      }
    } catch (err) {
      console.warn('[MicTest] failed to start microphone test:', err);
      stopMicTest();
    }
  }, [
    selectedAudioInput,
    selectedAudioOutput,
    echoCancellation,
    noiseSuppression,
    autoGainControl,
    inputVolume,
    outputVolume,
    isHearSelfEnabled,
    stopMicTest,
  ]);

  useEffect(() => {
    if (testPipelineRef.current) {
      testPipelineRef.current.setInputVolume(inputVolume);
      if (inputVolume === 0) {
        setMicLevel(0);
      }
    }
  }, [inputVolume]);

  useEffect(() => {
    if (isMicTesting) {
      void startMicTest();
    }
  }, [isHearSelfEnabled, selectedAudioOutput]);

  /* -------------------------------------------------------------------------- */
  /*                          2. VIDEO PREVIEW LIFECYCLE                         */
  /* -------------------------------------------------------------------------- */
  const stopVideoPreview = useCallback(() => {
    if (previewVbManagerRef.current) {
      previewVbManagerRef.current.destroy();
      previewVbManagerRef.current = null;
    }
    if (previewRawStreamRef.current) {
      previewRawStreamRef.current.getTracks().forEach((t) => t.stop());
      previewRawStreamRef.current = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.pause();
      previewVideoRef.current.srcObject = null;
    }
    setPreviewStream(null);
    setIsVideoPreviewing(false);
  }, []);

  const startVideoPreview = useCallback(async () => {
    stopVideoPreview();

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedVideoInput
          ? {
              deviceId: { exact: selectedVideoInput },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      let rawStream: MediaStream;
      try {
        rawStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        if (selectedVideoInput) {
          // Fallback to default camera if specific device constraint failed
          rawStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
        } else {
          throw err;
        }
      }
      previewRawStreamRef.current = rawStream;

      const videoTrack = rawStream.getVideoTracks()[0];
      let displayStream: MediaStream | null = null;
      if (videoTrack) {
        if (virtualBackground !== 'none') {
          const vb = new VirtualBackgroundManager(videoTrack);
          previewVbManagerRef.current = vb;

          if (virtualBackground === 'custom' && customBackgroundUrl) {
            vb.setCustomImage(customBackgroundUrl);
            vb.setMode('custom');
          } else {
            vb.setMode(virtualBackground as any);
          }

          const processedTrack = vb.getProcessedTrack();
          displayStream = new MediaStream([processedTrack]);
        } else {
          displayStream = rawStream;
        }
      }

      setPreviewStream(displayStream);
      if (previewVideoRef.current && displayStream) {
        previewVideoRef.current.srcObject = displayStream;
        void previewVideoRef.current.play().catch(() => {});
      }
      setIsVideoPreviewing(true);

      const settings = videoTrack?.getSettings();
      if (settings?.frameRate) {
        setPreviewFps(Math.round(settings.frameRate));
      }
    } catch (err) {
      console.warn('[VideoPreview] failed to start camera preview:', err);
      stopVideoPreview();
    }
  }, [selectedVideoInput, virtualBackground, customBackgroundUrl, stopVideoPreview]);

  // Dynamic preview stream update when virtual background changes
  useEffect(() => {
    if (!previewRawStreamRef.current || !isVideoPreviewing) return;
    const videoTrack = previewRawStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    if (virtualBackground === 'none') {
      if (previewVbManagerRef.current) {
        previewVbManagerRef.current.destroy();
        previewVbManagerRef.current = null;
      }
      const stream = previewRawStreamRef.current;
      setPreviewStream(stream);
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        void previewVideoRef.current.play().catch(() => {});
      }
    } else {
      if (!previewVbManagerRef.current) {
        previewVbManagerRef.current = new VirtualBackgroundManager(videoTrack);
      }
      if (virtualBackground === 'custom' && customBackgroundUrl) {
        previewVbManagerRef.current.setCustomImage(customBackgroundUrl);
        previewVbManagerRef.current.setMode('custom');
      } else {
        previewVbManagerRef.current.setMode(virtualBackground as any);
      }
      const processedTrack = previewVbManagerRef.current.getProcessedTrack();
      const stream = new MediaStream([processedTrack]);
      setPreviewStream(stream);
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        void previewVideoRef.current.play().catch(() => {});
      }
    }
  }, [virtualBackground, customBackgroundUrl, isVideoPreviewing]);

  useEffect(() => {
    if (previewVideoRef.current && previewStream) {
      if (previewVideoRef.current.srcObject !== previewStream) {
        previewVideoRef.current.srcObject = previewStream;
      }
      void previewVideoRef.current.play().catch(() => {});
    }
  }, [previewStream, isVideoPreviewing]);

  /* -------------------------------------------------------------------------- */
  /*             3. PRODUCTION EDGE CASES: STRICT CLEANUP ON UNMOUNT           */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    return () => {
      stopMicTest();
      stopVideoPreview();
    };
  }, [stopMicTest, stopVideoPreview]);

  /* -------------------------------------------------------------------------- */
  /*           4. PTT KEYBINDING RECORDER & WINDOW BLUR SAFEGUARD               */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (!isRecordingPTTKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        setIsRecordingPTTKey(false);
        return;
      }

      let label = e.key.toUpperCase();
      if (e.code === 'Space') label = 'Space';
      else if (e.code.startsWith('Key')) label = e.code.slice(3);
      else if (e.code.startsWith('Digit')) label = e.code.slice(5);

      setPttKey(e.code, label);
      setIsRecordingPTTKey(false);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isRecordingPTTKey, setPttKey]);

  useEffect(() => {
    const handleBlur = () => {
      useVoiceVideoSettingsStore.getState().setIsPTTActive(false);
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                     5. CUSTOM BACKGROUND IMAGE UPLOAD                      */
  /* -------------------------------------------------------------------------- */
  const handleCustomBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const id = `bg-${Date.now()}`;
        addCustomBackground({ id, name: file.name, url: dataUrl });
        setCustomBackgroundUrl(dataUrl);
        setVirtualBackground('custom');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /* -------------------------------------------------------------------------- */
  /*                  6. PREPARE OPTIONS FOR SELECT DROPDOWNS                   */
  /* -------------------------------------------------------------------------- */
  const audioInputOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [
      {
        value: '',
        label: 'Default Microphone',
        sublabel: 'System Device',
        icon: <Mic size={16} />,
      },
    ];
    audioInputs.forEach((d, i) => {
      let primary = d.label || `Microphone ${i + 1}`;
      let secondary: string | undefined = undefined;
      const match = d.label.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        primary = match[1];
        secondary = match[2];
      }
      opts.push({
        value: d.deviceId,
        label: primary,
        sublabel: secondary,
        icon: <Mic size={16} />,
      });
    });
    return opts;
  }, [audioInputs]);

  const audioOutputOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [
      {
        value: '',
        label: 'Default Speaker',
        sublabel: 'System Device',
        icon: <Headphones size={16} />,
      },
    ];
    audioOutputs.forEach((d, i) => {
      let primary = d.label || `Speaker ${i + 1}`;
      let secondary: string | undefined = undefined;
      const match = d.label.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        primary = match[1];
        secondary = match[2];
      }
      opts.push({
        value: d.deviceId,
        label: primary,
        sublabel: secondary,
        icon: <Headphones size={16} />,
      });
    });
    return opts;
  }, [audioOutputs]);

  const videoInputOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [
      {
        value: '',
        label: 'Default Camera',
        sublabel: 'System Device',
        icon: <Video size={16} />,
      },
    ];
    videoInputs.forEach((d, i) => {
      opts.push({
        value: d.deviceId,
        label: d.label || `Camera ${i + 1}`,
        icon: <Video size={16} />,
      });
    });
    return opts;
  }, [videoInputs]);

  const noiseSuppressionOptions: SelectOption[] = [
    {
      value: 'krisp',
      label: 'RNNoise (AI Model)',
      sublabel: 'Removes fan noise and key clicks',
    },
    {
      value: 'standard',
      label: 'Standard',
      sublabel: 'WebRTC processing',
    },
    {
      value: 'off',
      label: 'Off',
      sublabel: 'No noise suppression',
    },
  ];

  return (
    <div className="text-gray-950 dark:text-white flex flex-col gap-9 pb-36 animate-fadeIn select-none">
      {/* ==================================================================== */}
      {/*                           SECTION: VOICE                             */}
      {/* ==================================================================== */}
      <section id="sec-voice" className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-950 dark:text-white">Voice</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Configure your microphone, speakers, and audio levels
            </p>
          </div>

          {!hasPermissions && (
            <button
              type="button"
              onClick={() => void requestPermissions()}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 hover:bg-amber-500/25 transition cursor-pointer"
            >
              <AlertCircle size={13} />
              <span>Allow Device Access</span>
            </button>
          )}
        </div>

        {/* 1.1 Devices: Microphone and Speaker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Column: Microphone */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              Microphone
            </label>
            <Select
              value={selectedAudioInput}
              onChange={setSelectedAudioInput}
              options={audioInputOptions}
              icon={<Mic size={16} />}
              placeholder="Default Microphone"
              aria-label="Input device"
            />

            {/* Microphone Volume Slider */}
            <div className="pt-2 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  Microphone Volume
                </span>
                <span className="font-mono font-bold text-gray-900 dark:text-gray-300">
                  {inputVolume}%
                </span>
              </div>
              <Slider
                value={inputVolume}
                min={0}
                max={100}
                step={1}
                onChange={setInputVolume}
                formatTooltip={(val) => `${val}%`}
                aria-label="Microphone volume"
              />
            </div>
          </div>

          {/* Column: Speaker */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              Speaker
            </label>
            <Select
              value={selectedAudioOutput}
              onChange={setSelectedAudioOutput}
              options={audioOutputOptions}
              icon={<Headphones size={16} />}
              placeholder="Default Speaker"
              aria-label="Output device"
            />

            {/* Speaker Volume Slider */}
            <div className="pt-2 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  Speaker Volume
                </span>
                <span className="font-mono font-bold text-gray-900 dark:text-gray-300">
                  {outputVolume}%
                </span>
              </div>
              <Slider
                value={outputVolume}
                min={0}
                max={100}
                step={1}
                onChange={setOutputVolume}
                formatTooltip={(val) => `${val}%`}
                aria-label="Speaker volume"
              />
            </div>
          </div>
        </div>

        {/* 1.2 Mic Test */}
        <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.07] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="font-bold text-sm text-gray-950 dark:text-white">Mic Test</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Say something to check your microphone sensitivity and audio quality.
              </p>
            </div>

            <button
              type="button"
              onClick={isMicTesting ? stopMicTest : () => void startMicTest()}
              style={
                isMicTesting
                  ? { backgroundColor: '#ef4444', color: '#ffffff' }
                  : { backgroundColor: accentColor, color: textOnAccent }
              }
              className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              {isMicTesting ? (
                <>
                  <MicOff size={15} />
                  <span>Stop Test</span>
                </>
              ) : (
                <>
                  <Mic size={15} />
                  <span>Test Mic</span>
                </>
              )}
            </button>
          </div>

          {/* 36-segment LED indicator */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 h-4 px-2.5 rounded-lg bg-black/10 dark:bg-black/40 border border-black/5 dark:border-white/5 overflow-hidden">
              {Array.from({ length: 36 }).map((_, i) => {
                const thresholdPercent = (i / 36) * 100;
                const isLit = isMicTesting && inputVolume > 0 && micLevel >= thresholdPercent;
                return (
                  <div
                    key={i}
                    style={{
                      backgroundColor: isLit
                        ? i > 28
                          ? '#ef4444'
                          : i > 20
                            ? '#f59e0b'
                            : accentColor
                        : undefined,
                    }}
                    className={`flex-1 h-2 rounded-full transition-all duration-75 ${
                      isLit ? 'opacity-100 shadow-xs' : 'bg-black/10 dark:bg-white/10 opacity-30'
                    }`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>LOW</span>
              <span>GOOD</span>
              <span>CLIPPING</span>
            </div>
          </div>

          {/* Monitoring toggle */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Headphones size={15} className="text-gray-500" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-900 dark:text-gray-200">
                  Hear your voice during test (Monitoring)
                </span>
                <span className="text-[11px] text-gray-500">
                  Headphones recommended to avoid echo
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isHearSelfEnabled}
                onChange={(e) => setIsHearSelfEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div
                style={{
                  backgroundColor: isHearSelfEnabled ? accentColor : undefined,
                }}
                className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                  isHearSelfEnabled ? '' : 'bg-black/15 dark:bg-zinc-700'
                } relative`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 ${
                    isHearSelfEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </label>
          </div>
        </div>

        {/* 1.3 INPUT PROFILE */}
        <div className="space-y-4 pt-2">
          <label className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            Input Profile
          </label>

          <div className="space-y-3.5">
            {/* Option 1: Voice Isolation */}
            <div
              onClick={() => setInputProfile('isolation')}
              className="flex items-start gap-3 py-1 cursor-pointer group select-none"
            >
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors"
                style={{
                  borderColor: inputProfile === 'isolation' ? accentColor : 'rgba(255,255,255,0.3)',
                }}
              >
                {inputProfile === 'isolation' && (
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-xs"
                    style={{ backgroundColor: accentColor }}
                  />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-white transition-colors">
                  Voice Isolation
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  Only your clear voice: removes background noise
                </span>
              </div>
            </div>

            {/* Option 2: Studio */}
            <div
              onClick={() => setInputProfile('studio')}
              className="flex items-start gap-3 py-1 cursor-pointer group select-none"
            >
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors"
                style={{
                  borderColor: inputProfile === 'studio' ? accentColor : 'rgba(255,255,255,0.3)',
                }}
              >
                {inputProfile === 'studio' && (
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-xs"
                    style={{ backgroundColor: accentColor }}
                  />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-white transition-colors">
                  Studio
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  Clean sound: raw open microphone without processing
                </span>
              </div>
            </div>

            {/* Option 3: Custom */}
            <div
              onClick={() => setInputProfile('custom')}
              className="flex items-start gap-3 py-1 cursor-pointer group select-none"
            >
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors"
                style={{
                  borderColor: inputProfile === 'custom' ? accentColor : 'rgba(255,255,255,0.3)',
                }}
              >
                {inputProfile === 'custom' && (
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-xs"
                    style={{ backgroundColor: accentColor }}
                  />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-white transition-colors">
                  Custom
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  Advanced mode: configure all audio controls and toggles
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/*           DYNAMIC SETTINGS ACCORDING TO PROFILE                    */}
        {/* ------------------------------------------------------------------ */}

        {/* CASE 1: CUSTOM SELECTED */}
        {inputProfile === 'custom' && (
          <div className="space-y-4 pt-1 animate-fadeIn">
            {/* Automatically determine input sensitivity */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col pr-4">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Automatically determine input sensitivity
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Controls your microphone sound sensitivity.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoSensitivity}
                    onChange={(e) => setAutoSensitivity(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    style={{
                      backgroundColor: autoSensitivity ? accentColor : undefined,
                    }}
                    className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                      autoSensitivity ? '' : 'bg-black/15 dark:bg-zinc-700'
                    } relative`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                        autoSensitivity ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
              </div>

              {/* Sensitivity slider */}
              {autoSensitivity ? (
                <div className="h-2 w-full bg-zinc-700/40 dark:bg-zinc-800 rounded-full overflow-hidden opacity-60 cursor-not-allowed my-2" />
              ) : (
                <div className="space-y-1 pt-1 animate-fadeIn">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Noise Gate Threshold
                  </div>

                  <Slider
                    value={sensitivityThreshold}
                    min={-80}
                    max={-20}
                    step={1}
                    onChange={setSensitivityThreshold}
                    formatTooltip={(val) => `${val} dB`}
                    aria-label="Noise Gate Threshold"
                    customTrackBackground={
                      <div className="relative w-full h-full bg-black/15 dark:bg-white/10 rounded-full overflow-hidden">
                        {/* Noise cutoff zone */}
                        <div
                          className="absolute top-0 bottom-0 left-0 bg-amber-500/80 transition-all duration-75"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, Math.round(((sensitivityThreshold + 80) / 60) * 100)),
                            )}%`,
                          }}
                        />
                        {/* Voice transmission zone */}
                        <div
                          className="absolute top-0 bottom-0 right-0 bg-emerald-500 transition-all duration-75"
                          style={{
                            left: `${Math.max(
                              0,
                              Math.min(100, Math.round(((sensitivityThreshold + 80) / 60) * 100)),
                            )}%`,
                          }}
                        />
                        {/* Live mic audio level during test */}
                        {isMicTesting && (
                          <div
                            className="absolute top-0 bottom-0 left-0 bg-white/70 transition-all duration-75 shadow-xs"
                            style={{ width: `${Math.min(100, micLevel)}%` }}
                          />
                        )}
                      </div>
                    }
                  />

                  <div className="flex justify-between text-[11px] text-gray-500 font-mono pt-0.5">
                    <span>-80 dB</span>
                    <span>-20 dB</span>
                  </div>
                </div>
              )}
            </div>

            {/* Noise Suppression */}
            <div className="flex items-center justify-between py-2 gap-4">
              <div className="flex flex-col pr-4">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-cyan-400" />
                  <span>Noise Suppression</span>
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  RNNoise AI filter or standard WebRTC suppression.
                </span>
              </div>
              <div className="min-w-[190px] shrink-0">
                <Select
                  value={noiseSuppression}
                  onChange={(val) => setNoiseSuppression(val as any)}
                  options={noiseSuppressionOptions}
                />
              </div>
            </div>

            {/* Echo Cancellation */}
            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col pr-4">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Echo Cancellation
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Eliminates acoustic feedback when using speakers without headphones.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={echoCancellation}
                  onChange={(e) => setEchoCancellation(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  style={{
                    backgroundColor: echoCancellation ? accentColor : undefined,
                  }}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                    echoCancellation ? '' : 'bg-black/15 dark:bg-zinc-700'
                  } relative`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                      echoCancellation ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* Push to Talk */}
            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col pr-4">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Push to Talk
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Microphone only transmits audio while holding the assigned key
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isPTTEnabled}
                  onChange={(e) => setIsPTTEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  style={{
                    backgroundColor: isPTTEnabled ? accentColor : undefined,
                  }}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                    isPTTEnabled ? '' : 'bg-black/15 dark:bg-zinc-700'
                  } relative`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                      isPTTEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* PTT Key Assignment */}
            {isPTTEnabled && (
              <div className="space-y-3 p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.06] animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      Push to Talk Shortcut
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Assign a shortcut key to activate Push to Talk.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-lg bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white border border-black/10 dark:border-white/10">
                      {isRecordingPTTKey ? 'Press a key...' : `[ ${pttKeyLabel} ]`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRecordingPTTKey(!isRecordingPTTKey)}
                      style={{
                        backgroundColor: isRecordingPTTKey ? '#ef4444' : accentColor,
                        color: textOnAccent,
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    >
                      {isRecordingPTTKey ? 'Cancel (Esc)' : 'Set Key'}
                    </button>
                  </div>
                </div>

                {/* Push to talk release delay */}
                <div className="space-y-1 pt-2">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Push to Talk Release Delay
                  </div>
                  <Slider
                    value={pttReleaseTailMs}
                    min={0}
                    max={2000}
                    step={20}
                    onChange={setPttReleaseTailMs}
                    formatTooltip={(val) =>
                      val < 1000 ? `${val} ms` : `${(val / 1000).toFixed(2)} s`
                    }
                    aria-label="Push to Talk Release Delay"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* CASE 2: VOICE ISOLATION SELECTED */}
        {inputProfile === 'isolation' && (
          <div className="space-y-3 pt-1 animate-fadeIn">
            {/* Push to Talk */}
            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col pr-4">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Push to Talk
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Microphone only transmits audio while holding the assigned key
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isPTTEnabled}
                  onChange={(e) => setIsPTTEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  style={{
                    backgroundColor: isPTTEnabled ? accentColor : undefined,
                  }}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                    isPTTEnabled ? '' : 'bg-black/15 dark:bg-zinc-700'
                  } relative`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                      isPTTEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* PTT Key Assignment */}
            {isPTTEnabled && (
              <div className="space-y-3 p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.06] animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      Push to Talk Shortcut
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Assign a shortcut key to activate Push to Talk.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-lg bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white border border-black/10 dark:border-white/10">
                      {isRecordingPTTKey ? 'Press a key...' : `[ ${pttKeyLabel} ]`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRecordingPTTKey(!isRecordingPTTKey)}
                      style={{
                        backgroundColor: isRecordingPTTKey ? '#ef4444' : accentColor,
                        color: textOnAccent,
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    >
                      {isRecordingPTTKey ? 'Cancel (Esc)' : 'Set Key'}
                    </button>
                  </div>
                </div>

                {/* Push to talk release delay */}
                <div className="space-y-1 pt-2">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Push to Talk Release Delay
                  </div>
                  <Slider
                    value={pttReleaseTailMs}
                    min={0}
                    max={2000}
                    step={20}
                    onChange={setPttReleaseTailMs}
                    formatTooltip={(val) =>
                      val < 1000 ? `${val} ms` : `${(val / 1000).toFixed(2)} s`
                    }
                    aria-label="Push to Talk Release Delay"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* CASE 3: STUDIO */}

        {/* 1.4 ADVANCED VOICE SETTINGS ACCORDION */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAdvancedVoice(!showAdvancedVoice)}
            className="w-full flex items-center justify-between py-3 text-left transition-colors cursor-pointer group"
          >
            <div className="flex flex-col pr-4">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-white transition-colors">
                {showAdvancedVoice
                  ? 'Hide Advanced Voice Settings'
                  : 'Show Advanced Voice Settings'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                {inputProfile === 'isolation'
                  ? 'No Audio Input Warning, Muted Speaking Warning, and more'
                  : 'Automatic Gain Control, Advanced Voice Activation, Disable System Audio Processing, and more.'}
              </span>
            </div>
            <div
              className={`p-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 transition-transform duration-200 ${
                showAdvancedVoice ? 'rotate-180' : 'rotate-0'
              }`}
            >
              <ChevronDown size={18} className="text-gray-400 group-hover:text-white" />
            </div>
          </button>

          {/* Accordion content */}
          {showAdvancedVoice && (
            <div className="space-y-4 pt-2 pb-2 animate-fadeIn">
              {/* Automatic Gain Control */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-200">
                    Automatic Gain Control
                  </span>
                  <p className="text-[11px] text-gray-500">
                    Balances whisper and loud speech volume
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoGainControl}
                    onChange={(e) => setAutoGainControl(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    style={{
                      backgroundColor: autoGainControl ? accentColor : undefined,
                    }}
                    className={`w-9 h-5 rounded-full transition-colors duration-200 ${
                      autoGainControl ? '' : 'bg-black/15 dark:bg-zinc-700'
                    } relative`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 absolute top-0.5 left-0.5 shadow-sm ${
                        autoGainControl ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
              </div>

              {/* Room Reverb Suppression */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-200">
                    Room Reverb Suppression
                  </span>
                  <p className="text-[11px] text-gray-500">
                    Suppresses echoes in rooms with bare walls and high ceilings
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={reverbSuppression}
                    onChange={(e) => setReverbSuppression(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    style={{
                      backgroundColor: reverbSuppression ? accentColor : undefined,
                    }}
                    className={`w-9 h-5 rounded-full transition-colors duration-200 ${
                      reverbSuppression ? '' : 'bg-black/15 dark:bg-zinc-700'
                    } relative`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 absolute top-0.5 left-0.5 shadow-sm ${
                        reverbSuppression ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
              </div>

              {/* Disable System Audio Processing */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-200">
                    Disable System Audio Processing
                  </span>
                  <p className="text-[11px] text-gray-500">
                    For external studio audio interfaces and mixer boards
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={disableAudioProcessing}
                    onChange={(e) => setDisableAudioProcessing(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    style={{
                      backgroundColor: disableAudioProcessing ? accentColor : undefined,
                    }}
                    className={`w-9 h-5 rounded-full transition-colors duration-200 ${
                      disableAudioProcessing ? '' : 'bg-black/15 dark:bg-zinc-700'
                    } relative`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 absolute top-0.5 left-0.5 shadow-sm ${
                        disableAudioProcessing ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
              </div>

              {/* Attenuation / Ducking */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-200">
                    Attenuation / Ducking
                  </span>
                  <p className="text-[11px] text-gray-500">
                    Automatically lowers volume of other apps when someone is speaking
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={duckingEnabled}
                    onChange={(e) => setDuckingEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    style={{
                      backgroundColor: duckingEnabled ? accentColor : undefined,
                    }}
                    className={`w-9 h-5 rounded-full transition-colors duration-200 ${
                      duckingEnabled ? '' : 'bg-black/15 dark:bg-zinc-700'
                    } relative`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 absolute top-0.5 left-0.5 shadow-sm ${
                        duckingEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
              </div>

              {duckingEnabled && (
                <div className="space-y-1.5 pl-3 py-1.5 border-l-2 border-black/10 dark:border-white/10 animate-fadeIn">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-700 dark:text-gray-300">Attenuation Strength</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                      {duckingStrength}%
                    </span>
                  </div>
                  <Slider
                    value={duckingStrength}
                    min={0}
                    max={100}
                    step={5}
                    onChange={setDuckingStrength}
                    formatTooltip={(val) => `${val}%`}
                  />
                </div>
              )}

              {/* 3D Spatial Audio */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-200">
                    3D Spatial Audio
                  </span>
                  <p className="text-[11px] text-gray-500">
                    Positions participants' voices in stereo field (left/right) in headphones
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={spatialAudio}
                    onChange={(e) => setSpatialAudio(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    style={{
                      backgroundColor: spatialAudio ? accentColor : undefined,
                    }}
                    className={`w-9 h-5 rounded-full transition-colors duration-200 ${
                      spatialAudio ? '' : 'bg-black/15 dark:bg-zinc-700'
                    } relative`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 absolute top-0.5 left-0.5 shadow-sm ${
                        spatialAudio ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
              </div>

              {spatialAudio && (
                <div className="space-y-2 pl-3 py-2 border-l-2 border-black/10 dark:border-white/10 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-200 flex items-center gap-1.5">
                        <Compass size={13} className="text-violet-400" />
                        <span>Dynamic Head Tracking</span>
                      </span>
                      <p className="text-[11px] text-gray-500">
                        MediaPipe HRTF head orientation tracking via camera
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isHeadTrackingEnabled}
                        onChange={(e) => setIsHeadTrackingEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div
                        style={{ backgroundColor: isHeadTrackingEnabled ? accentColor : undefined }}
                        className={`w-9 h-5 rounded-full transition-colors duration-200 ${isHeadTrackingEnabled ? '' : 'bg-black/15 dark:bg-zinc-700'} relative`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 absolute top-0.5 left-0.5 shadow-sm ${isHeadTrackingEnabled ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </div>
                    </label>
                  </div>
                  {isHeadTrackingEnabled && (
                    <div className="flex items-center justify-between text-[11px] font-mono bg-black/5 dark:bg-black/40 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5">
                      <span className="text-gray-500">Head orientation:</span>
                      <div className="flex gap-2.5">
                        <span className="text-indigo-400">Yaw: {headAngles?.yaw || 0}°</span>
                        <span className="text-emerald-400">Pitch: {headAngles?.pitch || 0}°</span>
                        <span className="text-amber-400">Roll: {headAngles?.roll || 0}°</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Voice FX Modifiers */}
              <div className="space-y-2 pt-2 border-t border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-200 flex items-center gap-1.5">
                    <Mic2 size={13} className="text-amber-400" />
                    <span>Voice FX Modifier</span>
                  </span>
                  <span className="text-xs font-mono font-semibold text-gray-500 capitalize">
                    {voiceFX === 'none' ? 'Clean' : voiceFX}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-xs">
                  {[
                    { id: 'none', label: 'Normal', icon: '🎙️' },
                    { id: 'robot', label: 'Robot', icon: '🤖' },
                    { id: 'radio', label: 'Radio', icon: '📻' },
                    { id: 'deep', label: 'Deep', icon: '🗣️' },
                    { id: 'cosmic', label: 'Cosmic', icon: '🌌' },
                  ].map((fx) => (
                    <button
                      key={fx.id}
                      type="button"
                      onClick={() => setVoiceFX(fx.id as any)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs transition-all border cursor-pointer ${
                        voiceFX === fx.id
                          ? 'font-bold shadow-xs'
                          : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/10 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      style={
                        voiceFX === fx.id
                          ? {
                              borderColor: accentColor,
                              color: textOnAccent,
                              backgroundColor: accentColor,
                            }
                          : undefined
                      }
                    >
                      <span className="text-base mb-0.5">{fx.icon}</span>
                      <span className="text-[10px] truncate w-full text-center">{fx.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* No Audio Input Warning */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-200">
                    No Audio Input Warning
                  </span>
                  <p className="text-[11px] text-gray-500">
                    Show a warning when no audio is detected from your microphone
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={warnNoAudioInput}
                    onChange={(e) => setWarnNoAudioInput(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    style={{
                      backgroundColor: warnNoAudioInput ? accentColor : undefined,
                    }}
                    className={`w-9 h-5 rounded-full transition-colors duration-200 ${
                      warnNoAudioInput ? '' : 'bg-black/15 dark:bg-zinc-700'
                    } relative`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 absolute top-0.5 left-0.5 shadow-sm ${
                        warnNoAudioInput ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
              </div>

              {/* Muted Speaking Warning */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-200">
                    Muted Speaking Warning
                  </span>
                  <p className="text-[11px] text-gray-500">
                    Show a warning when speech is detected while your hardware mic is muted
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={warnMutedSpeaking}
                    onChange={(e) => setWarnMutedSpeaking(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    style={{
                      backgroundColor: warnMutedSpeaking ? accentColor : undefined,
                    }}
                    className={`w-9 h-5 rounded-full transition-colors duration-200 ${
                      warnMutedSpeaking ? '' : 'bg-black/15 dark:bg-zinc-700'
                    } relative`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 absolute top-0.5 left-0.5 shadow-sm ${
                        warnMutedSpeaking ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ==================================================================== */}
      {/*                           SECTION: VIDEO                             */}
      {/* ==================================================================== */}
      <section id="sec-video" className="flex flex-col gap-6 pt-2">
        <div>
          <h3 className="text-xl font-bold text-gray-950 dark:text-white">Video</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configure camera, video preview, and virtual background
          </p>
        </div>

        {/* Camera Selection & Video Mirroring */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              Camera
            </label>
            <Select
              value={selectedVideoInput}
              onChange={setSelectedVideoInput}
              options={videoInputOptions}
              icon={<Video size={16} />}
              placeholder="Default Camera"
              aria-label="Camera"
            />
          </div>

          <div className="flex items-center justify-between h-[42px] px-0.5">
            <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
              Mirror Video Preview
            </span>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={isMirrorVideo}
                onChange={(e) => setIsMirrorVideo(e.target.checked)}
                className="sr-only peer"
              />
              <div
                style={{
                  backgroundColor: isMirrorVideo ? accentColor : undefined,
                }}
                className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                  isMirrorVideo ? '' : 'bg-black/15 dark:bg-zinc-700'
                } relative`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                    isMirrorVideo ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </label>
          </div>
        </div>

        {/* Large Rounded Camera Preview Box */}
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-zinc-950 border border-black/15 dark:border-white/10 shadow-2xl flex items-center justify-center">
          <video
            ref={previewVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-transform duration-200 ${
              isMirrorVideo ? 'scale-x-[-1]' : ''
            } ${isVideoPreviewing ? 'block' : 'hidden'}`}
          />

          {isVideoPreviewing ? (
            <button
              type="button"
              onClick={stopVideoPreview}
              className="absolute bottom-3 right-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer z-10"
            >
              Stop Video Preview
            </button>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-black/30 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-gray-400">
                <Video size={28} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                  Video preview is disabled
                </h4>
                <p className="text-xs text-gray-500 max-w-sm mt-0.5">
                  Make sure you are clearly visible and have the right virtual background selected
                  before joining.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void startVideoPreview()}
                style={{ backgroundColor: accentColor, color: textOnAccent }}
                className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                Test Video
              </button>
            </div>
          )}
        </div>

        {/* Virtual Background */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            Virtual Background
          </h4>

          {/* 4-column Background Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. NONE */}
            <button
              type="button"
              onClick={() => setVirtualBackground('none')}
              className={`relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border-2 select-none group flex flex-col items-center justify-center p-3 ${
                virtualBackground === 'none'
                  ? 'shadow-lg ring-1 ring-white/20'
                  : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
              style={{
                borderColor: virtualBackground === 'none' ? accentColor : undefined,
                backgroundColor: '#1e1f22',
                boxShadow: virtualBackground === 'none' ? `0 0 16px ${accentColor}40` : undefined,
              }}
            >
              <Ban
                size={28}
                className="text-gray-400 group-hover:text-gray-200 transition-colors mb-1.5"
              />
              <span className="text-xs font-semibold text-gray-200">None</span>
            </button>

            {/* 2. BLUR */}
            <button
              type="button"
              onClick={() => setVirtualBackground('blur')}
              className={`relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border-2 select-none group flex flex-col items-center justify-center p-3 ${
                virtualBackground === 'blur'
                  ? 'shadow-lg ring-1 ring-white/20'
                  : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
              style={{
                borderColor: virtualBackground === 'blur' ? accentColor : undefined,
                boxShadow: virtualBackground === 'blur' ? `0 0 16px ${accentColor}40` : undefined,
              }}
            >
              <div
                className="absolute inset-0 scale-125 filter blur-md"
                style={{
                  background:
                    'radial-gradient(circle at 20% 30%, #ec4899 0%, #8b5cf6 40%, #3b82f6 75%, #06b6d4 100%)',
                }}
              />
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative mb-1">
                  <User size={24} className="text-white drop-shadow-md" />
                  <Sparkles
                    size={12}
                    className="text-amber-300 absolute -top-1 -right-2 drop-shadow-xs"
                  />
                </div>
                <span className="text-xs font-semibold text-white drop-shadow-md">Blur</span>
              </div>
            </button>

            {/* 3. CUSTOM */}
            <div
              onClick={() => {
                if (customBackgroundUrl) {
                  setVirtualBackground('custom');
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className={`relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border-2 select-none group flex flex-col items-center justify-center p-3 ${
                virtualBackground === 'custom'
                  ? 'shadow-lg ring-1 ring-white/20'
                  : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
              style={{
                borderColor: virtualBackground === 'custom' ? accentColor : undefined,
                boxShadow: virtualBackground === 'custom' ? `0 0 16px ${accentColor}40` : undefined,
              }}
            >
              {customBackgroundUrl ? (
                <>
                  <img
                    src={customBackgroundUrl}
                    alt="Custom Background"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/45 group-hover:bg-black/35 transition-colors flex flex-col items-center justify-center p-2 z-1">
                    <ImagePlus size={22} className="text-white drop-shadow-md mb-1" />
                    <span className="text-xs font-semibold text-white drop-shadow-md">Custom</span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#5865F2] via-[#7c3aed] to-[#d946ef] flex flex-col items-center justify-center p-3">
                  <ImagePlus size={24} className="text-white drop-shadow-md mb-1" />
                  <span className="text-xs font-semibold text-white drop-shadow-md">Custom</span>
                </div>
              )}

              {/* Quick upload button */}
              <button
                type="button"
                title="Upload image"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-xs flex items-center justify-center text-white shadow-xs z-10 transition cursor-pointer"
              >
                <Plus size={13} />
              </button>
            </div>

            {/* 4. NEON SMOKE (Animated) */}
            <button
              type="button"
              onClick={() => setVirtualBackground('neon-smoke')}
              className={`relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border-2 select-none group ${
                virtualBackground === 'neon-smoke'
                  ? 'shadow-lg ring-1 ring-white/20'
                  : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
              style={{
                borderColor: virtualBackground === 'neon-smoke' ? accentColor : undefined,
                boxShadow:
                  virtualBackground === 'neon-smoke' ? `0 0 16px ${accentColor}40` : undefined,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 35% 35%, #9333ea 0%, #06b6d4 50%, #0a0416 100%)',
                }}
              />
              <svg
                className="absolute inset-0 w-full h-full opacity-65 mix-blend-screen"
                viewBox="0 0 160 100"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,60 C40,20 80,90 120,40 C140,15 160,50 160,80 L160,100 L0,100 Z"
                  fill="url(#neon-smoke-grad1)"
                />
                <path
                  d="M0,70 C50,40 90,80 130,50 C150,30 160,60 160,90 L160,100 L0,100 Z"
                  fill="url(#neon-smoke-grad2)"
                  opacity="0.7"
                />
                <defs>
                  <linearGradient id="neon-smoke-grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#9333ea" />
                  </linearGradient>
                  <linearGradient id="neon-smoke-grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white shadow-xs z-10 pointer-events-none">
                <Play size={10} className="fill-white ml-0.5" />
              </div>
              <div className="absolute inset-x-0 bottom-0 py-1.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-center">
                <span className="text-xs font-semibold text-white drop-shadow-md">Neon Smoke</span>
              </div>
            </button>

            {/* 5. RETROWAVE (Animated) */}
            <button
              type="button"
              onClick={() => setVirtualBackground('synthwave-grid')}
              className={`relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border-2 select-none group ${
                virtualBackground === 'synthwave-grid'
                  ? 'shadow-lg ring-1 ring-white/20'
                  : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
              style={{
                borderColor: virtualBackground === 'synthwave-grid' ? accentColor : undefined,
                boxShadow:
                  virtualBackground === 'synthwave-grid' ? `0 0 16px ${accentColor}40` : undefined,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, #120422 0%, #3b0764 55%, #f43f5e 68%, #090114 100%)',
                }}
              />
              <div
                className="absolute w-12 h-12 rounded-full left-1/2 -translate-x-1/2 top-2 shadow-[0_0_16px_#f43f5e]"
                style={{
                  background: 'linear-gradient(180deg, #fef08a 0%, #f43f5e 70%, #ec4899 100%)',
                }}
              />
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 160 100"
                preserveAspectRatio="none"
              >
                <polygon
                  points="0,65 30,52 65,65 105,48 140,65 160,60 160,65 0,65"
                  fill="#090114"
                />
                <line
                  x1="0"
                  y1="72"
                  x2="160"
                  y2="72"
                  stroke="#06b6d4"
                  strokeWidth="0.8"
                  opacity="0.7"
                />
                <line
                  x1="0"
                  y1="82"
                  x2="160"
                  y2="82"
                  stroke="#06b6d4"
                  strokeWidth="1.2"
                  opacity="0.8"
                />
                <line
                  x1="0"
                  y1="94"
                  x2="160"
                  y2="94"
                  stroke="#06b6d4"
                  strokeWidth="1.6"
                  opacity="0.9"
                />
                <line
                  x1="80"
                  y1="65"
                  x2="0"
                  y2="100"
                  stroke="#06b6d4"
                  strokeWidth="0.9"
                  opacity="0.6"
                />
                <line
                  x1="80"
                  y1="65"
                  x2="40"
                  y2="100"
                  stroke="#06b6d4"
                  strokeWidth="0.9"
                  opacity="0.6"
                />
                <line
                  x1="80"
                  y1="65"
                  x2="80"
                  y2="100"
                  stroke="#06b6d4"
                  strokeWidth="0.9"
                  opacity="0.7"
                />
                <line
                  x1="80"
                  y1="65"
                  x2="120"
                  y2="100"
                  stroke="#06b6d4"
                  strokeWidth="0.9"
                  opacity="0.6"
                />
                <line
                  x1="80"
                  y1="65"
                  x2="160"
                  y2="100"
                  stroke="#06b6d4"
                  strokeWidth="0.9"
                  opacity="0.6"
                />
              </svg>
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white shadow-xs z-10 pointer-events-none">
                <Play size={10} className="fill-white ml-0.5" />
              </div>
              <div className="absolute inset-x-0 bottom-0 py-1.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-center">
                <span className="text-xs font-semibold text-white drop-shadow-md">Retrowave</span>
              </div>
            </button>

            {/* 6. NORTHERN LIGHTS (Animated) */}
            <button
              type="button"
              onClick={() => setVirtualBackground('cosmic-aurora')}
              className={`relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border-2 select-none group ${
                virtualBackground === 'cosmic-aurora'
                  ? 'shadow-lg ring-1 ring-white/20'
                  : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
              style={{
                borderColor: virtualBackground === 'cosmic-aurora' ? accentColor : undefined,
                boxShadow:
                  virtualBackground === 'cosmic-aurora' ? `0 0 16px ${accentColor}40` : undefined,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(180deg, #020617 0%, #042f2e 50%, #021817 100%)',
                }}
              />
              <div
                className="absolute inset-x-0 top-0 h-3/4 opacity-60 filter blur-xs"
                style={{
                  background:
                    'radial-gradient(ellipse at 30% 40%, #10b981 0%, rgba(16,185,129,0) 60%), radial-gradient(ellipse at 70% 35%, #c084fc 0%, rgba(192,132,252,0) 65%)',
                }}
              />
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 160 100"
                preserveAspectRatio="none"
              >
                <circle cx="20" cy="15" r="0.8" fill="#ffffff" />
                <circle cx="65" cy="10" r="1.2" fill="#ffffff" />
                <circle cx="125" cy="20" r="0.9" fill="#ffffff" />
                <circle cx="145" cy="8" r="0.7" fill="#ffffff" />
                <polygon
                  points="0,100 0,78 35,66 75,76 115,62 145,72 160,65 160,100"
                  fill="#021414"
                />
              </svg>
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white shadow-xs z-10 pointer-events-none">
                <Play size={10} className="fill-white ml-0.5" />
              </div>
              <div className="absolute inset-x-0 bottom-0 py-1.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-center">
                <span className="text-xs font-semibold text-white drop-shadow-md">
                  Northern Lights
                </span>
              </div>
            </button>

            {/* 7. CYBER CITY (Static) */}
            <button
              type="button"
              onClick={() => setVirtualBackground('cyber')}
              className={`relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border-2 select-none group ${
                virtualBackground === 'cyber'
                  ? 'shadow-lg ring-1 ring-white/20'
                  : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
              style={{
                borderColor: virtualBackground === 'cyber' ? accentColor : undefined,
                boxShadow: virtualBackground === 'cyber' ? `0 0 16px ${accentColor}40` : undefined,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(180deg, #090514 0%, #1e1035 55%, #3b0764 100%)',
                }}
              />
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 160 100"
                preserveAspectRatio="none"
              >
                <rect x="10" y="30" width="16" height="70" fill="#0e0720" />
                <rect x="32" y="45" width="20" height="55" fill="#140a2d" />
                <rect x="58" y="22" width="22" height="78" fill="#0a0518" />
                <rect x="86" y="38" width="18" height="62" fill="#140a2d" />
                <rect x="110" y="28" width="24" height="72" fill="#0e0720" />
                <rect x="140" y="48" width="16" height="52" fill="#180c35" />
                <rect x="14" y="38" width="3" height="4" fill="#06b6d4" opacity="0.8" />
                <rect x="20" y="46" width="3" height="4" fill="#ec4899" opacity="0.8" />
                <rect x="64" y="32" width="4" height="4" fill="#06b6d4" opacity="0.9" />
                <rect x="72" y="42" width="4" height="4" fill="#ec4899" opacity="0.9" />
                <rect x="64" y="52" width="4" height="4" fill="#fef08a" opacity="0.8" />
                <rect x="116" y="36" width="4" height="4" fill="#06b6d4" opacity="0.8" />
                <rect x="124" y="48" width="4" height="4" fill="#ec4899" opacity="0.8" />
              </svg>
              <div className="absolute inset-x-0 bottom-0 py-1.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-center">
                <span className="text-xs font-semibold text-white drop-shadow-md">Cyber City</span>
              </div>
            </button>

            {/* 8. OFFICE (Static) */}
            <button
              type="button"
              onClick={() => setVirtualBackground('office')}
              className={`relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border-2 select-none group ${
                virtualBackground === 'office'
                  ? 'shadow-lg ring-1 ring-white/20'
                  : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
              style={{
                borderColor: virtualBackground === 'office' ? accentColor : undefined,
                boxShadow: virtualBackground === 'office' ? `0 0 16px ${accentColor}40` : undefined,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #020617 100%)',
                }}
              />
              <div
                className="absolute w-20 h-20 rounded-full right-2 top-0 filter blur-md"
                style={{
                  background:
                    'radial-gradient(circle, rgba(251, 191, 36, 0.45) 0%, rgba(251, 191, 36, 0) 70%)',
                }}
              />
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 160 100"
                preserveAspectRatio="none"
              >
                <rect
                  x="15"
                  y="20"
                  width="60"
                  height="50"
                  rx="3"
                  fill="rgba(255,255,255,0.05)"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="0.8"
                />
                <line
                  x1="90"
                  y1="35"
                  x2="140"
                  y2="35"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1.5"
                />
                <line
                  x1="95"
                  y1="55"
                  x2="145"
                  y2="55"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1.5"
                />
                <circle cx="102" cy="30" r="3" fill="#10b981" />
                <rect x="100" y="32" width="4" height="3" fill="#f59e0b" />
                <line x1="140" y1="0" x2="140" y2="15" stroke="#94a3b8" strokeWidth="0.8" />
                <polygon points="135,18 145,18 142,15 138,15" fill="#f59e0b" />
                <circle cx="140" cy="19" r="1.5" fill="#fef08a" />
              </svg>
              <div className="absolute inset-x-0 bottom-0 py-1.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-center">
                <span className="text-xs font-semibold text-white drop-shadow-md">Office</span>
              </div>
            </button>

            {/* 9. NATURE (Static) */}
            <button
              type="button"
              onClick={() => setVirtualBackground('nature')}
              className={`relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border-2 select-none group ${
                virtualBackground === 'nature'
                  ? 'shadow-lg ring-1 ring-white/20'
                  : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
              style={{
                borderColor: virtualBackground === 'nature' ? accentColor : undefined,
                boxShadow: virtualBackground === 'nature' ? `0 0 16px ${accentColor}40` : undefined,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, #064e3b 0%, #022c22 40%, #065f46 75%, #0f766e 100%)',
                }}
              />
              <div
                className="absolute w-12 h-12 rounded-full left-1/2 -translate-x-1/2 top-2 filter blur-xs"
                style={{
                  background:
                    'radial-gradient(circle, rgba(254, 240, 138, 0.6) 0%, rgba(254, 240, 138, 0) 70%)',
                }}
              />
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 160 100"
                preserveAspectRatio="none"
              >
                <ellipse cx="80" cy="72" rx="45" ry="8" fill="#042f2e" />
                <path d="M0,0 Q30,15 50,4 Q25,25 0,35 Z" fill="#022c22" />
                <path d="M160,0 Q130,18 110,6 Q135,28 160,40 Z" fill="#022c22" />
              </svg>
              <div className="absolute inset-x-0 bottom-0 py-1.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-center">
                <span className="text-xs font-semibold text-white drop-shadow-md">Nature</span>
              </div>
            </button>

            {/* 10. SPACE (Static) */}
            <button
              type="button"
              onClick={() => setVirtualBackground('space')}
              className={`relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border-2 select-none group ${
                virtualBackground === 'space'
                  ? 'shadow-lg ring-1 ring-white/20'
                  : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
              style={{
                borderColor: virtualBackground === 'space' ? accentColor : undefined,
                boxShadow: virtualBackground === 'space' ? `0 0 16px ${accentColor}40` : undefined,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
                }}
              />
              <div
                className="absolute inset-0 opacity-55 filter blur-sm"
                style={{
                  background:
                    'radial-gradient(circle at 65% 45%, #8b5cf6 0%, rgba(139,92,246,0) 55%), radial-gradient(circle at 25% 65%, #38bdf8 0%, rgba(56,189,248,0) 50%)',
                }}
              />
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 160 100"
                preserveAspectRatio="none"
              >
                <circle cx="25" cy="20" r="0.8" fill="#ffffff" />
                <circle cx="45" cy="45" r="1.1" fill="#ffffff" />
                <circle cx="85" cy="15" r="0.7" fill="#ffffff" />
                <circle cx="105" cy="65" r="1" fill="#ffffff" />
                <circle cx="135" cy="25" r="1.4" fill="#ffffff" />
                <circle cx="145" cy="75" r="0.8" fill="#ffffff" />
                <polygon
                  points="135,22 136,25 139,25 136.5,27 137.5,30 135,28 132.5,30 133.5,27 131,25 134,25"
                  fill="#fef08a"
                />
              </svg>
              <div className="absolute inset-x-0 bottom-0 py-1.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-center">
                <span className="text-xs font-semibold text-white drop-shadow-md">Space</span>
              </div>
            </button>

            {/* User Custom Backgrounds */}
            {customBackgrounds.map((bg) => (
              <div
                key={bg.id}
                onClick={() => {
                  setCustomBackgroundUrl(bg.url);
                  setVirtualBackground('custom');
                }}
                className={`relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border-2 select-none group ${
                  virtualBackground === 'custom' && customBackgroundUrl === bg.url
                    ? 'shadow-lg ring-1 ring-white/20'
                    : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:scale-[1.02] active:scale-[0.98]'
                }`}
                style={{
                  borderColor:
                    virtualBackground === 'custom' && customBackgroundUrl === bg.url
                      ? accentColor
                      : undefined,
                  boxShadow:
                    virtualBackground === 'custom' && customBackgroundUrl === bg.url
                      ? `0 0 16px ${accentColor}40`
                      : undefined,
                }}
              >
                <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  title="Delete background"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCustomBackground(bg.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition shadow-md z-10 cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
                <div className="absolute inset-x-0 bottom-0 py-1.5 px-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-center">
                  <span className="text-xs font-semibold text-white truncate drop-shadow-md">
                    {bg.name}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCustomBackgroundUpload}
          />
        </div>

        {/* Always Show Video Preview */}
        <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-gray-950 dark:text-white">
              Always show video preview
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Show video preview each time before turning on your camera in a call
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={alwaysPreviewVideo}
              onChange={(e) => setAlwaysPreviewVideo(e.target.checked)}
              className="sr-only peer"
            />
            <div
              style={{
                backgroundColor: alwaysPreviewVideo ? accentColor : undefined,
              }}
              className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                alwaysPreviewVideo ? '' : 'bg-black/15 dark:bg-zinc-700'
              } relative`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                  alwaysPreviewVideo ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </label>
        </div>

        {/* 2.5 Video Codecs (SDP Munging) */}
        <div className="space-y-3 pt-2 border-t border-black/10 dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <Layers size={15} className="text-cyan-400" />
                <span>Preferred Video Codec</span>
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Prioritize codec via SDP munging without requiring an SFU server
              </p>
            </div>
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300">
              {preferredVideoCodec}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              { id: 'av1', label: 'AV1', desc: '50% less bandwidth' },
              { id: 'vp9', label: 'VP9 SVC', desc: 'Scalable video coding' },
              { id: 'h264', label: 'H.264', desc: 'Hardware acceleration' },
              { id: 'vp8', label: 'VP8', desc: 'Standard baseline' },
            ].map((codec) => (
              <button
                key={codec.id}
                type="button"
                onClick={() => setPreferredVideoCodec(codec.id as any)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all border cursor-pointer ${
                  preferredVideoCodec === codec.id
                    ? 'shadow-xs font-bold'
                    : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/10 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                style={
                  preferredVideoCodec === codec.id
                    ? {
                        borderColor: accentColor,
                        color: textOnAccent,
                        backgroundColor: accentColor,
                      }
                    : undefined
                }
              >
                <span className="font-semibold text-xs">{codec.label}</span>
                <span className="text-[10px] opacity-75 mt-0.5">{codec.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2.6 WebGPU AI Super-Resolution */}
        <div className="space-y-3 pt-2 border-t border-black/10 dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <Zap size={15} className="text-amber-400" />
                <span>WebGPU AI Super-Resolution</span>
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                GPU video upscaling and enhancement for incoming participants
              </p>
            </div>
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300">
              {webGpuSuperResMode}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              { id: 'off', label: 'Off', desc: 'Native WebRTC' },
              { id: 'cas', label: 'CAS', desc: 'Adaptive sharpening' },
              { id: 'fsr_2x', label: 'FSR 2x', desc: 'Artifact reduction' },
              { id: 'neural_4k', label: 'Neural 4K', desc: 'Shader neural net' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setWebGpuSuperResMode(mode.id as any)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all border cursor-pointer ${
                  webGpuSuperResMode === mode.id
                    ? 'shadow-xs font-bold'
                    : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/10 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                style={
                  webGpuSuperResMode === mode.id
                    ? {
                        borderColor: accentColor,
                        color: textOnAccent,
                        backgroundColor: accentColor,
                      }
                    : undefined
                }
              >
                <span className="font-semibold text-xs">{mode.label}</span>
                <span className="text-[10px] opacity-75 mt-0.5">{mode.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2.7 Hardware Acceleration WebCodecs */}
        <div className="flex items-center justify-between py-2 border-t border-black/10 dark:border-white/[0.06]">
          <div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              <Cpu size={15} className="text-emerald-400" />
              <span>WebCodecs Hardware Pipeline</span>
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Direct GPU hardware encoding with ultra-low latency (&lt;5ms)
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isWebCodecsEnabled}
              onChange={(e) => setIsWebCodecsEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div
              style={{ backgroundColor: isWebCodecsEnabled ? accentColor : undefined }}
              className={`w-11 h-6 rounded-full transition-colors duration-200 ${isWebCodecsEnabled ? '' : 'bg-black/15 dark:bg-zinc-700'} relative`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${isWebCodecsEnabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </div>
          </label>
        </div>
      </section>

      {/* ==================================================================== */}
      {/*             SECTION: SCREEN SHARE (STREAMING)                        */}
      {/* ==================================================================== */}
      <section id="sec-screen-share" className="flex flex-col gap-6 pt-2">
        <div>
          <h3 className="text-xl font-bold text-gray-950 dark:text-white">Screen Share</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Stream preview, audio capture, and viewer options
          </p>
        </div>

        {/* 1. Show Stream Preview */}
        <div className="flex items-center justify-between py-1">
          <div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Show Stream Preview
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Show viewers a stream preview before they join.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={showStreamPreview}
              onChange={(e) => setShowStreamPreview(e.target.checked)}
              className="sr-only peer"
            />
            <div
              style={{
                backgroundColor: showStreamPreview ? accentColor : undefined,
              }}
              className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                showStreamPreview ? '' : 'bg-black/15 dark:bg-zinc-700'
              } relative`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                  showStreamPreview ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </label>
        </div>

        {/* 2. Accordion: Advanced Stream Settings */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowAdvancedStream(!showAdvancedStream)}
            className="w-full flex items-center justify-between py-2.5 text-left transition-colors group cursor-pointer"
          >
            <div>
              <span className="text-sm font-semibold text-gray-950 dark:text-white">
                {showAdvancedStream
                  ? 'Hide Advanced Stream Settings'
                  : 'Show Advanced Stream Settings'}
              </span>
              {!showAdvancedStream && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Stream Attenuation, Ducking Strength, and more
                </p>
              )}
            </div>
            <div className="w-8 h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors shrink-0">
              <ChevronDown
                size={18}
                className={`transition-transform duration-200 ${showAdvancedStream ? 'rotate-180' : 'rotate-0'}`}
              />
            </div>
          </button>

          {showAdvancedStream && (
            <div className="space-y-5 animate-fadeIn">
              {/* Stream Attenuation */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Stream Attenuation
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Automatically lower stream volume when people are speaking.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={duckingEnabled}
                    onChange={(e) => setDuckingEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    style={{
                      backgroundColor: duckingEnabled ? accentColor : undefined,
                    }}
                    className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                      duckingEnabled ? '' : 'bg-black/15 dark:bg-zinc-700'
                    } relative`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                        duckingEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
              </div>

              {/* Stream Attenuation Strength */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    Stream Attenuation Strength
                  </span>
                  <span className="font-mono font-bold" style={{ color: accentColor }}>
                    {duckingStrength}%
                  </span>
                </div>
                <Slider
                  value={duckingStrength}
                  min={0}
                  max={100}
                  step={5}
                  onChange={setDuckingStrength}
                  formatTooltip={(val) => `${val}%`}
                  aria-label="Stream Attenuation Strength"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ==================================================================== */}
      {/*                           SECTION: SOUNDS                            */}
      {/* ==================================================================== */}
      <VoiceSoundsSection onNavigateToNotifications={onNavigateToNotifications} />

      {/* ==================================================================== */}
      {/*                       SECTION: ADVANCED                              */}
      {/* ==================================================================== */}
      <VoiceAdvancedSection />
    </div>
  );
}
