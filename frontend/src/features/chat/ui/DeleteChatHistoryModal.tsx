import React from 'react';
import Modal from '../../../shared/ui/Modal';
import { useUIStore } from '../../../shared/model/useUIStore';

interface DeleteChatHistoryModalProps {
  conversationName: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function DeleteChatHistoryModal({
  conversationName,
  onClose,
  onConfirm,
  isLoading = false,
}: DeleteChatHistoryModalProps) {
  const openEditProfile = useUIStore((s) => s.openEditProfile);

  const handleOpenAutoDelete = () => {
    onClose();
    openEditProfile('security');
  };

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {() => (
        <div className="bg-[#151922]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl text-left">
          <p className="text-[15px] font-medium text-gray-100 leading-snug mb-3">
            Are you sure you want to delete all message history with{' '}
            <span className="font-semibold text-white">{conversationName}</span>?
          </p>

          <p className="text-[13px] text-gray-400 mb-6">This action cannot be undone.</p>

          <div className="mb-6">
            <button
              type="button"
              onClick={handleOpenAutoDelete}
              className="text-[13.5px] font-medium text-sky-400 hover:text-sky-300 hover:underline transition-colors cursor-pointer"
            >
              Enable Auto-Delete
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-sky-400 hover:bg-sky-400/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
