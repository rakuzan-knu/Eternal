import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { MusicFolder } from '../model/types';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';

interface DeleteFolderConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: MusicFolder | null;
  onDeleted?: () => void;
}

export const DeleteFolderConfirmModal: React.FC<DeleteFolderConfirmModalProps> = ({
  isOpen,
  onClose,
  folder,
  onDeleted,
}) => {
  const deleteMusicFolder = useMusicHubStore((s) => s.deleteMusicFolder);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !folder) return null;

  const handleConfirm = () => {
    deleteMusicFolder(folder.id);
    useMessageToastStore.getState().addToast({
      id: `toast-${Date.now()}`,
      conversationId: '',
      messageId: '',
      title: 'Folder deleted',
      body: `Folder "${folder.name}" has been deleted.`,
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
    onDeleted?.();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      {/* Dark backdrop with blur */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-200"
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-[0_24px_50px_rgba(0,0,0,0.85)] flex flex-col select-none animate-scaleUp border border-white/10"
        style={{
          background:
            'linear-gradient(145deg, rgba(26, 27, 36, 0.95) 0%, rgba(14, 15, 22, 0.98) 100%)',
          backdropFilter: 'blur(40px)',
          boxShadow:
            'inset 0 1px 1px 0 rgba(255, 255, 255, 0.2), 0 24px 60px -12px rgba(0, 0, 0, 0.85)',
        }}
      >
        <h2 className="text-xl font-bold tracking-tight text-white mb-3">Delete folder?</h2>

        <p className="text-sm text-gray-300 leading-relaxed mb-8">
          Folder "{folder.name}" will be deleted permanently. Playlists inside will remain in your
          library.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-900/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
