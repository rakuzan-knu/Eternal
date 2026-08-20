import React, { useState } from 'react';
import Modal from '../../../shared/ui/Modal';
import Avatar from '../../../shared/ui/Avatar';
import GroupAvatarCollage from '../../../shared/ui/GroupAvatarCollage';

interface DeleteChatModalProps {
  conversationName: string;
  avatarUrl: string | null;
  isGroup?: boolean;
  memberAvatars?: (string | null)[];
  otherUserName?: string;
  onClose: () => void;
  onConfirm: (forAll: boolean) => void;
  isLoading?: boolean;
}

export default function DeleteChatModal({
  conversationName,
  avatarUrl,
  isGroup = false,
  memberAvatars = [],
  otherUserName,
  onClose,
  onConfirm,
  isLoading = false,
}: DeleteChatModalProps) {
  const [alsoDeleteForAll, setAlsoDeleteForAll] = useState(false);
  const targetName = otherUserName || conversationName;

  return (
    <Modal onClose={onClose} className="w-full max-w-sm">
      {() => (
        <div className="bg-[#151922]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-shrink-0">
              {isGroup ? (
                <GroupAvatarCollage avatars={memberAvatars} size={36} />
              ) : (
                <Avatar size="sm" src={avatarUrl} />
              )}
            </div>
            <h3 className="text-base font-bold text-white">Delete chat</h3>
          </div>

          <p className="text-[14.5px] font-medium text-gray-100 leading-snug mb-2">
            {isGroup ? (
              <>
                Are you sure you want to delete{' '}
                <span className="font-semibold text-white">{conversationName}</span>?
              </>
            ) : (
              <>
                Are you sure you want to delete all message history with{' '}
                <span className="font-semibold text-white">{conversationName}</span>?
              </>
            )}
          </p>

          <p className="text-[13px] text-gray-400 mb-5">
            {isGroup
              ? 'You will leave the group and your chat history will be deleted from your panel.'
              : 'This action cannot be undone.'}
          </p>

          {!isGroup && (
            <label className="flex items-center gap-3 mb-6 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={alsoDeleteForAll}
                onChange={(e) => setAlsoDeleteForAll(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-white/5 text-sky-500 focus:ring-0 focus:ring-offset-0 transition-colors cursor-pointer accent-sky-500"
              />
              <span className="text-[13.5px] text-gray-300 group-hover:text-white transition-colors">
                Also delete for {targetName}
              </span>
            </label>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
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
              onClick={() => onConfirm(alsoDeleteForAll)}
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
