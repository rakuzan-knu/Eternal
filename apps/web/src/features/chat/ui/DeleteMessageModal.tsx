import React from 'react';
import { X } from 'lucide-react';
import Modal from '../../../shared/ui/Modal';

interface DeleteMessageModalProps {
  isOwnMessage: boolean;
  onClose: () => void;
  onConfirm: (forAll: boolean) => void;
}

export default function DeleteMessageModal({
  isOwnMessage,
  onClose,
  onConfirm,
}: DeleteMessageModalProps) {
  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {(close) => (
        <div className="bg-[#1c1c20] border border-white/10 rounded-2xl shadow-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-base font-bold text-white">Delete message</h2>
            <button
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-sm text-gray-400 mb-5">
            This message will be removed for you. Other chat members will still be able to see it.
          </p>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={close}
              className="px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors active:scale-95"
            >
              Cancel
            </button>
            {isOwnMessage && (
              <button
                onClick={() => {
                  onConfirm(true);
                  close();
                }}
                className="px-4 py-2 rounded-full text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors active:scale-95"
              >
                Delete for everyone
              </button>
            )}
            <button
              onClick={() => {
                onConfirm(false);
                close();
              }}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white transition-colors active:scale-95"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
