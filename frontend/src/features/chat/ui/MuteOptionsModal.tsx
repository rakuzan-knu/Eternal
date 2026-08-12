import React, { useState } from 'react';
import { X } from 'lucide-react';
import Modal from '../../../shared/ui/Modal';
import { MuteLevel } from '../../../entities/chat/model/types';
import { MuteOption } from '../model/chatUiTypes';

const OPTIONS: MuteOption[] = [
  { value: 'MESSAGES', label: 'Mute message notifications' },
  { value: 'CALLS', label: 'Mute call notifications' },
  { value: 'MESSAGES_AND_CALLS', label: 'Mute message and call notifications' },
];

interface MuteOptionsModalProps {
  onClose: () => void;
  onConfirm: (muteLevel: MuteLevel) => void;
}

export default function MuteOptionsModal({ onClose, onConfirm }: MuteOptionsModalProps) {
  const [selected, setSelected] = useState<MuteLevel>('MESSAGES');

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {(close) => (
        <div className="bg-[#1c1c20] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <h2 className="text-lg font-bold text-white">Mute conversation</h2>
            <button
              onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-2 pb-2">
            {OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelected(option.value)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-white/5 transition-colors active:scale-[0.99]"
              >
                <span
                  className={`flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors ${
                    selected === option.value ? 'border-blue-500' : 'border-gray-600'
                  }`}
                >
                  {selected === option.value && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-popIn" />
                  )}
                </span>
                <span className="text-sm font-medium text-white">{option.label}</span>
              </button>
            ))}
          </div>

          <p className="px-5 pb-5 text-xs text-gray-500 leading-relaxed">
            Chat windows will stay closed, and you won't get push notifications on your devices.
          </p>

          <div className="flex items-center gap-3 px-5 py-4 border-t border-white/10">
            <button
              onClick={close}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-gray-300 bg-white/5 hover:bg-white/10 transition-colors active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm(selected);
                close();
              }}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white transition-colors active:scale-95"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
