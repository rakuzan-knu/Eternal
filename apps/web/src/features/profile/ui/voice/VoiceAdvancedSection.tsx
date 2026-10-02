import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  X,
  Activity,
  ShieldCheck,
  Flame,
  Radio,
  Compass,
  EyeOff,
  BellRing,
  Sparkles,
  Mic2,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { useVoiceVideoSettingsStore } from '@/features/chat/model/useVoiceVideoSettingsStore';
import { useSoundSettingsStore } from '@/features/chat/model/useSoundSettingsStore';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { useCallStore } from '@/features/chat/model/callStore';

export const VoiceAdvancedSection: React.FC = () => {
  const accentColor = useThemeStore((s) => s.accentColor) || '#5865F2';
  const {
    streamOverlay,
    setStreamOverlay,
    isGhostMode,
    setIsGhostMode,
    isSatelliteModeEnabled,
    setIsSatelliteModeEnabled,
    isTravelerModeEnabled,
    setIsTravelerModeEnabled,
    isSynestheticVisualizerEnabled,
    setIsSynestheticVisualizerEnabled,
    isVisualRingingEnabled,
    setIsVisualRingingEnabled,
    isVoiceCommandsEnabled,
    setIsVoiceCommandsEnabled,
    isWebGLGridEnabled,
    setIsWebGLGridEnabled,
    resetAllSettings,
  } = useVoiceVideoSettingsStore();

  const { setAllSounds } = useSoundSettingsStore();

  // Call Store live telemetry & chaos state
  const {
    networkStats,
    sasCode,
    isPeerRelayActive,
    transportProtocol,
    quicStats,
    chaosConfig,
    setChaosConfig,
    setChaosPreset,
  } = useCallStore();

  const [isDiagnosticsExpanded, setIsDiagnosticsExpanded] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetSuccess, setIsResetSuccess] = useState(false);

  const handleConfirmReset = () => {
    resetAllSettings();
    setAllSounds(true);
    setIsResetConfirmOpen(false);
    setIsResetSuccess(true);
    setTimeout(() => {
      setIsResetSuccess(false);
    }, 3000);
  };

  return (
    <section
      id="sec-advanced-voice"
      className="flex flex-col gap-6 pt-6 border-t border-black/10 dark:border-white/[0.06]"
    >
      <div>
        <h3 className="text-xl font-bold text-gray-950 dark:text-white">Advanced</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Advanced encryption, network topology, hardware optimization, and accessibility settings
        </p>
      </div>

      {/* 1. Network & Privacy Modes */}
      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
          Network & Privacy Modes
        </h4>

        {/* Ghost Mode (Schnorr ZKP) */}
        <div className="flex items-center justify-between py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="pr-4 min-w-0">
            <div className="flex items-center gap-2">
              <EyeOff size={16} className="text-purple-400 shrink-0" />
              <span className="text-sm font-semibold text-gray-950 dark:text-white block">
                Ghost Mode (ZKP Anonymous Call)
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              Schnorr Non-Interactive Zero-Knowledge Proof. Proves account authenticity and
              reputation without disclosing ID, phone number, or IP address.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isGhostMode}
              onChange={(e) => setIsGhostMode(e.target.checked)}
              className="sr-only peer"
            />
            <div
              style={{
                backgroundColor: isGhostMode ? accentColor : undefined,
              }}
              className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                isGhostMode ? '' : 'bg-black/15 dark:bg-zinc-700'
              } relative`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                  isGhostMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </label>
        </div>

        {/* Traveler / Eco-Mode */}
        <div className="flex items-center justify-between py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="pr-4 min-w-0">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-gray-950 dark:text-white block">
                Traveler / Eco Mode
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              Reduces bandwidth usage by over 80%: caps Opus audio stream to 12 kbps, pauses
              incoming video decoding, and saves battery life.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isTravelerModeEnabled}
              onChange={(e) => setIsTravelerModeEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div
              style={{
                backgroundColor: isTravelerModeEnabled ? accentColor : undefined,
              }}
              className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                isTravelerModeEnabled ? '' : 'bg-black/15 dark:bg-zinc-700'
              } relative`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                  isTravelerModeEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </label>
        </div>

        {/* Satellite & Extreme Networks (Starlink delay optimizer) */}
        <div className="flex flex-col gap-2 py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="pr-4 min-w-0">
              <div className="flex items-center gap-2">
                <Radio size={16} className="text-sky-400 shrink-0" />
                <span className="text-sm font-semibold text-gray-950 dark:text-white block">
                  Satellite & Extreme Networks
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                Adaptive GCC delay gradient estimation instead of static RTT throttling. Prevents
                video collapse at 600+ ms latency and smooths Starlink jitter spikes.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={isSatelliteModeEnabled}
                onChange={(e) => setIsSatelliteModeEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div
                style={{
                  backgroundColor: isSatelliteModeEnabled ? accentColor : undefined,
                }}
                className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                  isSatelliteModeEnabled ? '' : 'bg-black/15 dark:bg-zinc-700'
                } relative`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                    isSatelliteModeEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </label>
          </div>

          {isSatelliteModeEnabled && (
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/5 text-[11px] font-mono mt-1">
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-[10px]">
                  Baseline RTT:
                </span>
                <span className="font-semibold text-sky-500 dark:text-sky-400">
                  {networkStats?.baselineRtt !== undefined ? `${networkStats.baselineRtt}ms` : '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-[10px]">
                  Delay Gradient:
                </span>
                <span className="font-semibold text-emerald-500 dark:text-emerald-400">
                  {networkStats?.delayGradient !== undefined
                    ? `+${networkStats.delayGradient}ms`
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-[10px]">
                  Link Type:
                </span>
                <span className="font-semibold text-indigo-500 dark:text-indigo-400">
                  {networkStats?.isSatellite ? 'Satellite (NTN)' : 'Terrestrial'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Accessibility & A11Y Assist */}
      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
          Accessibility & Assistive Features
        </h4>

        {/* Visual Flash & Tactile Ringing */}
        <div className="flex items-center justify-between py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="pr-4 min-w-0">
            <div className="flex items-center gap-2">
              <BellRing size={16} className="text-amber-400 shrink-0" />
              <span className="text-sm font-semibold text-gray-950 dark:text-white block">
                Visual & Haptic Call Alert
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              Pulsing screen edge highlight and device vibration for incoming calls for
              hard-of-hearing users.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isVisualRingingEnabled}
              onChange={(e) => setIsVisualRingingEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div
              style={{
                backgroundColor: isVisualRingingEnabled ? accentColor : undefined,
              }}
              className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                isVisualRingingEnabled ? '' : 'bg-black/15 dark:bg-zinc-700'
              } relative`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                  isVisualRingingEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </label>
        </div>

        {/* Synesthetic Speech Audio Visualizer */}
        <div className="flex items-center justify-between py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="pr-4 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-cyan-400 shrink-0" />
              <span className="text-sm font-semibold text-gray-950 dark:text-white block">
                Synesthetic Speech Visualizer
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              Tonal color halo around speaker video visualizing voice pitch and amplitude without
              subtitles.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isSynestheticVisualizerEnabled}
              onChange={(e) => setIsSynestheticVisualizerEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div
              style={{
                backgroundColor: isSynestheticVisualizerEnabled ? accentColor : undefined,
              }}
              className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                isSynestheticVisualizerEnabled ? '' : 'bg-black/15 dark:bg-zinc-700'
              } relative`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                  isSynestheticVisualizerEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </label>
        </div>

        {/* Hands-Free Voice Commands Engine */}
        <div className="flex items-center justify-between py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="pr-4 min-w-0">
            <div className="flex items-center gap-2">
              <Mic2 size={16} className="text-violet-400 shrink-0" />
              <span className="text-sm font-semibold text-gray-950 dark:text-white block">
                Hands-Free Voice Commands
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              Speech recognition for call controls ("Mute mic", "Enable camera", "End call") without
              pressing keys.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isVoiceCommandsEnabled}
              onChange={(e) => setIsVoiceCommandsEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div
              style={{
                backgroundColor: isVoiceCommandsEnabled ? accentColor : undefined,
              }}
              className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                isVoiceCommandsEnabled ? '' : 'bg-black/15 dark:bg-zinc-700'
              } relative`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                  isVoiceCommandsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </label>
        </div>
      </div>

      {/* 3. Video Grid Virtualization */}
      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
          Rendering & Virtualization
        </h4>

        {/* WebGL Multi-Video Grid */}
        <div className="flex items-center justify-between py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="pr-4 min-w-0">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-gray-950 dark:text-white block">
                Video Grid Virtualization (WebGL Grid)
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              Combines video streams into a unified WebGL Canvas draw call, preventing decoder
              overload and FPS drops in group calls.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isWebGLGridEnabled}
              onChange={(e) => setIsWebGLGridEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div
              style={{
                backgroundColor: isWebGLGridEnabled ? accentColor : undefined,
              }}
              className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                isWebGLGridEnabled ? '' : 'bg-black/15 dark:bg-zinc-700'
              } relative`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                  isWebGLGridEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </label>
        </div>
      </div>

      {/* 4. Diagnostics Settings Accordion (Discord 1:1) */}
      <div className="flex flex-col">
        {!isDiagnosticsExpanded ? (
          <div
            onClick={() => setIsDiagnosticsExpanded(true)}
            className="flex items-center justify-between py-2 cursor-pointer group transition-colors"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsDiagnosticsExpanded(true);
              }
            }}
          >
            <div className="pr-4 min-w-0">
              <span className="text-sm font-semibold text-gray-950 dark:text-white block">
                Show Diagnostics Settings
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                Settings for technical diagnostic information, debug log telemetry, E2EE
                verification, and network stress tests.
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDiagnosticsExpanded(true);
              }}
              className="w-9 h-9 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* Header when expanded */}
            <div
              onClick={() => setIsDiagnosticsExpanded(false)}
              className="flex items-center justify-between py-2 cursor-pointer group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsDiagnosticsExpanded(false);
                }
              }}
            >
              <span className="text-sm font-semibold text-gray-950 dark:text-white">
                Hide Diagnostics Settings
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDiagnosticsExpanded(false);
                }}
                className="w-9 h-9 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                <ChevronUp size={18} />
              </button>
            </div>

            {/* Diagnostic Item: Stream Information Overlay */}
            <div className="flex items-center justify-between py-2 border-t border-black/[0.06] dark:border-white/[0.06]">
              <div className="pr-4 min-w-0">
                <span className="text-sm font-semibold text-gray-950 dark:text-white block">
                  Stream Information Overlay
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  Display stream information on video hover
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={streamOverlay}
                  onChange={(e) => setStreamOverlay(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  style={{
                    backgroundColor: streamOverlay ? accentColor : undefined,
                  }}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                    streamOverlay ? '' : 'bg-black/15 dark:bg-zinc-700'
                  } relative`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                      streamOverlay ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* Network & E2EE Diagnostics Panel */}
            <div className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-950 dark:text-white">
                <div className="flex items-center gap-1.5">
                  <Activity size={15} className="text-emerald-500 dark:text-emerald-400" />
                  <span>Network & E2EE Diagnostics</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-500 dark:text-emerald-400 font-mono">
                  <ShieldCheck size={13} />
                  <span>SAS: {sasCode || '—'}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                <div className="bg-white/80 dark:bg-black/40 rounded-xl p-2 border border-black/5 dark:border-white/5 shadow-2xs">
                  <div className="text-gray-400 text-[10px]">Bitrate</div>
                  <div className="font-semibold text-gray-900 dark:text-white font-mono">
                    {networkStats ? `${networkStats.bitrate}k` : 'Auto'}
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-black/40 rounded-xl p-2 border border-black/5 dark:border-white/5 shadow-2xs">
                  <div className="text-gray-400 text-[10px]">Loss</div>
                  <div className="font-semibold text-emerald-500 dark:text-emerald-400 font-mono">
                    {networkStats ? `${networkStats.packetLoss}%` : '0%'}
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-black/40 rounded-xl p-2 border border-black/5 dark:border-white/5 shadow-2xs">
                  <div className="text-gray-400 text-[10px]">RTT</div>
                  <div className="font-semibold text-gray-900 dark:text-white font-mono">
                    {networkStats ? `${networkStats.rtt}ms` : '<30ms'}
                  </div>
                </div>
                <div className="bg-white/80 dark:bg-black/40 rounded-xl p-2 border border-black/5 dark:border-white/5 shadow-2xs">
                  <div className="text-gray-400 text-[10px]">Jitter</div>
                  <div className="font-semibold text-gray-900 dark:text-white font-mono">
                    {networkStats ? `${networkStats.jitter}ms` : '<5ms'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-black/5 dark:border-white/5">
                <span>NAT Topology:</span>
                <span
                  className={
                    isPeerRelayActive
                      ? 'text-amber-500 dark:text-amber-400 font-medium'
                      : 'text-emerald-500 dark:text-emerald-400 font-medium'
                  }
                >
                  {isPeerRelayActive
                    ? '🛡️ P2P Mesh Relay (Community TURN)'
                    : '⚡ Direct P2P (Open NAT / STUN)'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-black/5 dark:border-white/5">
                <span>Signaling Transport:</span>
                <span
                  className={
                    transportProtocol === 'quic'
                      ? 'text-cyan-500 dark:text-cyan-400 font-medium font-mono'
                      : 'text-gray-700 dark:text-gray-300 font-medium'
                  }
                >
                  {transportProtocol === 'quic'
                    ? `⚡ HTTP/3 QUIC (WebTransport ${quicStats ? `• ${quicStats.datagramsSent} dgrams` : ''})`
                    : '🌐 WebSocket (TCP)'}
                </span>
              </div>
            </div>

            {/* Chaos Engineering & P2P Lab */}
            <div className="p-3.5 rounded-2xl bg-rose-500/[0.04] dark:bg-rose-950/20 border border-rose-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                    <Flame size={14} className="text-rose-500 dark:text-rose-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-950 dark:text-white">
                        Chaos Engineering & P2P Lab
                      </span>
                      {chaosConfig.preset !== 'clean' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 animate-pulse">
                          Active Chaos
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-rose-500/80 dark:text-rose-200/70">
                      Network stress testing and connection instability simulation
                    </p>
                  </div>
                </div>

                {chaosConfig.preset !== 'clean' && (
                  <button
                    type="button"
                    onClick={() => setChaosPreset('clean')}
                    className="px-2 py-1 rounded-lg text-[10px] bg-black/5 hover:bg-black/10 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 transition-colors border border-black/10 dark:border-white/10 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Presets */}
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
                    type="button"
                    onClick={() => setChaosPreset(preset.id)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all border cursor-pointer ${
                      chaosConfig.preset === preset.id
                        ? 'bg-rose-500/20 border-rose-500 text-rose-600 dark:text-white shadow-sm'
                        : 'bg-white/60 dark:bg-zinc-900/80 border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="text-[11px] font-semibold">{preset.label}</span>
                    <span className="text-[9px] opacity-70 truncate w-full">{preset.sub}</span>
                  </button>
                ))}
              </div>

              {/* Chaos Sliders */}
              <div className="space-y-2.5 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-gray-600 dark:text-gray-300">
                    <span className="flex items-center gap-1">
                      <AlertTriangle size={12} className="text-amber-500" />
                      <span>Packet Loss Simulation</span>
                    </span>
                    <span className="font-semibold text-rose-500 dark:text-rose-400 font-mono">
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
                    className="w-full accent-rose-500 h-1.5 bg-black/10 dark:bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-600 dark:text-gray-300">
                      <span>Latency (RTT)</span>
                      <span className="font-semibold text-amber-500 font-mono">
                        {chaosConfig.rttDelayMs}ms
                      </span>
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
                      className="w-full accent-amber-500 h-1.5 bg-black/10 dark:bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-600 dark:text-gray-300">
                      <span>Jitter</span>
                      <span className="font-semibold text-amber-500 font-mono">
                        ±{chaosConfig.jitterMs}ms
                      </span>
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
                      className="w-full accent-amber-500 h-1.5 bg-black/10 dark:bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Bandwidth Throttle */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-gray-600 dark:text-gray-300">
                    <span>Bandwidth Limit</span>
                    <span className="font-semibold text-indigo-500 dark:text-indigo-400 font-mono">
                      {chaosConfig.bandwidthLimitKbps === 0
                        ? 'No limit'
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
                        className={`py-1 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                          chaosConfig.bandwidthLimitKbps === bw
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-600 dark:text-white'
                            : 'bg-white/60 dark:bg-zinc-900 border-black/10 dark:border-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        {bw === 0 ? 'Max' : `${bw}k`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Network Flapping Mode */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/5 mt-1">
                  <div className="flex items-center gap-2">
                    <RefreshCw
                      size={14}
                      className={`text-rose-500 dark:text-rose-400 ${chaosConfig.isFlapping ? 'animate-spin' : ''}`}
                    />
                    <div>
                      <div className="text-[11px] font-medium text-gray-950 dark:text-white">
                        Network Flapping Mode
                      </div>
                      <div className="text-[9px] text-gray-500 dark:text-gray-400">
                        Drop peer connection every 5 seconds
                      </div>
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
                    <div className="w-8 h-4 bg-zinc-400 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-500" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Reset Button Row (Discord 1:1) */}
      <div className="flex items-center justify-between py-2 border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="pr-4 min-w-0">
          <span className="text-sm font-semibold text-gray-950 dark:text-white block">
            Reset All Voice & Video Settings
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
            {isResetSuccess
              ? '✓ All voice, video, and sound settings have been reset to default!'
              : 'Restores voice and video settings to their defaults.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsResetConfirmOpen(true)}
          className="shrink-0 text-[#f23f43] hover:text-[#fa5252] bg-black/5 hover:bg-black/10 dark:bg-[#2b2d31] dark:hover:bg-[#35373c] border border-black/10 dark:border-white/5 px-4 py-2 text-xs font-semibold rounded-xl transition active:scale-95 shadow-xs cursor-pointer"
        >
          Reset
        </button>
      </div>

      {/* Discord-style Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-sm bg-[#121215] border border-white/[0.1] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-white">
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex flex-col">
                <h4 className="text-base font-bold">Reset Settings?</h4>
                <p className="text-xs text-gray-400 mt-0.5">Voice, video, and sounds</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Are you sure you want to reset all voice, video, and sound settings? All sliders,
              toggles, and volume levels will revert to their original defaults.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="bg-[#da373c] hover:bg-[#c02e33] active:bg-[#a6262b] text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
