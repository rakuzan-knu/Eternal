import React from 'react';
import { Pencil, X, FileText } from 'lucide-react';
import FileIconBadge from './FileIconBadge';
import { MessageView, AttachmentView } from '../../../entities/chat/model/types';
import { useDecryptedMessageBody } from '../model/useDecryptedMessageBody';
import { extractFirstUrl } from '../../../shared/lib/urlUtils';

interface EditPreviewProps {
  message: MessageView;
  onCancel: () => void;
  /** 1:1 peer for E2EE quote decrypt; null/undefined = groups or unknown. */
  e2eePeerUserId?: string | null;
  /** Optional replaced attachment preview when user swaps media */
  replacedAttachment?: Partial<AttachmentView> | null;
}

export default function EditPreview({
  message,
  onCancel,
  e2eePeerUserId = null,
  replacedAttachment = null,
}: EditPreviewProps) {
  const previewBody = useDecryptedMessageBody(
    message.body,
    e2eePeerUserId,
    message.conversationId,
    message.sender?.id ?? null,
  );

  const editAttachment = replacedAttachment ?? message.attachments?.[0];
  const editThumbnail = editAttachment?.thumbnailUrl || editAttachment?.url;

  const isVideoNote = Boolean(
    editAttachment &&
    (editAttachment.type === 'VIDEO_NOTE' ||
      (editAttachment.type === 'VIDEO' &&
        (editAttachment.fileName?.includes('video_note') ||
          editAttachment.mimeType?.includes('video_note') ||
          (editAttachment.width &&
            editAttachment.height &&
            editAttachment.width === editAttachment.height)))),
  );

  const isPhoto = Boolean(
    editAttachment &&
    !isVideoNote &&
    (editAttachment.type === 'IMAGE' || editAttachment.mimeType?.startsWith('image/')),
  );

  const isVideo = Boolean(
    editAttachment &&
    !isVideoNote &&
    (editAttachment.type === 'VIDEO' || editAttachment.mimeType?.startsWith('video/')),
  );

  const isVoice = Boolean(
    editAttachment &&
    (editAttachment.type === 'VOICE' ||
      editAttachment.type === 'AUDIO' ||
      editAttachment.mimeType?.startsWith('audio/')),
  );

  const isSticker = Boolean(
    editAttachment &&
    (editAttachment.type === 'STICKER' ||
      editAttachment.mimeType === 'image/webp' ||
      editAttachment.url?.includes('/stickers/')),
  );

  const isFile = Boolean(
    editAttachment &&
    !isPhoto &&
    !isVideo &&
    !isVideoNote &&
    !isVoice &&
    !isSticker &&
    (editAttachment.type === 'FILE' || Boolean(editAttachment.fileName)),
  );

  const firstUrl = extractFirstUrl(previewBody);
  const isLinkMessage = Boolean(
    !editAttachment &&
    firstUrl &&
    (previewBody?.includes('http') || previewBody?.toLowerCase().includes('links:')),
  );

  const displayThumbnail = !isVoice
    ? editThumbnail ||
      (isVideoNote ? message.sender.avatar || (message.sender as any).avatarUrl : null)
    : null;

  const getPreviewText = () => {
    if (isVideoNote) return 'Video message';
    if (isSticker) {
      const emoji = (editAttachment as any)?.emoji || (editAttachment as any)?.stickerEmoji;
      return `${emoji || '⭐'} Sticker`;
    }
    if (isPhoto) {
      return previewBody?.trim() ? `Photo, ${previewBody.trim().replace(/\s+/g, ' ')}` : '🖼️ Photo';
    }
    if (isVideo) {
      return previewBody?.trim() ? `Video, ${previewBody.trim().replace(/\s+/g, ' ')}` : '📹 Video';
    }
    if (isVoice) return 'Voice message';
    if (isFile) return `📄 ${editAttachment?.fileName || 'Document'}`;
    if (isLinkMessage) {
      const cleaned = (previewBody || firstUrl || '').replace(/\s+/g, ' ');
      return cleaned.toLowerCase().startsWith('links:') ? cleaned : `Links: ${cleaned}`;
    }
    if (previewBody) return previewBody.replace(/\s+/g, ' ');
    if (editAttachment) return 'Attachment';
    return 'Message';
  };

  const handleJumpToOriginal = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = document.getElementById(`msg-${message.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('animate-jumpHighlight');
      setTimeout(() => el.classList.remove('animate-jumpHighlight'), 1200);
    }
  };

  return (
    <div
      onClick={handleJumpToOriginal}
      className="group/edit relative w-full flex items-center justify-between gap-2.5 px-3.5 pt-2 pb-1.5 select-none cursor-pointer bg-transparent transition-colors duration-200"
      title="Jump to message"
    >
      <div
        key={message.id}
        className="flex items-center gap-2.5 min-w-0 flex-1 animate-fadeIn duration-150"
      >
        {/* Telegram Edit Pencil Icon */}
        <div className="w-5 h-5 flex items-center justify-center shrink-0 text-purple-400">
          <Pencil size={18} strokeWidth={2.4} />
        </div>

        {/* Vertical Accent Line */}
        <div className="w-[3px] h-[34px] rounded-full shrink-0 bg-purple-500" />

        {/* Media Thumbnail */}
        {displayThumbnail ? (
          <div
            className={`relative w-[34px] h-[34px] shrink-0 overflow-hidden ${
              isVideoNote
                ? 'rounded-full bg-black/40 border border-white/10'
                : isSticker
                  ? 'rounded-md bg-transparent'
                  : 'rounded-md bg-black/40 border border-white/10'
            } shadow-xs flex items-center justify-center`}
          >
            <img
              src={displayThumbnail}
              alt="Edit attachment preview"
              className={`w-full h-full ${isSticker ? 'object-contain' : 'object-cover'}`}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : isSticker ? (
          <div className="w-[34px] h-[34px] flex items-center justify-center shrink-0 text-xl select-none">
            {(editAttachment as any)?.emoji || (editAttachment as any)?.stickerEmoji || '⭐'}
          </div>
        ) : isFile ? (
          <div className="w-[34px] h-[34px] rounded-md flex items-center justify-center shrink-0">
            <FileIconBadge
              fileName={editAttachment?.fileName}
              mimeType={editAttachment?.mimeType}
              size="xs"
            />
          </div>
        ) : null}

        {/* Text Details (Editing + Message Snippet) */}
        <div className="min-w-0 flex-1 flex flex-col justify-center leading-tight">
          <p className="text-[13px] font-semibold truncate tracking-tight text-purple-400">
            Editing
          </p>
          <p className="text-[12.5px] text-gray-700 dark:text-white/75 truncate mt-0.5 whitespace-nowrap font-normal">
            {getPreviewText()}
          </p>
        </div>
      </div>

      {/* Cancel / Close Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all cursor-pointer text-purple-400 hover:text-purple-300"
        title="Cancel edit (Esc)"
      >
        <X size={17} strokeWidth={2.4} />
      </button>
    </div>
  );
}
