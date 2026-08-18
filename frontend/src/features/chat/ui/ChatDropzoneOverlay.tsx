import React from 'react';
import { UploadCloud } from 'lucide-react';
import { MAX_ATTACHMENTS_PER_MESSAGE } from '@/shared/lib/attachmentLimits';

interface ChatDropzoneOverlayProps {
  isDragging: boolean;
}

export default function ChatDropzoneOverlay({ isDragging }: ChatDropzoneOverlayProps) {
  if (!isDragging) return null;

  return (
    <div
      data-testid="chat-dropzone-overlay"
      className="absolute inset-2 sm:inset-3 z-50 flex items-center justify-center bg-[#090a14]/80 backdrop-blur-xl border-2 border-dashed border-purple-500/60 rounded-3xl animate-fadeIn pointer-events-none shadow-[0_0_50px_rgba(168,85,247,0.2)]"
    >
      <div className="flex flex-col items-center gap-3 px-8 py-6 text-center animate-scaleIn">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-lg shadow-purple-500/20 animate-bounce">
          <UploadCloud size={32} />
        </div>
        <div>
          <p className="text-base font-bold text-white tracking-tight">Drop files here to send</p>
          <p className="text-xs text-gray-300 mt-1">
            Photos, videos, and documents up to 50MB (max {MAX_ATTACHMENTS_PER_MESSAGE} files)
          </p>
        </div>
      </div>
    </div>
  );
}
