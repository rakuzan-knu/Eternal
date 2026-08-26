import React, { useRef, useState } from 'react';
import ChatDropzoneOverlay from '../../features/chat/ui/ChatDropzoneOverlay';

interface AttachmentDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  children: React.ReactNode;
  className?: string;
}

export default function AttachmentDropZone({
  onFilesDropped,
  children,
  className = 'relative flex-1 flex flex-col min-h-0',
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
      <ChatDropzoneOverlay isDragging={isDragging} />
    </div>
  );
}
