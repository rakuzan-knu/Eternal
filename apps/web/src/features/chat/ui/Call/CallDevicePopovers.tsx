import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  Headphones,
  Video,
  Camera,
  ChevronRight,
  Settings,
  Eye,
  X,
  Volume2,
  Check,
} from 'lucide-react';
import {
  useVoiceVideoSettingsStore,
  type InputProfileType,
} from '../../model/useVoiceVideoSettingsStore';
import { useMediaDevices } from '../../model/useMediaDevices';
import { useCallStore } from '../../model/callStore';
import { useUIStore } from '@/shared/model/useUIStore';
import { Slider } from '@/shared/ui/Slider';

/**
 * Real-time microphone audio sensitivity level hook.
 * Reads the raw microphone audio stream via Web Audio API,
 * calculating RMS level independent of the call's muted state.
 */
export function useMicrophoneSensitivity(
  deviceId?: string,
  inputVolume: number = 100,
  isMuted: boolean = false,
  isActive: boolean = true,
) {
  const [level, setLevel] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // If popover is closed, or user is muted, or input volume is 0: immediate zero
    if (!isActive || isMuted || inputVolume === 0) {
      setLevel(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      return;
    }

    let cancelled = false;

    async function startListening() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        if (ctx.state === 'suspended') {
          void ctx.resume();
        }

        const source = ctx.createMediaStreamSource(stream);
        const gainNode = ctx.createGain();
        gainNode.gain.value = Math.max(0, inputVolume) / 100;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.25;

        source.connect(gainNode);
        gainNode.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Noise floor cutoff: ambient room silence yields 0
          if (avg < 2) {
            setLevel(0);
          } else {
            // Speech normalization
            const normalized = Math.min(100, Math.round((avg / 60) * 100));
            setLevel(normalized);
          }

          animFrameRef.current = requestAnimationFrame(tick);
        };

        animFrameRef.current = requestAnimationFrame(tick);
      } catch {
        setLevel(0);
      }
    }

    void startListening();

    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [deviceId, inputVolume, isMuted, isActive]);

  return level;
}

/**
 * Hook to manage smooth mounting and unmounting animations for popovers.
 */
function useAnimatedPresence(isOpen: boolean, durationMs = 160) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsExiting(false);
    } else if (isRendered) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setIsRendered(false);
        setIsExiting(false);
      }, durationMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isRendered, durationMs]);

  return { isRendered, isExiting };
}

/* -------------------------------------------------------------------------- */
/*                        1. MICROPHONE SETTINGS POPOVER                      */
/* -------------------------------------------------------------------------- */

interface MicrophoneSettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleDeafen?: () => void;
}

