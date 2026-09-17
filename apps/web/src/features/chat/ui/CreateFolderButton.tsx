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
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition-all duration-200 hover:scale-105 hover:bg-white/10 hover:text-white ${className}`}
      >
        <Plus size={18} />
      </button>
    </Tooltip>
  );
}
