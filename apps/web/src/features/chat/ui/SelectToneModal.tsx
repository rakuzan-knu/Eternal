import React, { useState } from 'react';
import { X, Music, Volume2, Check } from 'lucide-react';
import Modal from '../../../shared/ui/Modal';

interface ToneOption {
  id: string;
  name: string;
  description: string;
  frequencies: number[];
}

const TONES: ToneOption[] = [
  {
    id: 'default',
    name: 'Default Pop',
    description: 'Classic bubble tone',
    frequencies: [587.33, 880],
  },
  {
    id: 'crystal',
    name: 'Crystal Chime',
    description: 'Bright glass chime',
    frequencies: [800, 1200, 1600],
  },
  {
    id: 'pulse',
    name: 'Neon Pulse',
    description: 'Modern synthetic pulse',
    frequencies: [440, 659.25],
  },
  { id: 'velvet', name: 'Velvet Drop', description: 'Soft acoustic drop', frequencies: [350, 520] },
  {
    id: 'breeze',
    name: 'Digital Breeze',
    description: 'Light chime chord',
    frequencies: [523.25, 659.25, 783.99],
  },
];

function playToneSound(frequencies: number[]) {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

      gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.26);
    });
  } catch (e) {
    console.error('Failed to play preview tone', e);
  }
}

interface SelectToneModalProps {
  conversationId: string;
  onClose: () => void;
}

export default function SelectToneModal({ conversationId, onClose }: SelectToneModalProps) {
  const storageKey = `chat_tone_${conversationId}`;
  const [selectedToneId, setSelectedToneId] = useState<string>(() => {
    return localStorage.getItem(storageKey) || 'default';
  });

  const handleSelect = (tone: ToneOption) => {
    setSelectedToneId(tone.id);
    playToneSound(tone.frequencies);
  };

  const handleSave = () => {
    localStorage.setItem(storageKey, selectedToneId);
    onClose();
  };

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {() => (
        <div className="bg-[#151922]/95 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Music size={16} />
              </span>
              <h2 className="text-base font-bold text-white">Select chat tone</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-1.5 max-h-[360px] overflow-y-auto">
            {TONES.map((tone) => {
              const isSelected = selectedToneId === tone.id;
              return (
                <div
                  key={tone.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(tone)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(tone);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-left border cursor-pointer select-none transition-all ${
                    isSelected
                      ? 'bg-white/10 border-sky-500/40 text-white shadow-sm'
                      : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playToneSound(tone.frequencies);
                      }}
                      className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/20 transition-colors"
                      title="Play preview"
                    >
                      <Volume2 size={14} />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white leading-none">{tone.name}</p>
                      <p className="text-[11.5px] text-gray-400 mt-1 truncate">
                        {tone.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center text-white flex-shrink-0">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