export function MicrophoneSettingsPopover({
  isOpen,
  onClose,
  onToggleDeafen,
}: MicrophoneSettingsPopoverProps) {
  const { isRendered, isExiting } = useAnimatedPresence(isOpen, 160);
  const [activeSubmenu, setActiveSubmenu] = useState<
    'inputDevice' | 'profile' | 'outputDevice' | null
  >(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const submenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpenSubmenu = (menu: 'inputDevice' | 'profile' | 'outputDevice') => {
    if (submenuTimerRef.current) {
      clearTimeout(submenuTimerRef.current);
      submenuTimerRef.current = null;
    }
    setActiveSubmenu(menu);
  };

  const handleScheduleCloseSubmenu = () => {
    if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current);
    submenuTimerRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 120);
  };

  const handleCancelCloseSubmenu = () => {
    if (submenuTimerRef.current) {
      clearTimeout(submenuTimerRef.current);
      submenuTimerRef.current = null;
    }
  };

  const {
    selectedAudioInput,
    setSelectedAudioInput,
    selectedAudioOutput,
    setSelectedAudioOutput,
    inputProfile,
    setInputProfile,
    inputVolume,
    setInputVolume,
    outputVolume,
    setOutputVolume,
  } = useVoiceVideoSettingsStore();

  const { audioInputs = [], audioOutputs = [] } = useMediaDevices();
  const isMuted = useCallStore((s) => s.isMuted);
  const isDeafened = useCallStore((s) => s.isDeafened);
  const rawMicLevel = useMicrophoneSensitivity(selectedAudioInput, inputVolume, isMuted, isOpen);
  const openEditProfile = useUIStore((s) => s.openEditProfile);

  // Close on outside click or Escape, but ignore click if triggered on the toggle button
  useEffect(() => {
    if (!isOpen) {
      setActiveSubmenu(null);
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-popover-trigger="mic"]')) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current);
    };
  }, [isOpen, onClose]);

  if (!isRendered) return null;

  const currentInputDeviceLabel =
    audioInputs.find((d: MediaDeviceInfo) => d.deviceId === selectedAudioInput)?.label ||
    'Default - Microphone';

  const currentOutputDeviceLabel =
    audioOutputs.find((d: MediaDeviceInfo) => d.deviceId === selectedAudioOutput)?.label ||
    'Default - Speakers';

  const profileLabels: Record<InputProfileType, string> = {
    studio: 'Studio',
    isolation: 'Voice Isolation',
    custom: 'Custom',
  };

  return (
    <div
      ref={containerRef}
      className={`absolute bottom-full mb-3 left-0 sm:-left-2 z-50 select-none transition-all duration-150 ease-out origin-bottom-left ${
        isExiting
          ? 'opacity-0 scale-95 translate-y-2 pointer-events-none'
          : 'opacity-100 scale-100 translate-y-0 animate-in fade-in zoom-in-95'
      }`}
    >
      {/* Main Popover Window */}
      <div className="w-72 sm:w-80 p-3 bg-[#111214]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_12px_48px_rgba(0,0,0,0.85)] text-white">
        {/* Row 1: Input Device */}
        <div
          className="relative"
          onMouseEnter={() => handleOpenSubmenu('inputDevice')}
          onMouseLeave={handleScheduleCloseSubmenu}
        >
          <button
            type="button"
            onClick={() =>
              setActiveSubmenu((prev) => (prev === 'inputDevice' ? null : 'inputDevice'))
            }
            className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer text-left group ${
              activeSubmenu === 'inputDevice' ? 'bg-white/15' : 'hover:bg-white/10'
            }`}
          >
            <div className="min-w-0 pr-2">
              <div className="text-sm font-semibold text-white">Input Device</div>
              <div className="text-xs text-zinc-400 truncate mt-0.5">{currentInputDeviceLabel}</div>
            </div>
            <ChevronRight
              size={16}
              className={`text-zinc-400 group-hover:text-white transition-all duration-150 ${
                activeSubmenu === 'inputDevice' ? 'text-white translate-x-0.5' : ''
              }`}
            />
          </button>

          {/* Submenu Popout: docked flush directly next to Row 1 */}
          {activeSubmenu === 'inputDevice' && (
            <div
              onMouseEnter={handleCancelCloseSubmenu}
              onMouseLeave={handleScheduleCloseSubmenu}
              className="absolute left-full top-0 ml-1 max-sm:left-0 max-sm:top-full max-sm:mt-1 max-sm:ml-0 w-72 sm:w-80 p-2 bg-[#111214]/98 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_12px_48px_rgba(0,0,0,0.9)] text-white max-h-80 overflow-y-auto animate-in fade-in slide-in-from-left-2 duration-150 z-50 before:absolute before:-left-2 before:top-0 before:bottom-0 before:w-2"
            >
              <div className="space-y-1">
                <div className="px-2 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Input Devices
                </div>
                {audioInputs.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-zinc-500">No devices found</div>
                ) : (
                  audioInputs.map((device: MediaDeviceInfo, idx: number) => {
                    const isSelected =
                      selectedAudioInput === device.deviceId || (!selectedAudioInput && idx === 0);
                    return (
                      <button
                        key={device.deviceId || idx}
                        type="button"
                        onClick={() => {
                          setSelectedAudioInput(device.deviceId);
                          setActiveSubmenu(null);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-left group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <Mic
                            size={15}
                            className="text-zinc-400 group-hover:text-white shrink-0"
                          />
                          <span className="text-xs text-zinc-200 group-hover:text-white truncate">
                            {device.label || `Microphone ${idx + 1}`}
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'border-[#7059f6] bg-[#7059f6]'
                              : 'border-zinc-600 group-hover:border-zinc-400'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Input Profile */}
        <div
          className="relative mt-1"
          onMouseEnter={() => handleOpenSubmenu('profile')}
          onMouseLeave={handleScheduleCloseSubmenu}
        >
          <button
            type="button"
            onClick={() => setActiveSubmenu((prev) => (prev === 'profile' ? null : 'profile'))}
            className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer text-left group ${
              activeSubmenu === 'profile' ? 'bg-white/15' : 'hover:bg-white/10'
            }`}
          >
            <div className="min-w-0 pr-2">
              <div className="text-sm font-semibold text-white">Input Profile</div>
              <div className="text-xs text-zinc-400 truncate mt-0.5">
                {profileLabels[inputProfile] || 'Studio'}
              </div>
            </div>
            <ChevronRight
              size={16}
              className={`text-zinc-400 group-hover:text-white transition-all duration-150 ${
                activeSubmenu === 'profile' ? 'text-white translate-x-0.5' : ''
              }`}
            />
          </button>

          {/* Submenu Popout: docked flush directly next to Row 2 */}
          {activeSubmenu === 'profile' && (
            <div
              onMouseEnter={handleCancelCloseSubmenu}
              onMouseLeave={handleScheduleCloseSubmenu}
              className="absolute left-full top-0 ml-1 max-sm:left-0 max-sm:top-full max-sm:mt-1 max-sm:ml-0 w-72 sm:w-80 p-2 bg-[#111214]/98 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_12px_48px_rgba(0,0,0,0.9)] text-white max-h-80 overflow-y-auto animate-in fade-in slide-in-from-left-2 duration-150 z-50 before:absolute before:-left-2 before:top-0 before:bottom-0 before:w-2"
            >
              <div className="space-y-1">
                <div className="px-2 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Input Profile
                </div>
                {(['studio', 'isolation', 'custom'] as InputProfileType[]).map((prof) => {
                  const isSelected = inputProfile === prof;
                  return (
                    <button
                      key={prof}
                      type="button"
                      onClick={() => {
                        setInputProfile(prof);
                        setActiveSubmenu(null);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-left group"
                    >
                      <span className="text-xs text-zinc-200 group-hover:text-white">
                        {profileLabels[prof]}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'border-[#7059f6] bg-[#7059f6]'
                            : 'border-zinc-600 group-hover:border-zinc-400'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Row 3: Output Device */}
        <div
          className="relative mt-1"
          onMouseEnter={() => handleOpenSubmenu('outputDevice')}
          onMouseLeave={handleScheduleCloseSubmenu}
        >
          <button
            type="button"
            onClick={() =>
              setActiveSubmenu((prev) => (prev === 'outputDevice' ? null : 'outputDevice'))
            }
            className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer text-left group ${
              activeSubmenu === 'outputDevice' ? 'bg-white/15' : 'hover:bg-white/10'
            }`}
          >
            <div className="min-w-0 pr-2">
              <div className="text-sm font-semibold text-white">Output Device</div>
              <div className="text-xs text-zinc-400 truncate mt-0.5">
                {currentOutputDeviceLabel}
              </div>
            </div>
            <ChevronRight
              size={16}
              className={`text-zinc-400 group-hover:text-white transition-all duration-150 ${
                activeSubmenu === 'outputDevice' ? 'text-white translate-x-0.5' : ''
              }`}
            />
          </button>

          {/* Submenu Popout: docked flush directly next to Row 3 */}
          {activeSubmenu === 'outputDevice' && (
            <div
              onMouseEnter={handleCancelCloseSubmenu}
              onMouseLeave={handleScheduleCloseSubmenu}
              className="absolute left-full top-0 ml-1 max-sm:left-0 max-sm:top-full max-sm:mt-1 max-sm:ml-0 w-72 sm:w-80 p-2 bg-[#111214]/98 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_12px_48px_rgba(0,0,0,0.9)] text-white max-h-80 overflow-y-auto animate-in fade-in slide-in-from-left-2 duration-150 z-50 before:absolute before:-left-2 before:top-0 before:bottom-0 before:w-2"
            >
              <div className="space-y-1">
                <div className="px-2 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Output Devices
                </div>
                {audioOutputs.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-zinc-500">No devices found</div>
                ) : (
                  audioOutputs.map((device: MediaDeviceInfo, idx: number) => {
                    const isSelected =
                      selectedAudioOutput === device.deviceId ||
                      (!selectedAudioOutput && idx === 0);
                    return (
                      <button
                        key={device.deviceId || idx}
                        type="button"
                        onClick={() => {
                          setSelectedAudioOutput(device.deviceId);
                          setActiveSubmenu(null);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-left group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <Headphones
                            size={15}
                            className="text-zinc-400 group-hover:text-white shrink-0"
                          />
                          <span className="text-xs text-zinc-200 group-hover:text-white truncate">
                            {device.label || `Speakers ${idx + 1}`}
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'border-[#7059f6] bg-[#7059f6]'
                              : 'border-zinc-600 group-hover:border-zinc-400'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-px bg-white/10 my-2.5" />

        {/* Row 4: Microphone Volume Slider */}
        <div className="px-2 py-1">
          <div className="flex justify-between items-center text-xs font-semibold text-zinc-300 mb-1">
            <span>Microphone Volume</span>
            <span className="font-mono text-zinc-400">{inputVolume}%</span>
          </div>
          <Slider
            value={inputVolume}
            min={0}
            max={100}
            step={1}
            onChange={(val) => setInputVolume(val)}
            formatTooltip={(val) => `${val}%`}
            aria-label="Microphone Volume"
          />
        </div>

        {/* Row 5: Input Sensitivity Equalizer (22 pill bars) */}
        <div className="px-2 pt-2 pb-1.5">
          <div className="text-xs font-semibold text-zinc-300 mb-2">Input Sensitivity</div>
          <div className="flex items-center gap-[3.5px] h-4 w-full">
            {Array.from({ length: 22 }).map((_, i) => {
              const threshold = (i / 22) * 100;
              const isLit = !isMuted && inputVolume > 0 && rawMicLevel > threshold;
              return (
                <div
                  key={i}
                  className={`flex-1 h-full rounded-full transition-colors duration-75 ${
                    isLit ? 'bg-[#f1ad32] shadow-[0_0_6px_rgba(241,173,50,0.4)]' : 'bg-[#2b2d31]'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Row 6: Sound Volume Slider */}
        <div className="px-2 py-1 mt-1">
          <div className="flex justify-between items-center text-xs font-semibold text-zinc-300 mb-1">
            <span>Sound Volume</span>
            <span className="font-mono text-zinc-400">{outputVolume}%</span>
          </div>
          <Slider
            value={outputVolume}
            min={0}
            max={100}
            step={1}
            onChange={(val) => setOutputVolume(val)}
            formatTooltip={(val) => `${val}%`}
            aria-label="Sound Volume"
          />
        </div>

        <div className="h-px bg-white/10 my-2.5" />

        {/* Row 7: Deafen Checkbox */}
        <div
          onClick={() => onToggleDeafen?.()}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
        >
          <span className="text-xs font-semibold text-zinc-300 group-hover:text-white">Deafen</span>
          <div
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
              isDeafened
                ? 'bg-[#7059f6] border-[#7059f6] text-white shadow-sm'
                : 'bg-zinc-800/80 border-zinc-600 group-hover:border-zinc-500 text-transparent'
            }`}
          >
            <Check size={14} className="stroke-[3]" />
          </div>
        </div>

        {/* Row 8: Voice Settings Action */}
        <button
          type="button"
          onClick={() => {
            onClose();
            openEditProfile('sec-voice');
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 mt-1 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer group"
        >
          <Settings size={16} className="text-zinc-400 group-hover:text-white" />
          <span>Voice Settings</span>
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          2. AUDIO SETTINGS POPOVER                         */
/* -------------------------------------------------------------------------- */

interface AudioSettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AudioSettingsPopover({ isOpen, onClose }: AudioSettingsPopoverProps) {
  const { isRendered, isExiting } = useAnimatedPresence(isOpen, 160);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const submenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpenSubmenu = () => {
    if (submenuTimerRef.current) {
      clearTimeout(submenuTimerRef.current);
      submenuTimerRef.current = null;
    }
    setIsSubmenuOpen(true);
  };

  const handleScheduleCloseSubmenu = () => {
    if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current);
    submenuTimerRef.current = setTimeout(() => {
      setIsSubmenuOpen(false);
    }, 120);
  };

  const handleCancelCloseSubmenu = () => {
    if (submenuTimerRef.current) {
      clearTimeout(submenuTimerRef.current);
      submenuTimerRef.current = null;
    }
  };

  const { selectedAudioOutput, setSelectedAudioOutput, outputVolume, setOutputVolume } =
    useVoiceVideoSettingsStore();

  const { audioOutputs = [] } = useMediaDevices();
  const openEditProfile = useUIStore((s) => s.openEditProfile);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmenuOpen(false);
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-popover-trigger="audio"]')) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current);
    };
  }, [isOpen, onClose]);

  if (!isRendered) return null;

  const currentDeviceLabel =
    audioOutputs.find((d: MediaDeviceInfo) => d.deviceId === selectedAudioOutput)?.label ||
    'Default - Speakers';

  return (
    <div
      ref={containerRef}
      className={`absolute bottom-full mb-3 left-0 sm:-left-2 z-50 select-none transition-all duration-150 ease-out origin-bottom-left ${
        isExiting
          ? 'opacity-0 scale-95 translate-y-2 pointer-events-none'
          : 'opacity-100 scale-100 translate-y-0 animate-in fade-in zoom-in-95'
      }`}
    >
      {/* Main Popover */}
      <div className="w-72 sm:w-80 p-3 bg-[#111214]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_12px_48px_rgba(0,0,0,0.85)] text-white">
        {/* Output Device */}
        <div
          className="relative"
          onMouseEnter={handleOpenSubmenu}
          onMouseLeave={handleScheduleCloseSubmenu}
        >
          <button
            type="button"
            onClick={() => setIsSubmenuOpen((prev) => !prev)}
            className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer text-left group ${
              isSubmenuOpen ? 'bg-white/15' : 'hover:bg-white/10'
            }`}
          >
            <div className="min-w-0 pr-2">
              <div className="text-sm font-semibold text-white">Output Device</div>
              <div className="text-xs text-zinc-400 truncate mt-0.5">{currentDeviceLabel}</div>
            </div>
            <ChevronRight
              size={16}
              className={`text-zinc-400 group-hover:text-white transition-all duration-150 ${
                isSubmenuOpen ? 'text-white translate-x-0.5' : ''
              }`}
            />
          </button>

          {/* Submenu Popout: docked flush directly next to this row */}
          {isSubmenuOpen && (
            <div
              onMouseEnter={handleCancelCloseSubmenu}
              onMouseLeave={handleScheduleCloseSubmenu}
              className="absolute left-full top-0 ml-1 max-sm:left-0 max-sm:top-full max-sm:mt-1 max-sm:ml-0 w-72 sm:w-80 p-2 bg-[#111214]/98 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_12px_48px_rgba(0,0,0,0.9)] text-white max-h-80 overflow-y-auto animate-in fade-in slide-in-from-left-2 duration-150 z-50 before:absolute before:-left-2 before:top-0 before:bottom-0 before:w-2"
            >
              <div className="px-2 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Output Devices
              </div>
              {audioOutputs.length === 0 ? (
                <div className="px-2 py-2 text-xs text-zinc-500">No devices found</div>
              ) : (
                audioOutputs.map((device: MediaDeviceInfo, idx: number) => {
                  const isSelected =
                    selectedAudioOutput === device.deviceId || (!selectedAudioOutput && idx === 0);
                  return (
                    <button
                      key={device.deviceId || idx}
                      type="button"
                      onClick={() => {
                        setSelectedAudioOutput(device.deviceId);
                        setIsSubmenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <Headphones
                          size={15}
                          className="text-zinc-400 group-hover:text-white shrink-0"
                        />
                        <span className="text-xs text-zinc-200 group-hover:text-white truncate">
                          {device.label || `Speakers ${idx + 1}`}
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'border-[#7059f6] bg-[#7059f6]'
                            : 'border-zinc-600 group-hover:border-zinc-400'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="h-px bg-white/10 my-2.5" />

        {/* Output Volume Slider */}
        <div className="px-2 py-1">
          <div className="flex justify-between items-center text-xs font-semibold text-zinc-300 mb-1">
            <span>Sound Volume</span>
            <span className="font-mono text-zinc-400">{outputVolume}%</span>
          </div>
          <Slider
            value={outputVolume}
            min={0}
            max={100}
            step={1}
            onChange={(val) => setOutputVolume(val)}
            formatTooltip={(val) => `${val}%`}
            aria-label="Sound Volume"
          />
        </div>

        <div className="h-px bg-white/10 my-2.5" />

        {/* Voice Settings Action */}
        <button
          type="button"
          onClick={() => {
            onClose();
            openEditProfile('sec-voice');
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Settings size={16} className="text-zinc-400 group-hover:text-white" />
          <span>Voice Settings</span>
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         3. CAMERA SETTINGS POPOVER                         */
/* -------------------------------------------------------------------------- */

interface CameraSettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreview?: () => void;
}

export function CameraSettingsPopover({
  isOpen,
  onClose,
  onOpenPreview,
}: CameraSettingsPopoverProps) {
  const { isRendered, isExiting } = useAnimatedPresence(isOpen, 160);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const submenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpenSubmenu = () => {
    if (submenuTimerRef.current) {
      clearTimeout(submenuTimerRef.current);
      submenuTimerRef.current = null;
    }
    setIsSubmenuOpen(true);
  };

  const handleScheduleCloseSubmenu = () => {
    if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current);
    submenuTimerRef.current = setTimeout(() => {
      setIsSubmenuOpen(false);
    }, 120);
  };

  const handleCancelCloseSubmenu = () => {
    if (submenuTimerRef.current) {
      clearTimeout(submenuTimerRef.current);
      submenuTimerRef.current = null;
    }
  };

  const { selectedVideoInput, setSelectedVideoInput } = useVoiceVideoSettingsStore();
  const { videoInputs = [] } = useMediaDevices();
  const openEditProfile = useUIStore((s) => s.openEditProfile);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmenuOpen(false);
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-popover-trigger="camera"]')) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current);
    };
  }, [isOpen, onClose]);

  if (!isRendered) return null;

  const currentDeviceLabel =
    videoInputs.find((d: MediaDeviceInfo) => d.deviceId === selectedVideoInput)?.label || 'Camera';

  return (
    <div
      ref={containerRef}
      className={`absolute bottom-full mb-3 left-0 sm:-left-2 z-50 select-none transition-all duration-150 ease-out origin-bottom-left ${
        isExiting
          ? 'opacity-0 scale-95 translate-y-2 pointer-events-none'
          : 'opacity-100 scale-100 translate-y-0 animate-in fade-in zoom-in-95'
      }`}
    >
      {/* Main Popover */}
      <div className="w-72 sm:w-80 p-3 bg-[#111214]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_12px_48px_rgba(0,0,0,0.85)] text-white">
        {/* Camera Selector */}
        <div
          className="relative"
          onMouseEnter={handleOpenSubmenu}
          onMouseLeave={handleScheduleCloseSubmenu}
        >
          <button
            type="button"
            onClick={() => setIsSubmenuOpen((prev) => !prev)}
            className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer text-left group ${
              isSubmenuOpen ? 'bg-white/15' : 'hover:bg-white/10'
            }`}
          >
            <div className="min-w-0 pr-2">
              <div className="text-sm font-semibold text-white">Camera</div>
              <div className="text-xs text-zinc-400 truncate mt-0.5">{currentDeviceLabel}</div>
            </div>
            <ChevronRight
              size={16}
              className={`text-zinc-400 group-hover:text-white transition-all duration-150 ${
                isSubmenuOpen ? 'text-white translate-x-0.5' : ''
              }`}
            />
          </button>

          {/* Submenu Popout: docked flush directly next to this row */}
          {isSubmenuOpen && (
            <div
              onMouseEnter={handleCancelCloseSubmenu}
              onMouseLeave={handleScheduleCloseSubmenu}
              className="absolute left-full top-0 ml-1 max-sm:left-0 max-sm:top-full max-sm:mt-1 max-sm:ml-0 w-72 sm:w-80 p-2 bg-[#111214]/98 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_12px_48px_rgba(0,0,0,0.9)] text-white max-h-80 overflow-y-auto animate-in fade-in slide-in-from-left-2 duration-150 z-50 before:absolute before:-left-2 before:top-0 before:bottom-0 before:w-2"
            >
              <div className="px-2 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Cameras
              </div>
              {videoInputs.length === 0 ? (
                <div className="px-2 py-2 text-xs text-zinc-500">No cameras found</div>
              ) : (
                videoInputs.map((device: MediaDeviceInfo, idx: number) => {
                  const isSelected =
                    selectedVideoInput === device.deviceId || (!selectedVideoInput && idx === 0);
                  return (
                    <button
                      key={device.deviceId || idx}
                      type="button"
                      onClick={() => {
                        setSelectedVideoInput(device.deviceId);
                        setIsSubmenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <Camera
                          size={15}
                          className="text-zinc-400 group-hover:text-white shrink-0"
                        />
                        <span className="text-xs text-zinc-200 group-hover:text-white truncate">
                          {device.label || `Camera ${idx + 1}`}
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'border-[#7059f6] bg-[#7059f6]'
                            : 'border-zinc-600 group-hover:border-zinc-400'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="h-px bg-white/10 my-2" />

        {/* Camera Preview Action */}
        {onOpenPreview && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPreview();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Eye size={16} className="text-zinc-400 group-hover:text-white" />
            <span>Camera Preview</span>
          </button>
        )}

        {/* Video Settings Action */}
        <button
          type="button"
          onClick={() => {
            onClose();
            openEditProfile('sec-video');
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Settings size={16} className="text-zinc-400 group-hover:text-white" />
          <span>Video Settings</span>
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          4. CAMERA PREVIEW MODAL                           */
/* -------------------------------------------------------------------------- */

interface CameraPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CameraPreviewModal({ isOpen, onClose }: CameraPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { selectedVideoInput, isMirrorVideo } = useVoiceVideoSettingsStore();
  const { videoInputs = [] } = useMediaDevices();

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function initPreview() {
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

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn('[CameraPreviewModal] Failed to start preview:', err);
      }
    }

    void initPreview();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [isOpen, selectedVideoInput]);

  if (!isOpen) return null;

  const currentDeviceLabel =
    videoInputs.find((d: MediaDeviceInfo) => d.deviceId === selectedVideoInput)?.label ||
    'Integrated Camera';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Camera Preview"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 select-none"
    >
      <div className="relative w-full max-w-lg bg-[#111214] rounded-2xl border border-white/15 shadow-2xl overflow-hidden p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Camera size={18} className="text-emerald-400" />
            <h3 className="text-base font-bold">Camera Preview</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Box */}
        <div className="relative w-full aspect-video rounded-xl bg-zinc-950 overflow-hidden border border-white/10 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isMirrorVideo ? '-scale-x-100' : ''}`}
          />
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-medium text-zinc-300 border border-white/10 truncate max-w-[85%]">
            {currentDeviceLabel}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/25 active:scale-95 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
