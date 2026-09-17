import React from 'react';
import Modal from '../../../shared/ui/Modal';

interface DeleteChatFolderModalProps {
  folderName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteChatFolderModal({
  folderName,
  onClose,
  onConfirm,
}: DeleteChatFolderModalProps) {
  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {(close) => (
        <div className="rounded-[24px] border border-white/10 bg-[#1f1f23]/92 p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.72)] backdrop-blur-2xl backdrop-saturate-150">
          <p className="text-sm leading-6">
            Delete folder <span className="font-semibold">{folderName}</span>? Chats will remain.
          </p>
          <div className="mt-6 flex justify-end gap-6">
            <button className="font-semibold text-sky-300" onClick={close}>
              Cancel
            </button>
            <button className="font-semibold text-red-400" onClick={onConfirm}>
              Delete
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
