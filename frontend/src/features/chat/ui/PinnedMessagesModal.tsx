import React from 'react';
import { X, Pin, PinOff } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import Modal from '../../../shared/ui/Modal';
import { MessageView } from '../../../entities/chat/model/types';
import { formatMessageTime } from '../lib/groupMessagesByDate';

interface PinnedMessagesModalProps {
  pinnedMessages: MessageView[];
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

export default function PinnedMessagesModal({
  pinnedMessages,
  onClose,
  onJumpToMessage,
  onUnpin,
}: PinnedMessagesModalProps) {
  const sorted = [...pinnedMessages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <Modal onClose={onClose} className="w-full max-w-sm max-h-[70vh] flex flex-col">
      {(close) => (
        <div className="bg-[#1c1c20] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[70vh]">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
            <h2 className="text-lg font-bold text-white">Pinned messages</h2>
            <button
              onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          {sorted.length === 0 ? (
            <div className="flex flex-col items-center text-center px-8 pb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4 animate-popIn">
                <Pin size={26} className="text-white" />
              </div>
              <p className="text-base font-semibold text-white mb-1">No pinned messages</p>
              <p className="text-sm text-gray-500">
                Pinned messages from this chat will show up here.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-3">
              {sorted.map((message, index) => (
                <div
                  key={message.id}
                  style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
                  className="animate-fadeIn group flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <button
                    onClick={() => {
                      onJumpToMessage(message.id);
                      close();
                    }}
                    className="flex items-start gap-3 flex-1 min-w-0 text-left"
                  >
                    <Avatar size="sm" src={message.sender.avatar} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white truncate">
                          {message.sender.displayName ?? message.sender.username}
                        </span>
                        <span className="text-[11px] text-gray-500 flex-shrink-0">
                          {formatMessageTime(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-400 truncate">
                        {message.body
                          ? message.body
                          : message.attachments.length > 0
                            ? 'Sent an attachment'
                            : ''}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => onUnpin(message.id)}
                    title="Unpin"
                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-pink-400 opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all active:scale-90"
                  >
                    <PinOff size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
