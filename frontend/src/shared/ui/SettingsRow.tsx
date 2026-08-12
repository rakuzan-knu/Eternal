import { ChevronRight } from 'lucide-react';

interface SettingsRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: string | number;
  onClick: () => void;
  last?: boolean;
  danger?: boolean;
}

export default function SettingsRow({
  icon,
  title,
  subtitle,
  value,
  onClick,
  last,
  danger,
}: SettingsRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 py-4 text-left group transition-colors ${
        last ? '' : 'border-b border-white/[0.06]'
      }`}
    >
      <span
        className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-white/5 border border-white/10 ${
          danger ? 'text-red-400' : 'text-gray-200'
        }`}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <h4 className={`font-medium ${danger ? 'text-red-400' : 'text-gray-200'}`}>{title}</h4>
        {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
      </div>
      {value !== undefined && (
        <span className="text-sm text-[#7ab8ff] flex-shrink-0 max-w-[160px] truncate">{value}</span>
      )}
      <ChevronRight
        size={18}
        className="text-gray-600 group-hover:text-gray-300 transition-colors flex-shrink-0"
      />
    </button>
  );
}
