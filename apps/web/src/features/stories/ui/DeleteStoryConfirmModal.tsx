import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';

export interface DeleteStoryConfirmModalProps {
  isOpen: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

export function DeleteStoryConfirmModal({
  isOpen,
  isDeleting = false,
  onClose,
  onConfirm,
  title = 'Delete Story?',
  description = 'Are you sure you want to delete this story? This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
}: DeleteStoryConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (!isDeleting) onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn"
      onClick={isDeleting ? undefined : onClose}
    >
      <div
        className="bg-[#1c1c20] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scaleIn text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={24} />
        </div>

        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-6">{description}</p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="w-full py-3 px-4 rounded-xl bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-red-500/20"
          >
            {isDeleting ? 'Deleting...' : confirmText}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] text-gray-300 hover:text-white font-semibold text-sm transition-all cursor-pointer"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

export default DeleteStoryConfirmModal;
