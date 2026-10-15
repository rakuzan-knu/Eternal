import { Plus } from 'lucide-react';
import Tooltip from '../../../shared/ui/Tooltip';

export default function CreateFolderButton({
  onCreate,
  className = '',
}: {
  onCreate: () => void;
  className?: string;
}) {
  return (
    <Tooltip label="Create chat folder" position="bottom">
      <button
        type="button"
        onClick={onCreate}
        aria-label="Create chat folder"
        className={`glass-card group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-gray-200 transition-all duration-200 hover:scale-105 hover:border-white/30 hover:text-white active:scale-95 shadow-sm cursor-pointer ${className}`}
      >
        <Plus
          size={17}
          className="transition-transform duration-200 group-hover:scale-110 group-hover:text-[var(--app-accent-color)]"
        />
      </button>
    </Tooltip>
  );
}
