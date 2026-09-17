import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { MAX_ATTACHMENTS_PER_MESSAGE } from '@/shared/lib/attachmentLimits';

interface AttachmentDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  children: React.ReactNode;
  className?: string;
  overlay?: React.ReactNode;
}

function DefaultDropzoneOverlay({ isDragging }: { isDragging: boolean }) {
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

export default function AttachmentDropZone({
  onFilesDropped,
  children,
  className = 'relative flex-1 flex flex-col min-h-0',
  overlay,
}: AttachmentDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (!hasFiles(e)) return;
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files?.length) onFilesDropped(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      className={className}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {overlay ? isDragging ? overlay : null : <DefaultDropzoneOverlay isDragging={isDragging} />}
    </div>
  );
}
