import React from 'react';
import { Moon, Shield, LogOut } from 'lucide-react';
import { useAuthStore } from '@/shared/model/useAuthStore';

interface CurfewOverlayProps {
  curfewEnd?: string | null;
  onOpenFamilyCenter: () => void;
}

export const CurfewOverlay: React.FC<CurfewOverlayProps> = ({
  curfewEnd = '07:00',
  onOpenFamilyCenter,
}) => {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-[#0a0a0d]/90 backdrop-blur-2xl animate-fadeIn text-white select-none">
      <div className="relative w-full max-w-md bg-[#121316] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-5">
        <div className="w-16 h-16 rounded-full bg-white/10 text-white flex items-center justify-center shadow-inner">
          <Moon size={32} className="text-white" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-white">Downtime Active</h2>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-xs">
            Family Center has scheduled downtime for your account
            {curfewEnd ? ` until ${curfewEnd}` : ''}. Platform access is temporarily paused.
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full pt-2">
          <button
            type="button"
            onClick={onOpenFamilyCenter}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Shield size={16} />
            <span>Open Family Center</span>
          </button>

          <button
            type="button"
            onClick={() => clearAuth()}
            className="w-full py-2.5 rounded-2xl hover:bg-white/5 text-xs font-semibold text-gray-400 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={15} />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CurfewOverlay;
