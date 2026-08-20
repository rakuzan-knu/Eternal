import React from 'react';
import { Eraser, Undo2 } from 'lucide-react';
import { useClearHistoryUndoStore } from '../model/useClearHistoryUndoStore';

export function UndoClearHistorySnackbar() {
  const activeUndo = useClearHistoryUndoStore((s) => s.activeUndo);
  const cancelUndo = useClearHistoryUndoStore((s) => s.cancelUndo);

  if (!activeUndo) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-3.5 px-5 py-3 rounded-2xl bg-[#161822]/95 backdrop-blur-2xl border border-white/15 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)] animate-slideUp select-none"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 flex-shrink-0">
          <Eraser size={15} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-gray-100 truncate max-w-[220px] sm:max-w-[320px]">
            {activeUndo.conversationTitle
              ? `History cleared: ${activeUndo.conversationTitle}`
              : 'Chat history cleared'}
          </span>
          <span className="text-[11px] text-gray-400">
            {activeUndo.forAll ? 'Deleted for everyone' : 'Deleted for you'}
          </span>
        </div>
      </div>

      <div className="h-5 w-[1px] bg-white/10 mx-1" />

      <button
        type="button"
        onClick={cancelUndo}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 active:scale-95 text-sky-300 hover:text-sky-200 font-semibold text-xs transition-all cursor-pointer border border-sky-500/30"
      >
        <Undo2 size={13} className="shrink-0" />
        <span>Undo ({activeUndo.remainingSeconds}s)</span>
      </button>
    </div>
  );
}

export default UndoClearHistorySnackbar;
