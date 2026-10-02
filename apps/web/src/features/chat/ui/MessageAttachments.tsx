import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { AttachmentView } from '../../../entities/chat/model/types';
import { formatFileSize } from '@/shared/lib/attachmentLimits';
import { MediaAttachment } from './MessageAttachmentPreviews';
import { AudioMessageBubble } from './AudioMessageBubble';
import { VideoNoteBubble } from './VideoNoteBubble';
import FileIconBadge from './FileIconBadge';
import DocumentPreviewModal from './DocumentPreviewModal';
import type { ChatThemeConfig } from '../model/chatTheme';
import type { ContrastTheme } from '../lib/themeUtils';
import { isVideoAttachment, isImageAttachment } from '../lib/chatMediaUtils';

export interface MessageAttachmentsProps {
  attachments: AttachmentView[];
  isOwnMessage: boolean;
  senderName?: string;
  sentAt?: string;
  conversationId?: string;
  statusIcon?: React.ReactNode;
  chatTheme?: ChatThemeConfig | null;
  contrast?: ContrastTheme | null;
  onOpenMedia?: (attachment: AttachmentView, originRect?: DOMRect) => void;
  onOpenDocument?: (attachment: AttachmentView) => void;
  onContextMenuAttachment?: (e: React.MouseEvent, attachment: AttachmentView) => void;
}

export default function MessageAttachments({
  attachments,
  isOwnMessage,
  senderName,
  sentAt,
  conversationId,
  statusIcon,
  chatTheme,
  contrast,
  onOpenMedia,
  onOpenDocument,
  onContextMenuAttachment,
}: MessageAttachmentsProps) {
  const [previewingDocument, setPreviewingDocument] = useState<AttachmentView | null>(null);

  if (attachments.length === 0) return null;

  const videoNotes = attachments.filter(
    (a) =>
      isVideoAttachment(a) &&
      (a.fileName?.includes('video_note') ||
        a.mimeType?.includes('video_note') ||
        (a.width && a.height && a.width === a.height)),
  );

  const regularMedia = attachments.filter(
    (a) =>
      (a.type === 'IMAGE' ||
        a.type === 'GIF' ||
        a.type === 'VIDEO' ||
        isVideoAttachment(a) ||
        isImageAttachment(a)) &&
      !videoNotes.some((vn) => vn.id === a.id),
  );

  const audioNotes = attachments.filter((a) => a.type === 'AUDIO');
  const files = attachments.filter(
    (a) =>
      !videoNotes.some((vn) => (vn.id && vn.id === a.id) || (vn.url && vn.url === a.url)) &&
      !regularMedia.some((rm) => (rm.id && rm.id === a.id) || (rm.url && rm.url === a.url)) &&
      !audioNotes.some((an) => (an.id && an.id === a.id) || (an.url && an.url === a.url)),
  );

  const handleFileClick = (e: React.MouseEvent, a: AttachmentView) => {
    e.preventDefault();
    if (onOpenDocument) {
      onOpenDocument(a);
    } else {
      setPreviewingDocument(a);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Video Notes */}
      {videoNotes.map((vn, idx) => (
        <div
          key={vn.id || vn.url || `vn-${idx}`}
          className="py-1"
          onContextMenu={(e) => onContextMenuAttachment?.(e, vn)}
        >
          <VideoNoteBubble
            attachment={vn}
            senderName={senderName}
            sentAt={sentAt}
            conversationId={conversationId}
          />
        </div>
      ))}

      {/* Regular Media */}
      {regularMedia.length > 0 && (
        <div
          className={`grid gap-1 ${
            regularMedia.length === 1
              ? 'grid-cols-1 w-full min-w-[260px] sm:min-w-[320px] max-w-[440px] sm:max-w-[480px]'
              : 'grid-cols-2 max-w-[440px] sm:max-w-[480px]'
          }`}
        >
          {regularMedia.map((a, idx) => (
            <div
              key={a.id || a.url || `media-${idx}`}
              onContextMenu={(e) => onContextMenuAttachment?.(e, a)}
            >
              <MediaAttachment attachment={a} onOpenMedia={onOpenMedia} />
            </div>
          ))}
        </div>
      )}

      {/* Audio / Voice Messages */}
      {audioNotes.map((a, idx) => (
        <AudioMessageBubble
          key={a.id || a.url || `audio-${idx}`}
          attachment={a}
          isOwnMessage={isOwnMessage}
          senderName={senderName}
          sentAt={sentAt}
          conversationId={conversationId}
          statusIcon={statusIcon}
          chatTheme={chatTheme}
          contrast={contrast}
        />
      ))}

      {/* Files with Telegram realistic icon badge and click-to-preview */}
      {files.map((a, idx) => (
        <div
          key={a.id || a.url || `file-${idx}`}
          onClick={(e) => handleFileClick(e, a)}
          onContextMenu={(e) => onContextMenuAttachment?.(e, a)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border max-w-[320px] transition-all cursor-pointer group/file ${
            isOwnMessage
              ? 'bg-purple-500/15 border-purple-400/20 hover:bg-purple-500/25 hover:border-purple-400/35 shadow-sm'
              : 'bg-white/10 border-white/10 hover:bg-white/15 hover:border-white/20 shadow-sm'
          }`}
          title="Click to preview document"
        >
          <div className="shrink-0 group-hover/file:scale-105 transition-transform">
            <FileIconBadge fileName={a.fileName} mimeType={a.mimeType} size="sm" />
          </div>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-white truncate group-hover/file:text-purple-200 transition-colors">
              {a.fileName ?? 'File'}
            </span>
            <span className="block text-xs text-gray-400">{formatFileSize(a.size)}</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const link = document.createElement('a');
              link.href = a.url;
              link.download = a.fileName ?? 'download';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="p-1.5 rounded-full hover:bg-white/20 text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Download file"
            aria-label="Download file"
          >
            <Download size={16} />
          </button>
        </div>
      ))}

      {previewingDocument && (
        <DocumentPreviewModal
          fileOrUrl={{
            url: previewingDocument.url,
            fileName: previewingDocument.fileName || 'Document',
            mimeType: previewingDocument.mimeType ?? undefined,
            size: previewingDocument.size ?? undefined,
          }}
          onClose={() => setPreviewingDocument(null)}
        />
      )}
    </div>
  );
}
