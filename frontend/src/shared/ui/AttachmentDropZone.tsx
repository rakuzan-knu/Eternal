import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { MAX_ATTACHMENTS_PER_MESSAGE } from '../lib/attachmentLimits';

interface AttachmentDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  children: React.ReactNode;
}

export default function AttachmentDropZone({ onFilesDropped, children }: AttachmentDropZoneProps) {
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
      className="relative flex-1 flex flex-col min-h-0"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn pointer-events-none">
          <div className="flex flex-col items-center gap-3 px-10 py-8 rounded-3xl border-2 border-dashed border-blue-400/60 bg-white/5 backdrop-blur-2xl">
            <UploadCloud size={40} className="text-blue-400" />
            <p className="text-white font-semibold">Drop files to attach</p>
            <p className="text-xs text-gray-400">
              Images, videos, and files up to 25 MB — max {MAX_ATTACHMENTS_PER_MESSAGE} at a time
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
