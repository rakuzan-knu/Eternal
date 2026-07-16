import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  hasChevron?: boolean;
  danger?: boolean;
  badge?: string;
}

export function MenuItem({ icon: Icon, label, onClick, hasChevron, danger, badge }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-150 ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-200 hover:bg-white/5'
      }`}
    >
      <Icon size={18} className={danger ? 'text-red-400' : 'text-gray-400'} />
      <span className="flex-1 text-left font-medium">{label}</span>
      {badge && (
        <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-md">
          {badge}
        </span>
      )}
      {hasChevron && <ChevronRight size={16} className="text-gray-500" />}
    </button>
  );
}
