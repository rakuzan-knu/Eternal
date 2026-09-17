import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Mic, Sparkles, X, Radio } from 'lucide-react';
import {
  globalSoundboardEngine,
  SOUNDBOARD_PRESETS,
  SoundEffectId,
} from '../../lib/webrtc/soundboardEngine';

interface SoundboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataChannel?: RTCDataChannel | null;
  localStream?: MediaStream | null;
}

export function SoundboardModal({
  isOpen,
  onClose,
  dataChannel,
  localStream,
}: SoundboardModalProps) {
  const [isDucking, setIsDucking] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [playingId, setPlayingId] = useState<SoundEffectId | null>(null);

  // Escape key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Hook up sidechain mic stream and ducking state
  useEffect(() => {
    if (!isOpen) return;

    if (localStream) {
      globalSoundboardEngine.attachLocalMicStream(localStream);
    }

    const unsub = globalSoundboardEngine.subscribeDucking((ducking) => {
      setIsDucking(ducking);
    });

    return () => {
      unsub();
    };
  }, [isOpen, localStream]);

  if (!isOpen) return null;

  const handleTrigger = (id: SoundEffectId, durationMs: number) => {
    setPlayingId(id);
    globalSoundboardEngine.broadcastPlay(id, dataChannel);
    setTimeout(() => {
      setPlayingId((current) => (current === id ? null : current));
    }, durationMs);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    globalSoundboardEngine.setMasterVolume(newVol);
  };

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    globalSoundboardEngine.setMuted(nextMuted);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-950/95 border border-white/15 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white select-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-linear-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400">
              <Radio size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-wide flex items-center gap-2">
                Live Soundboard
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  Sidechain Auto-Duck
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Effects broadcast in real-time to all call participants
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sidechain Ducking Status Pill */}
        <div className="mt-4 flex items-center justify-between p-3 rounded-2xl bg-zinc-900/70 border border-white/5">
          <div className="flex items-center gap-2 text-xs">
            <Mic size={15} className={isDucking ? 'text-amber-400' : 'text-emerald-400'} />
            <span className="text-zinc-300">Voice Sidechain:</span>
            {isDucking ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                Ducking Active (-50% Sound)
              </span>
            ) : (
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Full Clarity (No Voice)
              </span>
            )}
          </div>
          <span className="text-[10px] text-zinc-500">Auto-balanced</span>
        </div>

        {/* Master Soundboard Volume Slider */}
        <div className="mt-4 flex items-center gap-3 px-1">
          <button
            type="button"
            onClick={handleMuteToggle}
            title={isMuted ? 'Unmute Soundboard' : 'Mute Soundboard'}
            className={`p-2 rounded-xl transition ${
              isMuted
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-white/10 text-zinc-300 hover:text-white'
            }`}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span>Soundboard Volume</span>
              <span className="font-mono text-zinc-300">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={volume}
              disabled={isMuted}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400 disabled:opacity-40"
            />
          </div>
        </div>

        {/* Sound Presets Grid */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {SOUNDBOARD_PRESETS.map((preset) => {
            const isCurrentlyPlaying = playingId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleTrigger(preset.id, preset.durationMs)}
                className={`relative group flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all duration-150 active:scale-95 ${
                  isCurrentlyPlaying
                    ? 'bg-amber-500/25 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-102 ring-1 ring-amber-400'
                    : 'bg-zinc-900/80 hover:bg-zinc-800/80 border-white/10 hover:border-white/20'
                }`}
              >
                <div
                  className={`text-2xl transition-transform duration-200 ${
                    isCurrentlyPlaying ? 'scale-125 animate-bounce' : 'group-hover:scale-110'
                  }`}
                >
                  {preset.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                    {preset.name}
                    {isCurrentlyPlaying && (
                      <Sparkles size={12} className="text-amber-300 animate-spin" />
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center justify-between mt-0.5">
                    <span className="capitalize">{preset.category}</span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {(preset.durationMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>

                {isCurrentlyPlaying && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/60 pointer-events-none animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
