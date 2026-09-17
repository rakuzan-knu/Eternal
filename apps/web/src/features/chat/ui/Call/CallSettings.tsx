import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Mic,
  Video,
  Volume2,
  Sparkles,
  ShieldCheck,
  Activity,
  Wand2,
  Sliders,
  Headphones,
  Mic2,
  Music,
  Layers,
  Cpu,
  Zap,
  EyeOff,
  Compass,
  Flame,
  AlertTriangle,
  RefreshCw,
  Radio,
  BellRing,
} from 'lucide-react';
import { useCallStore } from '../../model/callStore';

interface CallSettingsProps {
  onClose: () => void;
}

export function CallSettings({ onClose }: CallSettingsProps) {
  const {
    availableDevices,
    selectedAudioInput,
    selectedVideoInput,
    selectedAudioOutput,
    setSelectedAudioInput,
    setSelectedVideoInput,
    setSelectedAudioOutput,
    isNoiseSuppressionEnabled,
    setIsNoiseSuppressionEnabled,
    virtualBackground,
    setVirtualBackground,
    isVADEnabled,
    setIsVADEnabled,
    noiseGateThreshold,
    setNoiseGateThreshold,
    localIsSpeaking,
    currentAudioLevel,
    isSpatialAudioEnabled,
    setIsSpatialAudioEnabled,
    isSidechainDuckingEnabled,
    setIsSidechainDuckingEnabled,
    voiceFX,
    setVoiceFX,
    networkStats,
    sasCode,
    localStream,
    preferredVideoCodec,
    setPreferredVideoCodec,
    webGpuSuperResMode,
    setWebGpuSuperResMode,
    isWebCodecsEnabled,
    setIsWebCodecsEnabled,
    isGhostMode,
    setIsGhostMode,
    isPeerRelayActive,
    isHeadTrackingEnabled,
    setIsHeadTrackingEnabled,
    headAngles,
    transportProtocol,
    quicStats,
    chaosConfig,
    setChaosConfig,
    setChaosPreset,
    isSatelliteModeEnabled,
    setIsSatelliteModeEnabled,
    isVisualRingingEnabled,
    setIsVisualRingingEnabled,
    isPTTEnabled,
    setIsPTTEnabled,
    pttReleaseTailMs,
    setPttReleaseTailMs,
    isPTTSoundEnabled,
    setIsPTTSoundEnabled,
    isTravelerModeEnabled,
    setIsTravelerModeEnabled,
    isSynestheticVisualizerEnabled,
    setIsSynestheticVisualizerEnabled,
    isVoiceCommandsEnabled,
    setIsVoiceCommandsEnabled,
    isWebGLGridEnabled,
    setIsWebGLGridEnabled,
  } = useCallStore();

  const [micLevel, setMicLevel] = useState<number>(0);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Escape key listener to close settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Bind local stream to preview video
  useEffect(() => {
    if (previewVideoRef.current && localStream) {
      previewVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Real-time audio meter using Web Audio API
  useEffect(() => {
    if (!localStream || localStream.getAudioTracks().length === 0) return;

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animId: number | null = null;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext = new AudioContextClass();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source = audioContext.createMediaStreamSource(localStream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const average = sum / buffer.length;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setMicLevel(normalized);
        animId = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch {
      // AudioContext policy fallback
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      source?.disconnect();
      if (audioContext && audioContext.state !== 'closed') {
        void audioContext.close();
      }
    };
  }, [localStream]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-950/95 border border-white/10 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white tracking-wide">
            Audio & Video Settings
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera Preview */}
        {localStream && localStream.getVideoTracks().length > 0 && (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-white/10">
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[11px] text-gray-300">
              Camera Preview
            </span>
          </div>
        )}

        {/* Neural Noise Suppression (RNNoise WASM) */}
        <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400" />
              <div>
                <span className="text-xs font-semibold text-white">Neural Noise Cancellation</span>
                <p className="text-[11px] text-cyan-200/70">RNNoise WebAssembly & AudioWorklet</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isNoiseSuppressionEnabled}
                onChange={(e) => setIsNoiseSuppressionEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500" />
            </label>
          </div>
          <p className="text-[11px] text-gray-400 leading-normal">
            Suppresses keyboard typing, dog barking, and fan noise on your device using client-side
            AI before sending into WebRTC.
          </p>
        </div>

        {/* Microphone Selection & Live Meter */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-300">
            <Mic size={14} className="text-indigo-400" />
            <span>Microphone</span>
          </label>
          <select
            value={selectedAudioInput}
            onChange={(e) => setSelectedAudioInput(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">Default Microphone</option>
            {availableDevices.audioInputs.map((device, idx) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${idx + 1}`}
              </option>
            ))}
          </select>

          {/* Live Mic Volume Level Meter */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>Input Level</span>
              <span>{micLevel}%</span>
            </div>
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-emerald-500 via-teal-400 to-indigo-500 transition-all duration-75"
                style={{ width: `${micLevel}%` }}
              />
            </div>
          </div>
        </div>

        {/* Discord-style Voice Activity Detection & Noise Gate */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders size={15} className="text-emerald-400" />
              <div>
                <span className="text-xs font-semibold text-white">Voice Activity Detection</span>
                <p className="text-[11px] text-gray-400">Automatic Noise Gate (Discord style)</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isVADEnabled}
                onChange={(e) => setIsVADEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          {isVADEnabled && (
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-300 font-medium">Noise Gate Sensitivity</span>
                <span className="text-emerald-400 font-mono font-semibold">
                  {noiseGateThreshold} dB
                </span>
              </div>
              <input
                type="range"
                min="-80"
                max="-20"
                step="1"
                value={noiseGateThreshold}
                onChange={(e) => setNoiseGateThreshold(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>-80 dB (Sensitive)</span>
                <span>-20 dB (Strict)</span>
              </div>

              {/* Real-time Meter with Gate Indicator Needle */}
              <div className="relative h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden mt-1 border border-white/5">
                <div
                  className={`h-full transition-all duration-75 ${
                    localIsSpeaking
                      ? 'bg-linear-to-r from-emerald-500 to-teal-400'
                      : 'bg-zinc-600 opacity-60'
                  }`}
                  style={{ width: `${currentAudioLevel || micLevel}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-10 shadow-[0_0_4px_rgba(244,63,94,0.8)]"
                  style={{
                    left: `${Math.max(0, Math.min(100, Math.round(((noiseGateThreshold + 80) / 60) * 100)))}%`,
                  }}
                  title={`Threshold: ${noiseGateThreshold} dB`}
                />
              </div>
              <p className="text-[10px] text-gray-400 italic">
                {localIsSpeaking
                  ? '🟢 Gate Open (Transmitting voice)'
                  : '⚪ Gate Closed (Suppressing silence)'}
              </p>
            </div>
          )}
        </div>

        {/* Push-to-Talk (PTT) with Audio Hangover Tail */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio size={15} className="text-amber-400" />
              <div>
                <span className="text-xs font-semibold text-white">Push-to-Talk (PTT)</span>
                <p className="text-[11px] text-gray-400">Hold Spacebar to speak (Walkie-Talkie)</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPTTEnabled}
                onChange={(e) => setIsPTTEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
            </label>
          </div>

          {isPTTEnabled && (
            <div className="space-y-3 pt-1 border-t border-white/5">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-300 font-medium">Release Tail Hangover</span>
                  <span className="text-amber-400 font-mono font-semibold">
                    {pttReleaseTailMs} ms
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="600"
                  step="50"
                  value={pttReleaseTailMs}
                  onChange={(e) => setPttReleaseTailMs(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>100 ms (Fast mute)</span>
                  <span>600 ms (Prevent clipping)</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-gray-300">Radio Chirp Sound Effects</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPTTSoundEnabled}
                    onChange={(e) => setIsPTTSoundEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500" />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Spatial Audio / 3D-Sound (Discord / Stage Vibe) */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Headphones size={15} className="text-violet-400" />
              <div>
                <span className="text-xs font-semibold text-white">Spatial Audio (3D-Звук)</span>
                <p className="text-[11px] text-gray-400">Binaural HRTF Stage Positioning</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSpatialAudioEnabled}
                onChange={(e) => setIsSpatialAudioEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500" />
            </label>
          </div>
          <p className="text-[11px] text-gray-400 leading-normal">
            Собеседник слева звучит в левом ухе, собеседник справа — в правом. Создает эффект
            нахождения в одной комнате.
          </p>
        </div>

        {/* Dynamic Head Tracking (MediaPipe HRTF) */}
        {isSpatialAudioEnabled && (
          <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass size={15} className="text-violet-400" />
                <div>
                  <span className="text-xs font-semibold text-white">Dynamic Head Tracking</span>
                  <p className="text-[11px] text-violet-200/70">
                    MediaPipe Face Mesh + HRTF 3D Orientation
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHeadTrackingEnabled}
                  onChange={(e) => setIsHeadTrackingEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500" />
              </label>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              Отслеживает поворот головы через селфи-камеру. Поворот головы влево плавно смещает
              голос собеседника в правое ухо — точно как в Apple AirPods Max.
            </p>
            {isHeadTrackingEnabled && (
              <div className="flex items-center justify-between pt-1 text-[11px] font-mono bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                <span className="text-gray-400">Head Attitude:</span>
                <div className="flex gap-2.5">
                  <span className="text-violet-300">Yaw: {headAngles.yaw}°</span>
                  <span className="text-cyan-300">Pitch: {headAngles.pitch}°</span>
                  <span className="text-emerald-300">Roll: {headAngles.roll}°</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sidechain Audio Ducking */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music size={15} className="text-pink-400" />
              <div>
                <span className="text-xs font-semibold text-white">Sidechain Audio Ducking</span>
                <p className="text-[11px] text-gray-400">
                  Auto-attenuate screen audio when speaking
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSidechainDuckingEnabled}
                onChange={(e) => setIsSidechainDuckingEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500" />
            </label>
          </div>
          <p className="text-[11px] text-gray-400 leading-normal">
            Автоматически и плавно приглушает системный звук экрана на 75%, когда вы говорите в
            микрофон, сохраняя голос разборчивым.
          </p>
        </div>

        {/* Voice Modifiers (Voice FX) */}
        <div className="space-y-2">
          <label className="flex items-center justify-between text-xs font-medium text-gray-300">
            <span className="flex items-center gap-2">
              <Mic2 size={14} className="text-amber-400" />
              <span>Voice Modifiers (Voice FX)</span>
            </span>
            <span className="text-[11px] text-gray-400 capitalize">{voiceFX}</span>
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { id: 'none', label: 'Clear', icon: '🎙️' },
              { id: 'robot', label: 'Robot', icon: '🤖' },
              { id: 'radio', label: 'Radio', icon: '📻' },
              { id: 'deep', label: 'Deep', icon: '🗣️' },
              { id: 'cosmic', label: 'Cosmic', icon: '🌌' },
            ].map((fx) => (
              <button
                key={fx.id}
                type="button"
                onClick={() => setVoiceFX(fx.id as any)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs transition-all border ${
                  voiceFX === fx.id
                    ? 'bg-amber-600/30 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                    : 'bg-zinc-900 border-white/10 text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span className="text-base mb-1">{fx.icon}</span>
                <span className="text-[10px] truncate w-full text-center">{fx.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Camera Selection */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-300">
            <Video size={14} className="text-indigo-400" />
            <span>Camera</span>
          </label>
          <select
            value={selectedVideoInput}
            onChange={(e) => setSelectedVideoInput(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">Default Camera</option>
            {availableDevices.videoInputs.map((device, idx) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* Preferred Video Codec (SDP Munging) */}
        <div className="space-y-2">
          <label className="flex items-center justify-between text-xs font-medium text-gray-300">
            <span className="flex items-center gap-2">
              <Layers size={14} className="text-cyan-400" />
              <span>Preferred Video Codec (SDP Munging)</span>
            </span>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono border border-cyan-500/30 uppercase">
              {preferredVideoCodec}
            </span>
          </label>
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            {[
              { id: 'av1', label: 'AV1', desc: '50% less bitrate' },
              { id: 'vp9', label: 'VP9 SVC', desc: 'Scalable layers' },
              { id: 'h264', label: 'H.264', desc: 'Hardware acc.' },
              { id: 'vp8', label: 'VP8', desc: 'Legacy standard' },
            ].map((codec) => (
              <button
                key={codec.id}
                type="button"
                onClick={() => setPreferredVideoCodec(codec.id as any)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs transition-all border ${
                  preferredVideoCodec === codec.id
                    ? 'bg-cyan-600/30 border-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                    : 'bg-zinc-900 border-white/10 text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span className="font-semibold text-[11px]">{codec.label}</span>
                <span className="text-[9px] text-gray-400 mt-0.5 text-center leading-tight">
                  {codec.desc}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400">
            {preferredVideoCodec === 'av1'
              ? '⚡ AV1 обеспечивает качество 1080p при снижении битрейта на 40–50%.'
              : preferredVideoCodec === 'vp9'
                ? '📶 VP9 SVC кодирует поток с пространственными слоями без SFU-сервера.'
                : 'Совместимость с любыми аппаратными декодерами.'}
          </p>
        </div>

        {/* WebGPU AI Super-Resolution (DLSS / FSR 4K Upscale) */}
        <div className="space-y-2">
          <label className="flex items-center justify-between text-xs font-medium text-gray-300">
            <span className="flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              <span>WebGPU AI Super-Resolution</span>
            </span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono border border-amber-500/30 uppercase">
              {webGpuSuperResMode}
            </span>
          </label>
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            {[
              { id: 'off', label: 'Off', desc: 'Native WebRTC' },
              { id: 'cas', label: 'CAS', desc: 'Contrast-Adaptive' },
              { id: 'fsr_2x', label: 'FSR 2x', desc: 'Edge-preserving' },
              { id: 'neural_4k', label: 'Neural 4K', desc: 'GPU upscale' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setWebGpuSuperResMode(mode.id as any)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs transition-all border ${
                  webGpuSuperResMode === mode.id
                    ? 'bg-amber-600/30 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                    : 'bg-zinc-900 border-white/10 text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span className="font-semibold text-[11px]">{mode.label}</span>
                <span className="text-[9px] text-gray-400 mt-0.5 text-center leading-tight">
                  {mode.desc}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400">
            {webGpuSuperResMode === 'off'
              ? 'Стандартный рендеринг WebRTC.'
              : webGpuSuperResMode === 'cas'
                ? 'Резкость на базе Contrast-Adaptive Sharpening через WebGPU Compute Shader.'
                : webGpuSuperResMode === 'fsr_2x'
                  ? 'FSR 2x: реконструкция граней без размытия артефактов компрессии.'
                  : '✨ Neural 4K: шейдерная аппроксимация высокого разрешения прямо на GPU.'}
          </p>
        </div>

        {/* WebCodecs Hardware Acceleration */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={15} className="text-emerald-400" />
              <div>
                <span className="text-xs font-semibold text-white">
                  WebCodecs Hardware Pipeline
                </span>
                <p className="text-[11px] text-gray-400">
                  Direct VideoEncoder / VideoDecoder via DataChannel
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isWebCodecsEnabled}
                onChange={(e) => setIsWebCodecsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>
          <p className="text-[11px] text-gray-400 leading-normal">
            Обходит внутренний пайплайн WebRTC, кодируя сырые кадры через аппаратный чип видеокарты
            и передавая бинарный поток с ультра-низкой задержкой (&lt;5ms).
          </p>
        </div>

        {/* Ghost Mode (Zero-Knowledge Proof Anonymous Calling) */}
        <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EyeOff size={15} className="text-purple-400" />
              <div>
                <span className="text-xs font-semibold text-white">
                  Ghost Mode (ZKP Анонимный звонок)
                </span>
                <p className="text-[11px] text-purple-200/70">
                  Schnorr Non-Interactive Zero-Knowledge Proof
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isGhostMode}
                onChange={(e) => setIsGhostMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500" />
            </label>
          </div>
          <p className="text-[11px] text-gray-400 leading-normal">
            Математически доказывает подлинность аккаунта и анти-спам репутацию без раскрытия ID
            пользователя, номера телефона или IP-адреса.
          </p>
        </div>

        {/* Virtual Background & Background Blur */}
        <div className="space-y-2">
          <label className="flex items-center justify-between text-xs font-medium text-gray-300">
            <span className="flex items-center gap-2">
              <Wand2 size={14} className="text-violet-400" />
              <span>Virtual Background & Blur</span>
            </span>
            <span className="text-[11px] text-gray-400 capitalize">{virtualBackground}</span>
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { id: 'none', label: 'None', icon: '🚫' },
              { id: 'blur', label: 'Blur', icon: '🌫️' },
              { id: 'office', label: 'Office', icon: '🏢' },
              { id: 'cyber', label: 'Cyber', icon: '🌆' },
              { id: 'nature', label: 'Nature', icon: '🌿' },
            ].map((bg) => (
              <button
                key={bg.id}
                type="button"
                onClick={() => setVirtualBackground(bg.id as any)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs transition-all border ${
                  virtualBackground === bg.id
                    ? 'bg-violet-600/30 border-violet-500 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-zinc-900 border-white/10 text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span className="text-base mb-1">{bg.icon}</span>
                <span className="text-[10px] truncate w-full text-center">{bg.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Speaker Output Selection */}
        {availableDevices.audioOutputs.length > 0 && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-300">
              <Volume2 size={14} className="text-indigo-400" />
              <span>Speaker Output</span>
            </label>
            <select
              value={selectedAudioOutput}
              onChange={(e) => setSelectedAudioOutput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="">Default Speaker</option>
              {availableDevices.audioOutputs.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Speaker ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Network & E2EE Diagnostics */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
            <div className="flex items-center gap-1.5">
              <Activity size={14} className="text-emerald-400" />
              <span>Network & E2EE Diagnostics</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400">
              <ShieldCheck size={12} />
              <span>SAS: {sasCode || '—'}</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
            <div className="bg-black/40 rounded-lg p-2 border border-white/5">
              <div className="text-gray-400 text-[10px]">Bitrate</div>
              <div className="font-semibold text-white">
                {networkStats ? `${networkStats.bitrate}k` : 'Auto'}
              </div>
            </div>
            <div className="bg-black/40 rounded-lg p-2 border border-white/5">
              <div className="text-gray-400 text-[10px]">Loss</div>
              <div className="font-semibold text-emerald-400">
                {networkStats ? `${networkStats.packetLoss}%` : '0%'}
              </div>
            </div>
            <div className="bg-black/40 rounded-lg p-2 border border-white/5">
              <div className="text-gray-400 text-[10px]">RTT</div>
              <div className="font-semibold text-white">
                {networkStats ? `${networkStats.rtt}ms` : '<30ms'}
              </div>
            </div>
            <div className="bg-black/40 rounded-lg p-2 border border-white/5">
              <div className="text-gray-400 text-[10px]">Jitter</div>
              <div className="font-semibold text-white">
                {networkStats ? `${networkStats.jitter}ms` : '<5ms'}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/5">
            <span>NAT Route Topology:</span>
            <span
              className={
                isPeerRelayActive ? 'text-amber-400 font-medium' : 'text-emerald-400 font-medium'
              }
            >
              {isPeerRelayActive
                ? '🛡️ P2P Mesh Relay (Community TURN)'
                : '⚡ Direct P2P (Open NAT / STUN)'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/5">
            <span>Signaling Transport:</span>
            <span
              className={
                transportProtocol === 'quic'
                  ? 'text-cyan-400 font-medium'
                  : 'text-gray-300 font-medium'
              }
            >
              {transportProtocol === 'quic'
                ? `⚡ HTTP/3 QUIC (WebTransport ${quicStats ? `• ${quicStats.datagramsSent} dgrams` : ''})`
                : '🌐 WebSocket (TCP)'}
            </span>
          </div>
        </div>

        {/* Chaos Engineering & P2P Lab (Тестирование в аду) */}
        <div className="p-3.5 rounded-xl bg-linear-to-br from-rose-950/30 via-zinc-900/80 to-amber-950/20 border border-rose-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center border border-rose-500/40">
                <Flame size={14} className="text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white">
                    Chaos Engineering & P2P Lab
                  </span>
                  {chaosConfig.preset !== 'clean' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse">
                      Active Chaos
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-rose-200/70">Adversarial network & stress testing</p>
              </div>
            </div>

            {chaosConfig.preset !== 'clean' && (
              <button
                onClick={() => setChaosPreset('clean')}
                className="px-2 py-1 rounded-lg text-[10px] bg-zinc-800 hover:bg-zinc-700 text-gray-300 transition-colors border border-white/10"
              >
                Reset
              </button>
            )}
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                { id: 'clean', label: 'Clean', sub: '0% Loss' },
                { id: 'slow_3g', label: '3G Slow', sub: '400ms RTT' },
                { id: 'tunnel_hell', label: 'Tunnel Hell', sub: '30% Loss' },
                { id: 'blackhole', label: 'Blackhole', sub: '100% Drop' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                onClick={() => setChaosPreset(preset.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all border ${
                  chaosConfig.preset === preset.id
                    ? 'bg-rose-600/30 border-rose-500 text-white shadow-md shadow-rose-600/20'
                    : 'bg-zinc-900/90 border-white/10 text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span className="text-[11px] font-medium">{preset.label}</span>
                <span className="text-[9px] opacity-70 truncate w-full">{preset.sub}</span>
              </button>
            ))}
          </div>

          {/* Sliders for Custom Fine-Tuning */}
          <div className="space-y-2.5 pt-1">
            {/* Packet Loss Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-gray-300">
                <span className="flex items-center gap-1">
                  <AlertTriangle size={11} className="text-amber-400" />
                  <span>Packet Loss</span>
                </span>
                <span className="font-semibold text-rose-400">
                  {Math.round(chaosConfig.packetLossRatio * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={chaosConfig.packetLossRatio}
                onChange={(e) =>
                  setChaosConfig({
                    packetLossRatio: parseFloat(e.target.value),
                    preset: 'custom',
                  })
                }
                className="w-full accent-rose-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* RTT Delay & Jitter */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-gray-300">
                  <span>Latency</span>
                  <span className="font-semibold text-amber-400">{chaosConfig.rttDelayMs}ms</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="50"
                  value={chaosConfig.rttDelayMs}
                  onChange={(e) =>
                    setChaosConfig({
                      rttDelayMs: parseInt(e.target.value, 10),
                      preset: 'custom',
                    })
                  }
                  className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-gray-300">
                  <span>Jitter</span>
                  <span className="font-semibold text-amber-300">±{chaosConfig.jitterMs}ms</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="25"
                  value={chaosConfig.jitterMs}
                  onChange={(e) =>
                    setChaosConfig({
                      jitterMs: parseInt(e.target.value, 10),
                      preset: 'custom',
                    })
                  }
                  className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Bandwidth Limiter */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-gray-300">
                <span>Bandwidth Throttle</span>
                <span className="font-semibold text-indigo-400">
                  {chaosConfig.bandwidthLimitKbps === 0
                    ? 'Unlimited'
                    : `${chaosConfig.bandwidthLimitKbps} kbps`}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 pt-0.5">
                {[0, 32, 64, 128, 256].map((bw) => (
                  <button
                    key={bw}
                    type="button"
                    onClick={() =>
                      setChaosConfig({
                        bandwidthLimitKbps: bw,
                        preset: 'custom',
                      })
                    }
                    className={`py-1 rounded text-[10px] font-medium border transition-colors ${
                      chaosConfig.bandwidthLimitKbps === bw
                        ? 'bg-indigo-600/30 border-indigo-500 text-white'
                        : 'bg-zinc-900 border-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    {bw === 0 ? 'Max' : `${bw}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* Programmatic Network Flapping */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 mt-1">
              <div className="flex items-center gap-2">
                <RefreshCw
                  size={14}
                  className={`text-rose-400 ${chaosConfig.isFlapping ? 'animate-spin' : ''}`}
                />
                <div>
                  <div className="text-[11px] font-medium text-white">Network Flapping Mode</div>
                  <div className="text-[9px] text-gray-400">Drop peer connection every 5s</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={chaosConfig.isFlapping}
                  onChange={(e) =>
                    setChaosConfig({
                      isFlapping: e.target.checked,
                      preset: 'custom',
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-500" />
              </label>
            </div>
          </div>
        </div>

        {/* Satellite & Extreme Networks (Starlink / In-Flight Wi-Fi) */}
        <div className="p-3.5 rounded-xl bg-sky-950/20 border border-sky-500/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-sky-400" />
              <div>
                <span className="text-xs font-semibold text-white">
                  Satellite & Extreme Networks
                </span>
                <p className="text-[11px] text-sky-200/70">
                  Starlink / GEO / Airplane Wi-Fi Delay Optimizer
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSatelliteModeEnabled}
                onChange={(e) => setIsSatelliteModeEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500" />
            </label>
          </div>
          <p className="text-[11px] text-gray-400 leading-normal">
            Adaptive GCC gradient evaluation replaces static RTT throttling. Prevents video collapse
            over 600+ ms satellite propagation, absorbs 15s beam handoff jitter spikes, and boosts
            Opus FEC resilience up to 20% packet loss.
          </p>

          {isSatelliteModeEnabled && (
            <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-black/40 border border-white/5 text-[10px]">
              <div>
                <span className="text-gray-400 block">Baseline RTT</span>
                <span className="font-semibold text-sky-400">
                  {networkStats?.baselineRtt !== undefined ? `${networkStats.baselineRtt}ms` : '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Delay Gradient</span>
                <span className="font-semibold text-emerald-400">
                  {networkStats?.delayGradient !== undefined
                    ? `+${networkStats.delayGradient}ms`
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Link Type</span>
                <span className="font-semibold text-indigo-400">
                  {networkStats?.isSatellite ? 'Satellite (NTN)' : 'Terrestrial'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Traveler / Eco-Mode (Battery & Data Saver) */}
        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-emerald-400" />
              <div>
                <span className="text-xs font-semibold text-white">Traveler / Eco-Mode</span>
                <p className="text-[11px] text-emerald-200/70">4G Data & Battery Optimization</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isTravelerModeEnabled}
                onChange={(e) => setIsTravelerModeEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>
          <p className="text-[11px] text-gray-400 leading-normal">
            Reduces bandwidth by &gt;80%: pauses incoming video rendering, limits Opus audio to 12
            kbps speech, caps animations at 15 FPS, and suspends background WebGPU processing.
          </p>
        </div>

        {/* Accessibility & Deaf Notification Assist */}
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing size={16} className="text-amber-400" />
              <div>
                <span className="text-xs font-semibold text-white">
                  Visual Flash & Tactile Ringing
                </span>
                <p className="text-[11px] text-amber-200/70">
                  Accessibility cue for Deaf & Hard-of-Hearing
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isVisualRingingEnabled}
                onChange={(e) => setIsVisualRingingEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
            </label>
          </div>
          <p className="text-[11px] text-gray-400 leading-normal">
            Flashes the display viewport border with an emerald strobe glow and emits pulsating
            haptic vibrations via Vibration API on mobile devices during incoming call rings.
          </p>
        </div>

        {/* Synesthetic Speech Audio Visualizer (A11Y) */}
        <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400" />
              <div>
                <span className="text-xs font-semibold text-white">
                  Синестетический визуалайзер речи
                </span>
                <p className="text-[11px] text-cyan-200/70">
                  Тонально-цветовая подсветка для чтения по губам
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSynestheticVisualizerEnabled}
                onChange={(e) => setIsSynestheticVisualizerEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500" />
            </label>
          </div>
          <p className="text-[11px] text-gray-400 leading-normal">
            Отрисовывает пульсирующую цветную ауру вокруг видео плитки собеседника, отображая высоту
            тона (синий/зеленый/красный) и амплитуду речи без субтитров.
          </p>
        </div>

        {/* Voice-to-UI Hands-Free Command Engine */}
        <div className="p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic2 size={16} className="text-violet-400" />
              <div>
                <span className="text-xs font-semibold text-white">
                  Голосовое управление (Hands-Free)
                </span>
                <p className="text-[11px] text-violet-200/70">
                  Распознавание команд управления звонком через микрофон
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isVoiceCommandsEnabled}
                onChange={(e) => setIsVoiceCommandsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500" />
            </label>
          </div>
          <p className="text-[11px] text-gray-400 leading-normal">
            Позволяет отдавать быстрые команды («Заглушить микрофон», «Включить камеру», «Поднять
            руку», «Показать чат», «Завершить звонок») без нажатия кнопок.
          </p>
        </div>

        {/* WebGL Multi-Video Grid Virtualizer */}
        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-emerald-400" />
              <div>
                <span className="text-xs font-semibold text-white">
                  Виртуализация видеосетки (WebGL Grid)
                </span>
                <p className="text-[11px] text-emerald-200/70">
                  Рендеринг всех видеопотоков в 1 draw call на общем Canvas
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isWebGLGridEnabled}
                onChange={(e) => setIsWebGLGridEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>
          <p className="text-[11px] text-gray-400 leading-normal">
            Объединяет до 50 входящих видеопотоков в единый аппаратный WebGL-холст, предотвращая
            перегрузку видеодекодера и просадки FPS при большом количестве участников.
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-md shadow-indigo-600/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
