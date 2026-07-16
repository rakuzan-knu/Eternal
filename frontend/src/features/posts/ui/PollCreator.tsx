import React from 'react';
import { X, Plus } from 'lucide-react';
import { PollOptionDraft } from '../model/types';

interface PollProps {
  isOpen: boolean;
  options: PollOptionDraft[];
  onChange: (options: PollOptionDraft[]) => void;
  onClose: () => void;
}

const MAX_OPTIONS = 8;
const MIN_OPTIONS = 2;

export const PollCreator: React.FC<PollProps> = ({ isOpen, options, onChange, onClose }) => {
  if (!isOpen) return null;

  const updateOption = (id: string, text: string) =>
    onChange(options.map((o) => (o.id === id ? { ...o, text } : o)));

  const removeOption = (id: string) => {
    if (options.length <= MIN_OPTIONS) return;
    onChange(options.filter((o) => o.id !== id));
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    onChange([...options, { id: crypto.randomUUID(), text: '' }]);
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-2.5 animate-fadeIn mt-3">
      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
        <span className="font-semibold text-gray-300">Create a poll</span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {options.map((option, idx) => (
        <div key={option.id} className="flex items-center gap-2">
          <input
            type="text"
            placeholder={`Variant ${idx + 1}`}
            value={option.text}
            maxLength={80}
            onChange={(e) => updateOption(option.id, e.target.value)}
            className="flex-1 bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20"
          />
          {options.length > MIN_OPTIONS && (
            <button
              type="button"
              onClick={() => removeOption(option.id)}
              className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}

      {options.length < MAX_OPTIONS && (
        <button
          type="button"
          onClick={addOption}
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white border border-dashed border-white/10 hover:border-white/20 rounded-xl py-2 transition-colors mt-1"
        >
          <Plus size={14} /> Add Variant ({options.length}/{MAX_OPTIONS})
        </button>
      )}
    </div>
  );
};
