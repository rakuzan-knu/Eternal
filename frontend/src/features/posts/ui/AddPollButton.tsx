import React from 'react';
import { BarChart2 } from 'lucide-react';

interface AddPollButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const AddPollButton: React.FC<AddPollButtonProps> = ({ isOpen, onToggle }) => (
  <button
    onClick={onToggle}
    title="Create poll"
    className={`p-2.5 rounded-xl transition-all duration-200 ${isOpen ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
  >
    <BarChart2 size={18} />
  </button>
);
