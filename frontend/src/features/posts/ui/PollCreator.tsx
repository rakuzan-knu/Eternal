import React from 'react';
import { X } from 'lucide-react';

interface PollProps {
  isOpen: boolean;
  options: { option1: string; option2: string };
  onChange: (options: { option1: string; option2: string }) => void;
  onClose: () => void;
}

export const PollCreator: React.FC<PollProps> = ({ isOpen, options, onChange, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3 flex flex-col gap-2 animate-fadeIn mt-2">
      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
        <span>Створення опитування</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>
      <input
        type="text"
        placeholder="Варіант 1"
        value={options.option1}
        onChange={(e) => onChange({ ...options, option1: e.target.value })}
        className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20"
      />
      <input
        type="text"
        placeholder="Варіант 2"
        value={options.option2}
        onChange={(e) => onChange({ ...options, option2: e.target.value })}
        className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20"
      />
    </div>
  );
};
