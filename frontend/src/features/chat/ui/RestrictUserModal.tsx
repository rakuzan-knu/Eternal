import React from 'react';
import { X, ShieldAlert } from 'lucide-react';
import Modal from '../../../shared/ui/Modal';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { chatApi } from '../api/chatApi';

interface RestrictUserModalProps {
  userId: string;
  onClose: () => void;
}

export default function RestrictUserModal({ userId, onClose }: RestrictUserModalProps) {
  const handleRestrict = async () => {
    try {
      await chatApi.restrictAccount(userId);
    } catch {
      // Graceful error handling
    }

    useMessageToastStore.getState().addToast({
      id: `toast-${Date.now()}`,
      conversationId: '',
      messageId: '',
      title: 'Account Restricted',
      body: 'This account has been restricted. You won’t receive notifications from them.',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {(close) => (
        <div className="bg-[#181a22] border border-white/10 rounded-3xl w-full shadow-2xl overflow-hidden backdrop-blur-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <ShieldAlert size={16} />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">Restrict Account</h3>
            </div>
            <button
              type="button"
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-xs text-gray-300 mb-4 leading-relaxed">
            Restricting limits unwanted interactions without them knowing. Their chats will be moved
            to restricted accounts and will not notify you.
          </p>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 rounded-full text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRestrict}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              Restrict
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
