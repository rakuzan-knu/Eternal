import React, { useState } from 'react';
import { Smile, Reply, MoreHorizontal, Check, CheckCheck } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import { MessageView } from '../../../entities/chat/model/types';
import { formatMessageTime } from '../lib/groupMessagesByDate';
import MessageReactionPicker from './MessageReactionPicker';
import MessageReactionsModal from './MessageReactionsModal';
import MessageContextMenu from './MessageContextMenu';
import DeleteMessageModal from './DeleteMessageModal';
import MessageAttachments from './MessageAttachments';

interface MessageBubbleProps {
  message: MessageView;
  isOwnMessage: boolean;
  showAvatar: boolean;
  isReadByOther: boolean;
  currentUserId: string | null;
  onReply: (message: MessageView) => void;
  onEdit: (message: MessageView) => void;
  onDelete: (messageId: string, forAll: boolean) => void;
  onForward: (message: MessageView) => void;
  onTogglePin: (message: MessageView) => void;
  onReport: (message: MessageView) => void;
  onReact: (messageId: string, emoji: string) => void;
  onUnreact: (messageId: string, emoji: string) => void;
}

export default function MessageBubble({
  message,
  isOwnMessage,
  showAvatar,
  isReadByOther,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onTogglePin,
  onReport,
  onReact,
  onUnreact,
}: MessageBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isReactionsModalOpen, setReactionsModalOpen] = useState(false);

  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} px-4`}>
        <p className="text-sm italic text-gray-600 py-1.5">This message was deleted</p>
      </div>
    );
  }

  const handleReactionClick = (emoji: string) => {
    const existing = message.reactions.find((r) => r.emoji === emoji);
    if (existing?.selfReacted) onUnreact(message.id, emoji);
    else onReact(message.id, emoji);
  };

  return (
    <div
      className={`group flex items-end gap-2 px-4 py-0.5 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isOwnMessage && (
        <div className="w-8 flex-shrink-0 self-end">
          {showAvatar && <Avatar size="sm" src={message.sender.avatar} />}
        </div>
      )}

      {isOwnMessage && (isHovered || isPickerOpen || isMenuOpen) && (
        <div className="relative flex items-center gap-1 mb-1">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Smile size={16} />
          </button>
          <button
            onClick={() => onReply(message)}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Reply size={16} />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
            {isMenuOpen && (
              <MessageContextMenu
                message={message}
                isOwnMessage={isOwnMessage}
                align="right"
                onClose={() => setMenuOpen(false)}
                onEdit={() => onEdit(message)}
                onDelete={() => setDeleteModalOpen(true)}
                onForward={() => onForward(message)}
                onTogglePin={() => onTogglePin(message)}
                onReport={() => onReport(message)}
              />
            )}
          </div>
          {isPickerOpen && (
            <MessageReactionPicker
              align="right"
              onPick={(emoji) => handleReactionClick(emoji)}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
      )}

      <div
        className="max-w-[70%] flex flex-col"
        style={{ alignItems: isOwnMessage ? 'flex-end' : 'flex-start' }}
      >
        {message.forwardedFrom && (
          <p className="text-[11px] text-gray-500 mb-0.5 px-1">
            Forwarded from{' '}
            {message.forwardedFrom.sender.displayName ?? message.forwardedFrom.sender.username}
          </p>
        )}

        {message.replyTo && (
          <div className="mb-1 px-3 py-1.5 border-l-2 border-blue-400 bg-white/5 rounded-lg max-w-full">
            <p className="text-[12px] font-semibold text-blue-400">
              {message.replyTo.sender.displayName ?? message.replyTo.sender.username}
            </p>
            <p className="text-[12px] text-gray-400 truncate">{message.replyTo.body}</p>
          </div>
        )}

        <MessageAttachments attachments={message.attachments} isOwnMessage={isOwnMessage} />

        {message.body && (
          <div
            className={`px-4 py-2.5 rounded-2xl ${
              isOwnMessage
                ? 'bg-blue-500 text-white rounded-br-md'
                : 'bg-white/10 text-gray-100 rounded-bl-md'
            }`}
          >
            <p className="text-[15px] whitespace-pre-wrap break-words">{message.body}</p>
          </div>
        )}

        <div
          className={`flex items-center gap-1 mt-0.5 px-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
        >
          <span className="text-[11px] text-gray-500">{formatMessageTime(message.createdAt)}</span>
          {message.isEdited && <span className="text-[11px] text-gray-600">edited</span>}
          {isOwnMessage &&
            (isReadByOther ? (
              <CheckCheck size={13} className="text-blue-400" />
            ) : (
              <Check size={13} className="text-gray-500" />
            ))}
        </div>

        {message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => setReactionsModalOpen(true)}
                className={`animate-popIn flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-transform duration-150 hover:scale-110 ${
                  r.selfReacted
                    ? 'bg-blue-500/20 border-blue-400/40 text-blue-300'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!isOwnMessage && (isHovered || isPickerOpen || isMenuOpen) && (
        <div className="relative flex items-center gap-1 mb-1">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Smile size={16} />
          </button>
          <button
            onClick={() => onReply(message)}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Reply size={16} />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
            {isMenuOpen && (
              <MessageContextMenu
                message={message}
                isOwnMessage={isOwnMessage}
                align="left"
                onClose={() => setMenuOpen(false)}
                onEdit={() => onEdit(message)}
                onDelete={() => setDeleteModalOpen(true)}
                onForward={() => onForward(message)}
                onTogglePin={() => onTogglePin(message)}
                onReport={() => onReport(message)}
              />
            )}
          </div>
          {isPickerOpen && (
            <MessageReactionPicker
              align="left"
              onPick={(emoji) => handleReactionClick(emoji)}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
      )}

      {isDeleteModalOpen && (
        <DeleteMessageModal
          isOwnMessage={isOwnMessage}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={(forAll) => {
            onDelete(message.id, forAll);
            setDeleteModalOpen(false);
          }}
        />
      )}

      {isReactionsModalOpen && (
        <MessageReactionsModal
          reactions={message.reactions}
          currentUserId={currentUserId}
          onClose={() => setReactionsModalOpen(false)}
          onRemoveOwn={(emoji) => onUnreact(message.id, emoji)}
        />
      )}
    </div>
  );
}
