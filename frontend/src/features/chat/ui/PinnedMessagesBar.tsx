import React, { useState } from 'react';
import { X, Layers, Pin } from 'lucide-react';
import { MessageView } from '../../../entities/chat/model/types';

interface PinnedMessagesBarProps {
  pinnedMessages: MessageView[];
  onJumpToMessage: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  onOpenAllPinned: () => void;
}

export default function PinnedMessagesBar({
  pinnedMessages,
  onJumpToMessage,
  onUnpin,
  onOpenAllPinned,
}: PinnedMessagesBarProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const count = pinnedMessages.length;
  const safeIndex = currentIndex < count ? currentIndex : 0;
  const currentMsg = pinnedMessages[safeIndex];

  const handleBarClick = () => {
    if (!currentMsg) return;
    onJumpToMessage(currentMsg.id);
    if (count > 1) {
      setCurrentIndex((prev) => (prev + 1) % count);
    }
  };

  const imageAttachment = currentMsg.attachments?.find(
    (a) => a.type === 'IMAGE' || a.type === 'GIF' || a.type === 'VIDEO',
  );

  const getPreviewText = (msg: MessageView) => {
    if (msg.body && msg.body.trim()) {
      try {
        const parsed = JSON.parse(msg.body);
        if (parsed.type === 'POLL') return `📊 Poll: ${parsed.question}`;
      } catch {
        // Not JSON
      }
      return msg.body;
    }
    if (msg.attachments && msg.attachments.length > 0) {
      const type = msg.attachments[0].type;
      if (type === 'IMAGE') return 'Photo';
      if (type === 'VIDEO') return 'Video';
      if (type === 'GIF') return 'GIF';
      if (type === 'AUDIO') return 'Voice message';
      return 'Attachment';
    }
    return 'Pinned message';
  };

  return (
    <div
      data-testid="pinned-messages-bar"
      className="relative z-20 flex items-center justify-between px-4 py-2 bg-[#0f1017]/85 backdrop-blur-xl border-b border-white/[0.08] shadow-sm select-none animate-fadeIn"
    >
      <button
        type="button"
        onClick={handleBarClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer group"
      >
        {/* Left Indicator bar / Segments */}
        <div className="flex flex-col gap-0.5 justify-center py-0.5 flex-shrink-0">
          {count === 1 ? (
            <div className="w-[3px] h-7 rounded-full bg-gradient-to-b from-purple-400 to-indigo-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
          ) : (
            <div className="flex flex-col gap-1 w-[3px] h-7 justify-between py-0.5">
              {pinnedMessages.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-full rounded-full transition-all duration-300 ${
                    idx === safeIndex
                      ? 'bg-purple-400 h-2.5 shadow-[0_0_6px_rgba(168,85,247,0.6)]'
                      : 'bg-white/20 h-1'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail if present */}
        {imageAttachment && (
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 bg-black/40">
            {imageAttachment.type === 'VIDEO' ? (
              <video src={imageAttachment.url} className="w-full h-full object-cover" muted />
            ) : (
              <img src={imageAttachment.url} alt="pinned" className="w-full h-full object-cover" />
            )}
          </div>
        )}

        {/* Text Section */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-purple-300 group-hover:text-purple-200 transition-colors">
              {count > 1 ? `Pinned message #${safeIndex + 1}` : 'Pinned message'}
            </span>
            <span className="text-[10px] text-gray-500 truncate">
              {currentMsg.sender.displayName ?? currentMsg.sender.username}
            </span>
          </div>
          <p className="text-xs text-gray-300 group-hover:text-white transition-colors truncate font-normal">
            {getPreviewText(currentMsg)}
          </p>
        </div>
      </button>

      {/* Right action button: Cross for 1 pinned, List/Modal for > 1 */}
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        {count === 1 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUnpin(currentMsg.id);
            }}
            title="Unpin message"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors active:scale-95 cursor-pointer"
          >
            <X size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAllPinned();
            }}
            title="View all pinned messages"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-400/30 text-purple-300 hover:bg-purple-500/25 hover:text-white text-xs font-semibold transition-all active:scale-95 cursor-pointer"
          >
            <Layers size={13} />
            <span>{count}</span>
          </button>
        )}
      </div>
    </div>
  );
}
