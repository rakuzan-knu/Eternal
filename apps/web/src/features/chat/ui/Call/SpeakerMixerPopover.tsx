import React, { useEffect, useRef } from 'react';
import { Volume2, Sliders, RotateCcw, X } from 'lucide-react';
import { useSpeakerMixer } from '../../lib/webrtc/perSpeakerMixer';

interface SpeakerMixerPopoverProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SpeakerMixerPopover({
  userId,
  userName,
  isOpen,
  onClose,
}: SpeakerMixerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const { profile, update, reset } = useSpeakerMixer(userId);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const volumePct = Math.round(profile.volume * 100);
  const panDisplay =
    profile.pan === 0
      ? 'C'
      : profile.pan < 0
        ? `L ${Math.round(Math.abs(profile.pan) * 100)}%`
        : `R ${Math.round(profile.pan * 100)}%`;

  return (
    <div
      ref={popoverRef}
      className="absolute right-2 bottom-12 z-50 w-72 p-4 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.8)] text-white text-xs select-none animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-emerald-400" />
          <span className="font-semibold text-sm truncate max-w-36">{userName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={reset}
            title="Reset DSP settings"
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <RotateCcw size={13} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Volume Slider (0% - 200%) */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-zinc-300 font-medium mb-1.5">
          <span className="flex items-center gap-1.5">
            <Volume2 size={13} className="text-emerald-400" />
            Volume
          </span>
          <span
            className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
              volumePct > 100
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-zinc-800 text-emerald-400'
            }`}
          >
            {volumePct}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={profile.volume}
          onChange={(e) => update({ volume: parseFloat(e.target.value) })}
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
        />
        <div className="flex justify-between text-[9px] text-zinc-500 mt-0.5">
          <span>0%</span>
          <span>100%</span>
          <span>200%</span>
        </div>
      </div>

      {/* Stereo Panning (L / C / R) */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-zinc-300 font-medium mb-1.5">
          <span>Stereo Panning</span>
          <span className="font-mono text-[11px] font-bold text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/50">
            {panDisplay}
          </span>
        </div>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.05"
          value={profile.pan}
          onChange={(e) => update({ pan: parseFloat(e.target.value) })}
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
        <div className="flex justify-between text-[9px] text-zinc-500 mt-0.5">
          <span>Left</span>
          <span>Center</span>
          <span>Right</span>
        </div>
      </div>

      {/* 3-Band Parametric Equalizer */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
          3-Band EQ (BiquadFilter)
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Low Band (250 Hz) */}
          <div className="flex flex-col items-center gap-1.5 bg-zinc-900/60 p-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-400 font-medium">Low 250Hz</span>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={profile.eqLow}
              onChange={(e) => update({ eqLow: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
            />
            <span className="font-mono text-[10px] text-blue-300">
              {profile.eqLow > 0 ? `+${profile.eqLow}` : profile.eqLow} dB
            </span>
          </div>

          {/* Mid Band (1500 Hz) */}
          <div className="flex flex-col items-center gap-1.5 bg-zinc-900/60 p-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-400 font-medium">Mid 1.5kHz</span>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={profile.eqMid}
              onChange={(e) => update({ eqMid: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <span className="font-mono text-[10px] text-amber-300">
              {profile.eqMid > 0 ? `+${profile.eqMid}` : profile.eqMid} dB
            </span>
          </div>

          {/* High Band (4000 Hz) */}
          <div className="flex flex-col items-center gap-1.5 bg-zinc-900/60 p-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-400 font-medium">High 4kHz</span>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={profile.eqHigh}
              onChange={(e) => update({ eqHigh: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
            <span className="font-mono text-[10px] text-purple-300">
              {profile.eqHigh > 0 ? `+${profile.eqHigh}` : profile.eqHigh} dB
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
