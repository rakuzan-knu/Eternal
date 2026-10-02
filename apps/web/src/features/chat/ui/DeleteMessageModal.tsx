import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import Modal from '../../../shared/ui/Modal';

interface DeleteMessageModalProps {
  isOwnMessage: boolean;
  peerName?: string | null;
  canDeleteForAll?: boolean;
  onClose: () => void;
  onConfirm: (forAll: boolean) => void;
}

export default function DeleteMessageModal({
  isOwnMessage,
  peerName,
  canDeleteForAll = true,
  onClose,
  onConfirm,
}: DeleteMessageModalProps) {
  const [deleteForAll, setDeleteForAll] = useState(canDeleteForAll);

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {(close) => (
        <div className="bg-[#1c1c20] border border-white/10 rounded-2xl shadow-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 size={18} className="text-red-400" />
              Delete message
            </h2>
            <button
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-sm text-gray-300 mb-4">
            Are you sure you want to delete this message?
          </p>

          {canDeleteForAll ? (
            <label className="flex items-center gap-3 cursor-pointer select-none py-2 px-2.5 mb-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group">
              <input
                type="checkbox"
                checked={deleteForAll}
                onChange={(e) => setDeleteForAll(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/10 text-red-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-red-500"
              />
              <span className="text-sm text-gray-200 group-hover:text-white transition-colors">
                {peerName ? `Also delete for ${peerName}` : 'Delete for everyone'}
              </span>
            </label>
          ) : (
            <p className="text-xs text-gray-400 mb-5">
              This message will be removed for you. Other chat members will still be able to see it.
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm(canDeleteForAll ? deleteForAll : false);
                close();
              }}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 transition-all active:scale-95"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
