import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import Modal from '../../../shared/ui/Modal';

interface BatchDeleteModalProps {
  count: number;
  canDeleteForAll?: boolean;
  onClose: () => void;
  onConfirm: (forAll: boolean) => void;
}

export default function BatchDeleteModal({
  count,
  canDeleteForAll = true,
  onClose,
  onConfirm,
}: BatchDeleteModalProps) {
  const [forAll, setForAll] = useState(false);

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {(close) => (
        <div className="bg-[#181a22] border border-white/10 rounded-2xl shadow-2xl p-5 backdrop-blur-2xl">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <Trash2 size={16} />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Delete {count} {count === 1 ? 'message' : 'messages'}
              </h2>
            </div>
            <button
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Are you sure you want to delete these {count} messages?
          </p>

          {canDeleteForAll && (
            <label className="flex items-center gap-2.5 mb-5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forAll}
                onChange={(e) => setForAll(e.target.checked)}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-red-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-gray-200">Also delete for everyone</span>
            </label>
          )}

          <div className="flex items-center justify-end gap-2.5">
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
                onConfirm(forAll);
                close();
              }}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-red-500 hover:bg-red-400 text-white transition-colors active:scale-95 shadow-lg shadow-red-500/20"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
