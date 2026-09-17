import React, { useEffect } from 'react';
import { EyeOff, Undo2 } from 'lucide-react';
import { useHiddenUndoStore } from '../model/useHiddenUndoStore';
import { useHiddenPostsStore } from '@/shared/model/useHiddenPostsStore';

export function UndoHideSnackbar() {
  const activeUndo = useHiddenUndoStore((s) => s.activeUndo);
  const clearUndo = useHiddenUndoStore((s) => s.clearUndo);
  const decrementTimer = useHiddenUndoStore((s) => s.decrementTimer);
  const unhidePost = useHiddenPostsStore((s) => s.unhidePost);

  useEffect(() => {
    if (!activeUndo) return;
    const interval = setInterval(() => {
      decrementTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [activeUndo, decrementTimer]);

  if (!activeUndo) return null;

  const handleUndo = () => {
    unhidePost(activeUndo.postId);
    clearUndo();
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#18181c]/95 backdrop-blur-2xl border border-white/15 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-slideUp">
      <div className="flex items-center gap-2">
        <EyeOff size={16} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-200">Post hidden from feed</span>
      </div>

      <div className="h-4 w-[1px] bg-white/10" />

      <button
        type="button"
        onClick={handleUndo}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 font-semibold text-xs transition-all cursor-pointer active:scale-95 border border-purple-500/30"
      >
        <Undo2 size={13} />
        <span>Undo ({activeUndo.remainingSeconds}s)</span>
      </button>
    </div>
  );
}

export default UndoHideSnackbar;
