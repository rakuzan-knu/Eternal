import React from 'react';
import { Phone, PhoneOff, Video, ShieldCheck } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import { useCallStore } from '../../model/callStore';
import { useCall } from '../../model/CallContext';

export function IncomingCallToast() {
  const incomingCall = useCallStore((s) => s.incomingCall);
  const { acceptCall, rejectCall } = useCall();

  if (!incomingCall) return null;

  const isVideo = String(incomingCall.callType).toUpperCase() === 'VIDEO';

  return (
    <div className="fixed top-3 sm:top-5 left-3 right-3 sm:left-auto sm:right-5 z-50 max-w-sm p-4 rounded-2xl bg-zinc-950/90 border border-white/15 backdrop-blur-2xl shadow-2xl animate-slideDown">
      <div className="flex items-center gap-3.5">
        {/* Pulsating Avatar */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
          <Avatar
            src={incomingCall.caller.avatar}
            size="md"
            className="relative z-10 ring-2 ring-emerald-500/50 shadow-lg"
          />
        </div>

        {/* Caller Info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">
            {incomingCall.caller.displayName || incomingCall.caller.username}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
            {isVideo ? (
              <Video size={13} className="text-indigo-400 shrink-0" />
            ) : (
              <Phone size={13} className="text-emerald-400 shrink-0" />
            )}
            <span className="truncate">Incoming {isVideo ? 'video' : 'voice'} call…</span>
          </div>
          {incomingCall.zkpProof && (
            <div className="flex items-center gap-1 mt-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full w-fit">
              <ShieldCheck size={12} className="text-emerald-300" />
              <span>ZK-Verified Anonymous</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => rejectCall('DECLINED')}
            title="Decline"
            aria-label="Decline Call"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 transition-all duration-200"
          >
            <PhoneOff size={18} />
          </button>

          <button
            onClick={() => void acceptCall()}
            title="Accept"
            aria-label="Accept Call"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:scale-105"
          >
            <Phone size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
