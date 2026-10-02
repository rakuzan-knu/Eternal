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
    className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${isOpen ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300' : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'}`}
  >
    <BarChart2 size={18} />
  </button>
);
