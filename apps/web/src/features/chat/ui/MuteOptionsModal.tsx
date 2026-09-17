import React, { useState } from 'react';
import { X, Clock, BellOff } from 'lucide-react';
import Modal from '../../../shared/ui/Modal';
import { MuteLevel } from '../../../entities/chat/model/types';
import { MuteOption } from '../model/chatUiTypes';

const DURATION_OPTIONS = [
  { label: 'For 30 minutes', value: 0.5 },
  { label: 'For 1 hour', value: 1 },
  { label: 'For 8 hours', value: 8 },
  { label: 'For 24 hours', value: 24 },
  { label: 'For 7 days', value: 168 },
  { label: 'Until I turn it back on', value: -1 },
];

const LEVEL_OPTIONS: MuteOption[] = [
  { value: 'MESSAGES_AND_CALLS', label: 'Mute messages and calls' },
  { value: 'MESSAGES', label: 'Mute message notifications' },
  { value: 'CALLS', label: 'Mute call notifications' },
];

interface MuteOptionsModalProps {
  onClose: () => void;
  onConfirm: (muteLevel: MuteLevel, mutedUntil?: string) => void;
}

export default function MuteOptionsModal({ onClose, onConfirm }: MuteOptionsModalProps) {
  const [selectedLevel, setSelectedLevel] = useState<MuteLevel>('MESSAGES_AND_CALLS');
  const [selectedDuration, setSelectedDuration] = useState<number>(-1);

  const handleConfirm = () => {
    let mutedUntil: string | undefined = undefined;
    if (selectedDuration > 0) {
      const ms = selectedDuration * 60 * 60 * 1000;
      mutedUntil = new Date(Date.now() + ms).toISOString();
    }
    if (mutedUntil) {
      onConfirm(selectedLevel, mutedUntil);
    } else {
      onConfirm(selectedLevel);
    }
    onClose();
  };

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {() => (
        <div className="bg-[#151922]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <BellOff size={16} />
              </span>
              <h2 className="text-base font-bold text-white">Mute conversation</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-5 pt-2 pb-1">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
              <Clock size={12} /> Duration
            </h4>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedDuration(opt.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-center border transition-all ${
                    selectedDuration === opt.value
                      ? 'bg-white text-black border-white shadow-sm font-semibold'
                      : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Notification Type
            </h4>
            <div className="flex flex-col gap-1 mb-2">
              {LEVEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedLevel(option.value)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-white/5 transition-colors"
                >
                  <span
                    className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedLevel === option.value ? 'border-sky-500' : 'border-gray-600'
                    }`}
                  >
                    {selectedLevel === option.value && (
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-popIn" />
                    )}
                  </span>
                  <span className="text-xs font-medium text-white">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="px-5 pb-4 text-[11.5px] text-gray-400 leading-relaxed">
            Messages will still arrive, but sounds and notification alerts will be silenced for this
            chat.
          </p>

          <div className="flex items-center gap-3 px-5 py-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-gray-300 bg-white/5 hover:bg-white/10 transition-colors active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white transition-colors active:scale-95"
            >
              Mute
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
