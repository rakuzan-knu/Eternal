import React, { useState } from 'react';
import { X, Check, Palette } from 'lucide-react';
import Modal from '../../../shared/ui/Modal';
import { chatApi } from '../api/chatApi';

interface SelectThemeModalProps {
  conversationId: string;
  currentTheme?: string;
  onClose: () => void;
}

const THEMES = [
  { id: 'default', name: 'Default Dark', bg: 'bg-[#050505]', border: 'border-white/10' },
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    bg: 'bg-[#120726]',
    border: 'border-purple-500/30',
  },
  { id: 'deep-ocean', name: 'Deep Ocean', bg: 'bg-[#061321]', border: 'border-blue-500/30' },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    bg: 'bg-[#061c14]',
    border: 'border-emerald-500/30',
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    bg: 'bg-[#1c0624]',
    border: 'border-pink-500/30',
  },
];

export default function SelectThemeModal({
  conversationId,
  currentTheme = 'default',
  onClose,
}: SelectThemeModalProps) {
  const [selected, setSelected] = useState(currentTheme);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await chatApi.setTheme(conversationId, selected);
    } catch {
      // Graceful error handling
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {(close) => (
        <div className="bg-[#181a22] border border-white/10 rounded-3xl w-full shadow-2xl overflow-hidden backdrop-blur-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                <Palette size={16} />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">Chat Theme</h3>
            </div>
            <button
              type="button"
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-2 mb-5">
            {THEMES.map((theme) => {
              const isSelected = selected === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelected(theme.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-purple-500/15 border-purple-400/40 shadow-lg shadow-purple-500/10'
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full ${theme.bg} ${theme.border} border shadow-inner`}
                    />
                    <span className="text-sm font-medium text-gray-200">{theme.name}</span>
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 rounded-full text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-lg shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Apply Theme'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
