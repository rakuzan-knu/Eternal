import React from 'react';
import { Download, FileText } from 'lucide-react';
import { AttachmentView } from '../../../entities/chat/model/types';
import { formatFileSize } from '@/shared/lib/attachmentLimits';
import { MediaAttachment, AudioAttachment } from './MessageAttachmentPreviews';

interface MessageAttachmentsProps {
  attachments: AttachmentView[];
  isOwnMessage: boolean;
}

export default function MessageAttachments({ attachments, isOwnMessage }: MessageAttachmentsProps) {
  if (attachments.length === 0) return null;

  const media = attachments.filter(
    (a) => a.type === 'IMAGE' || a.type === 'GIF' || a.type === 'VIDEO',
  );
  const files = attachments.filter((a) => a.type === 'FILE' || a.type === 'AUDIO');

  return (
    <div className="flex flex-col gap-1.5">
      {media.length > 0 && (
        <div
          className={`grid gap-1 max-w-[320px] ${media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
        >
          {media.map((a) => (
            <MediaAttachment key={a.id} attachment={a} />
          ))}
        </div>
      )}

      {files.map((a) =>
        a.type === 'AUDIO' ? (
          <AudioAttachment key={a.id} attachment={a} />
        ) : (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            download={a.fileName ?? undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border max-w-[280px] transition-colors ${
              isOwnMessage
                ? 'bg-blue-400/20 border-blue-300/20 hover:bg-blue-400/30'
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
        ),
      )}
    </div>
  );
}
