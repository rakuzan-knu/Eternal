import { ChevronRight } from 'lucide-react';
import { DIMENSION_TO_KEY } from '../../model/privacyTypes';
import type { PrivacyDimension, PrivacySettings, Visibility } from '../../model/privacyTypes';

interface PrivacyDimensionRowProps {
  dimension: PrivacyDimension;
  title: string;
  privacy: PrivacySettings | undefined;
  isLoading?: boolean;
  onClick: () => void;
  last?: boolean;
}

const VALUE_LABEL: Record<Visibility, string> = {
  EVERYBODY: 'Everybody',
  CONTACTS: 'Subscribers',
  NOBODY: 'Nobody',
};

const DEFAULT_VALUE: Visibility = 'EVERYBODY';

export default function PrivacyDimensionRow({
  dimension,
  title,
  privacy,
  isLoading,
  onClick,
  last,
}: PrivacyDimensionRowProps) {
  const value = privacy?.[DIMENSION_TO_KEY[dimension]] ?? DEFAULT_VALUE;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left group transition-colors hover:bg-white/[0.05] active:bg-white/[0.07] ${
        last ? '' : 'border-b border-white/[0.06]'
      }`}
    >
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-200">{title}</h4>
      </div>

      {isLoading ? (
        <span className="w-16 h-3 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
      ) : (
        <span className="text-sm text-[#7ab8ff] flex-shrink-0">{VALUE_LABEL[value]}</span>
      )}

      <ChevronRight
        size={17}
        className="text-gray-600 group-hover:text-gray-300 transition-colors flex-shrink-0"
      />
    </button>
  );
}
