import React from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft } from 'lucide-react';

interface ModalProps {
  onClose: () => void;
  onBack?: () => void;
  title: string;
  children: React.ReactNode;
  widthClassName?: string;
}

export function Modal({
  onClose,
  onBack,
  title,
  children,
  widthClassName = 'max-w-md',
}: ModalProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${widthClassName} mx-4 bg-[#16161a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-6 animate-modalIn`}
      >
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="text-gray-400 hover:text-white transition-colors -ml-1 p-1 shrink-0"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="text-lg font-bold text-white truncate">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
