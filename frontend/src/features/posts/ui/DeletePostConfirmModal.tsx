import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeletePostConfirmModalProps {
  isOpen: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeletePostConfirmModal({
  isOpen,
  isDeleting = false,
  onClose,
  onConfirm,
}: DeletePostConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#1c1c20] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scaleIn text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={24} />
        </div>

        <h3 className="text-lg font-bold text-white mb-2">Delete post?</h3>
        <p className="text-sm text-gray-400 mb-6">
          Are you sure you want to delete this post? This action cannot be undone.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="w-full py-3 px-4 rounded-xl bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-red-500/20"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] text-gray-300 hover:text-white font-semibold text-sm transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeletePostConfirmModal;
