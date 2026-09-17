import React from 'react';
import { ArrowRightLeft, Loader2, Smartphone, X } from 'lucide-react';
import { useCallHandoff } from '../../model/useCallHandoff';

export function CallHandoffBanner() {
  const { remoteCall, isTransferring, transferError, requestHandoff, dismissHandoff } =
    useCallHandoff();

  if (!remoteCall && !transferError) return null;

  if (transferError && !remoteCall) {
    return (
      <div className="mx-4 my-2 px-3 py-2 rounded-xl bg-zinc-900/90 border border-white/10 text-xs text-zinc-300 flex items-center justify-between shadow-lg animate-in fade-in duration-200">
        <span>{transferError}</span>
      </div>
    );
  }

  if (!remoteCall) return null;

  return (
    <div className="mx-4 my-2 px-4 py-2.5 rounded-2xl bg-linear-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/30 text-white shadow-[0_4px_20px_rgba(16,185,129,0.15)] flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
          <Smartphone size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate text-white">
            Active call on your other device
          </p>
          <p className="text-[11px] text-emerald-300/80 truncate">
            {remoteCall.type === 'video' ? 'Video call' : 'Audio call'} · One-click instant transfer
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={isTransferring}
          onClick={() => requestHandoff(remoteCall.callId)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-md disabled:opacity-50"
        >
          {isTransferring ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <ArrowRightLeft size={13} />
          )}
          <span>Transfer Here</span>
        </button>

        <button
          type="button"
          onClick={dismissHandoff}
          className="p-1 text-zinc-400 hover:text-white rounded-lg transition"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
