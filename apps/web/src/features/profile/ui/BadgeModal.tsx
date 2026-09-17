import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import UserBadgeIcon from '@/entities/profile/ui/UserBadgeIcon';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface BadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: Badge[];
}

export default function BadgeModal({ isOpen, onClose, badges }: BadgeModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-[#09090b]/95 backdrop-blur-3xl w-full max-w-md rounded-[2.5rem] border border-white/[0.08] shadow-[0_30px_100px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden scale-in-95 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.05] bg-white/[0.01]">
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-wide">
            User Badges
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/[0.03] hover:bg-white/[0.1] border border-white/[0.05] text-gray-400 hover:text-white transition-all duration-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto flex flex-col gap-2.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
          {badges.map((badge, index) => (
            <div
              key={badge.id}
              className="group flex items-center gap-5 p-4 rounded-3xl bg-white/[0.02] hover:bg-white/[0.06] transition-all duration-300 border border-transparent hover:border-white/[0.08] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-center min-w-[56px] h-14 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.08] shadow-inner backdrop-blur-md group-hover:scale-110 transition-transform duration-300">
                <UserBadgeIcon badgeId={badge.id} size="lg" showTooltip={false} />
              </div>

              <div className="flex flex-col justify-center">
                <span className="text-white font-semibold text-[15px] tracking-wide group-hover:text-gray-100 transition-colors">
                  {badge.name}
                </span>
                <span className="text-gray-400 text-sm mt-0.5 leading-relaxed group-hover:text-gray-300 transition-colors">
                  {badge.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
