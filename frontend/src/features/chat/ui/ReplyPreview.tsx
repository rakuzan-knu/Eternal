import React from 'react';
import { X, Reply } from 'lucide-react';
import { MessageView } from '../../../entities/chat/model/types';

interface ReplyPreviewProps {
  message: MessageView;
  onCancel: () => void;
}

export default function ReplyPreview({ message, onCancel }: ReplyPreviewProps) {
  const senderName = message.sender.displayName ?? message.sender.username ?? 'User';
  const previewText = message.body || (message.attachments?.length ? 'Attachment' : 'Message');

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 mx-3 sm:mx-4 mb-2 rounded-2xl bg-[#181a20]/90 border border-white/10 backdrop-blur-xl shadow-lg animate-popIn">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-1 self-stretch rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
        <div className="min-w-0 flex-1 pl-1">
          <div className="flex items-center gap-1.5">
            <Reply size={12} className="text-sky-400" />
            <p className="text-xs font-bold text-sky-400 truncate">{senderName}</p>
          </div>
          <p className="text-xs text-gray-300 truncate mt-0.5">{previewText}</p>
        </div>
      </div>
      <button
        onClick={onCancel}
        type="button"
        className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors active:scale-95"
        title="Cancel reply"
      >
        <X size={15} />
      </button>
    </div>
  );
}
