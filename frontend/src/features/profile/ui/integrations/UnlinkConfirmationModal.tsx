import React from 'react';
import { Unlink, AlertTriangle } from 'lucide-react';

interface UnlinkConfirmationModalProps {
  isOpen: boolean;
  platformName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const UnlinkConfirmationModal: React.FC<UnlinkConfirmationModalProps> = ({
  isOpen,
  platformName,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-sm bg-[#121216] border border-white/[0.1] rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-modalPop text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 shadow-[0_0_24px_rgba(239,68,68,0.2)]">
          <Unlink size={28} />
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-base font-bold text-white">Disconnect {platformName}?</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Are you sure you want to disconnect your{' '}
            <span className="text-white font-semibold">{platformName}</span> account? Your showcase
            widgets and live stats for this platform will no longer appear on your profile.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-gray-300 hover:text-white font-semibold text-xs transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer active:scale-95"
          >
            Unlink
          </button>
        </div>
      </div>
    </div>
  );
};
