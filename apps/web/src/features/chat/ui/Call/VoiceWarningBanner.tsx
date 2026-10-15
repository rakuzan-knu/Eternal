import React, { useEffect, useState, useRef } from 'react';
import { MicOff, VolumeX, X, Mic } from 'lucide-react';
import { useCallStore } from '../../model/callStore';
import { useVoiceVideoSettingsStore } from '../../model/useVoiceVideoSettingsStore';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { useLiquidGlassTheme } from '@/shared/lib/useLiquidGlassTheme';
import { useCall } from '../../model/CallContext';

export function VoiceWarningBanner() {
  const { callStatus, isMuted, localStream } = useCallStore();
  const { inputVolume, setInputVolume, warnNoAudioInput, warnMutedSpeaking } =
    useVoiceVideoSettingsStore();

  const accentColor = useThemeStore((s) => s.accentColor) || '#7059f6';
  const textOnAccent = useThemeStore((s) => s.textOnAccent) || '#ffffff';
  const isGlassmorphismEnabled = useThemeStore((s) => s.isGlassmorphismEnabled);
  const liquidTheme = useLiquidGlassTheme();

  const callManager = useCall();

  const [activeWarning, setActiveWarning] = useState<
    'muted_speaking' | 'no_audio_zero' | 'no_audio_device' | null
  >(null);
  const [dismissedUntil, setDismissedUntil] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const monitorTrackRef = useRef<MediaStreamTrack | null>(null);
  const consecutiveSpeakingMsRef = useRef<number>(0);
  const silenceWithNoiseMsRef = useRef<number>(0);

  // Monitor physical audio input independent of mute state
  useEffect(() => {
    if (callStatus !== 'connected' || !localStream) {
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      if (monitorTrackRef.current) {
        monitorTrackRef.current.stop();
        monitorTrackRef.current = null;
      }
      setActiveWarning(null);
      return;
    }

    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    // Clone the track so its enabled state stays true even when audioTrack.enabled is false (muted)
    const monitorTrack = audioTrack.clone();
    monitorTrack.enabled = true;
    monitorTrackRef.current = monitorTrack;

    const monitorStream = new MediaStream([monitorTrack]);

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.2;
    analyserRef.current = analyser;

    try {
      const source = ctx.createMediaStreamSource(monitorStream);
      source.connect(analyser);
    } catch {
      // Audio source fallback
    }

    const pcmData = new Float32Array(analyser.fftSize);

    const interval = setInterval(() => {
      if (!analyser) return;
      analyser.getFloatTimeDomainData(pcmData);

      let sum = 0;
      for (let i = 0; i < pcmData.length; i++) {
        sum += pcmData[i] * pcmData[i];
      }
      const rms = Math.sqrt(sum / pcmData.length);
      // Typical human speech energy threshold
      const isSpeakingEnergy = rms > 0.025;

      const now = Date.now();
      const isDismissed = now < dismissedUntil;

      // 1. Check Muted Speaking Warning:
      // When user is muted, but speaking energy persists for >= 1000ms (1 second)
      if (warnMutedSpeaking && isMuted) {
        if (isSpeakingEnergy) {
          consecutiveSpeakingMsRef.current += 100;
          if (consecutiveSpeakingMsRef.current >= 1000) {
            if (!isDismissed) {
              setActiveWarning('muted_speaking');
            }
          }
        } else {
          // Slowly decay if momentary pause, reset after 1.5s silence
          consecutiveSpeakingMsRef.current = Math.max(0, consecutiveSpeakingMsRef.current - 150);
          if (consecutiveSpeakingMsRef.current === 0 && activeWarning === 'muted_speaking') {
            setActiveWarning(null);
          }
        }
      } else {
        consecutiveSpeakingMsRef.current = 0;
        if (activeWarning === 'muted_speaking') {
          setActiveWarning(null);
        }
      }

      // 2. Check No Audio Input Warning:
      // When unmuted in call, but volume is 0 or device produces complete silence despite background
      if (warnNoAudioInput && !isMuted) {
        if (inputVolume === 0) {
          if (!isDismissed) {
            setActiveWarning('no_audio_zero');
          }
        } else if (activeWarning === 'no_audio_zero') {
          setActiveWarning(null);
        } else {
          // Device silence detection: if stream has near-zero energy for > 5s
          if (rms < 0.0005) {
            silenceWithNoiseMsRef.current += 100;
            if (silenceWithNoiseMsRef.current >= 5000 && !isDismissed) {
              setActiveWarning('no_audio_device');
            }
          } else {
            silenceWithNoiseMsRef.current = 0;
            if (activeWarning === 'no_audio_device') {
              setActiveWarning(null);
            }
          }
        }
      } else if (activeWarning === 'no_audio_zero' || activeWarning === 'no_audio_device') {
        setActiveWarning(null);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (ctx.state !== 'closed') {
        void ctx.close().catch(() => {});
      }
      monitorTrack.stop();
    };
  }, [
    callStatus,
    localStream,
    isMuted,
    inputVolume,
    warnNoAudioInput,
    warnMutedSpeaking,
    dismissedUntil,
    activeWarning,
  ]);

  if (!activeWarning || Date.now() < dismissedUntil) {
    return null;
  }

  const handleDismiss = () => {
    setDismissedUntil(Date.now() + 20000); // Snooze for 20 seconds
    setActiveWarning(null);
  };

  const handleUnmute = () => {
    if (callManager?.toggleMute) {
      callManager.toggleMute();
    } else {
      useCallStore.getState().setIsMuted(false);
    }
    setActiveWarning(null);
  };

  const handleFixVolume = () => {
    setInputVolume(100);
    setActiveWarning(null);
  };

  return (
    <div
      role="alert"
      className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border text-white text-xs font-medium shadow-2xl animate-in slide-in-from-top-2 fade-in duration-200 select-none max-w-[94vw]"
      style={{
        background: isGlassmorphismEnabled ? liquidTheme.popoverGradient : 'rgba(20, 14, 12, 0.94)',
        backdropFilter: isGlassmorphismEnabled ? liquidTheme.backdropFilter : 'blur(16px)',
        WebkitBackdropFilter: isGlassmorphismEnabled
          ? liquidTheme.WebkitBackdropFilter
          : 'blur(16px)',
        borderColor: accentColor ? `${accentColor}55` : 'rgba(255,255,255,0.18)',
        boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 16px 0 ${accentColor}30`,
      }}
    >
      {/* Icon */}
      {activeWarning === 'muted_speaking' ? (
        <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <MicOff size={13} className="animate-pulse" />
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
          <VolumeX size={13} className="animate-pulse" />
        </div>
      )}

      {/* Message */}
      <div className="flex items-center gap-1.5 min-w-0 pr-1">
        <span className="font-semibold text-xs text-white leading-none whitespace-nowrap">
          {activeWarning === 'muted_speaking' && "Your microphone is muted, but you're speaking"}
          {activeWarning === 'no_audio_zero' && 'Microphone volume at 0%'}
          {activeWarning === 'no_audio_device' && 'No microphone audio detected'}
        </span>
        <span className="text-[10px] text-gray-300 leading-none hidden md:inline">
          {activeWarning === 'muted_speaking' && ' — nobody can hear you'}
          {activeWarning === 'no_audio_zero' && ' — microphone is muted in settings'}
          {activeWarning === 'no_audio_device' && ' — check device connection'}
        </span>
      </div>

      {/* Action Button */}
      {activeWarning === 'muted_speaking' && (
        <button
          type="button"
          onClick={handleUnmute}
          style={{ backgroundColor: accentColor, color: textOnAccent }}
          className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] font-bold shadow-md hover:brightness-110 active:scale-95 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
        >
          <Mic size={11} />
          <span>Unmute</span>
        </button>
      )}

      {activeWarning === 'no_audio_zero' && (
        <button
          type="button"
          onClick={handleFixVolume}
          style={{ backgroundColor: accentColor, color: textOnAccent }}
          className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] font-bold shadow-md hover:brightness-110 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          100%
        </button>
      )}

      {/* Dismiss (X) */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss warning"
        className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export default VoiceWarningBanner;
