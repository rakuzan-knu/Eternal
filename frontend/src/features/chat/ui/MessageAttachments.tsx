import React from 'react';
import { Download, FileText } from 'lucide-react';
import { AttachmentView } from '../../../entities/chat/model/types';
import { formatFileSize } from '@/shared/lib/attachmentLimits';
import { MediaAttachment } from './MessageAttachmentPreviews';
import { AudioMessageBubble } from './AudioMessageBubble';
import { VideoNoteBubble } from './VideoNoteBubble';

interface MessageAttachmentsProps {
  attachments: AttachmentView[];
  isOwnMessage: boolean;
  senderName?: string;
  sentAt?: string;
  conversationId?: string;
  statusIcon?: React.ReactNode;
}

export default function MessageAttachments({
  attachments,
  isOwnMessage,
  senderName,
  sentAt,
  conversationId,
  statusIcon,
}: MessageAttachmentsProps) {
  if (attachments.length === 0) return null;

  const videoNotes = attachments.filter(
    (a) =>
      a.type === 'VIDEO' &&
      (a.fileName?.includes('video_note') ||
        a.mimeType?.includes('video_note') ||
        (a.width && a.height && a.width === a.height)),
  );

  const regularMedia = attachments.filter(
    (a) =>
      (a.type === 'IMAGE' || a.type === 'GIF' || a.type === 'VIDEO') &&
      !videoNotes.some((vn) => vn.id === a.id),
  );

  const audioNotes = attachments.filter((a) => a.type === 'AUDIO');
  const files = attachments.filter((a) => a.type === 'FILE');

  return (
    <div className="flex flex-col gap-2">
      {/* Video Notes */}
      {videoNotes.map((vn) => (
        <div key={vn.id} className="py-1">
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
          className={`grid gap-1 max-w-[320px] ${regularMedia.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
        >
          {regularMedia.map((a) => (
            <MediaAttachment key={a.id} attachment={a} />
          ))}
        </div>
      )}

      {/* Audio / Voice Messages */}
      {audioNotes.map((a) => (
        <AudioMessageBubble
          key={a.id}
          attachment={a}
          isOwnMessage={isOwnMessage}
          senderName={senderName}
          sentAt={sentAt}
          conversationId={conversationId}
          statusIcon={statusIcon}
        />
      ))}

      {/* Files */}
      {files.map((a) => (
        <a
          key={a.id}
          href={a.url}
          target="_blank"
          rel="noreferrer"
          download={a.fileName ?? undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border max-w-[280px] transition-colors ${
            isOwnMessage
              ? 'bg-purple-500/15 border-purple-400/20 hover:bg-purple-500/25'
              : 'bg-white/10 border-white/10 hover:bg-white/15'
          }`}
        >
          <span className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/10 text-gray-200">
            <FileText size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-white truncate">
              {a.fileName ?? 'File'}
            </span>
            <span className="block text-xs text-gray-400">{formatFileSize(a.size)}</span>
          </span>
          <Download size={16} className="text-gray-400 flex-shrink-0" />
        </a>
      ))}
    </div>
  );
}
