import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function SectionButton({
  icon,
  label,
  sublabel,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-200 hover:bg-white/5'
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {sublabel && <span className="block text-xs text-gray-500">{sublabel}</span>}
      </span>
    </button>
  );
}

export function ExpandableSection({
  label,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-gray-200 hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-semibold">{label}</span>
        {isOpen ? (
          <ChevronDown size={16} className="text-gray-500" />
        ) : (
          <ChevronRight size={16} className="text-gray-500" />
        )}
      </button>
      {isOpen && <div className="flex flex-col gap-0.5 pl-1 pb-1">{children}</div>}
    </div>
  );
}
