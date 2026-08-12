import React from 'react';
import { X } from 'lucide-react';
import { MessageView } from '../../../entities/chat/model/types';

interface ReplyPreviewProps {
  message: MessageView;
  onCancel: () => void;
}

export default function ReplyPreview({ message, onCancel }: ReplyPreviewProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 mx-4 mb-2 rounded-xl bg-white/5 border-l-2 border-blue-400">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-blue-400">
          {message.sender.displayName ?? message.sender.username}
        </p>
        <p className="text-[13px] text-gray-400 truncate">{message.body}</p>
      </div>
      <button
        onClick={onCancel}
        className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
