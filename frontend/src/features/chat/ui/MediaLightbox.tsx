import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, MessageSquare } from 'lucide-react';
import { MediaItem } from '../model/chatMediaTypes';

interface MediaLightboxProps {
  items: MediaItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
}

const EXIT_DURATION_MS = 160;

export default function MediaLightbox({
  items,
  index,
  onIndexChange,
  onClose,
  onJumpToMessage,
}: MediaLightboxProps) {
  const current = items[index];
  const [isClosing, setIsClosing] = useState(false);

  const requestClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onClose, EXIT_DURATION_MS);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      if (e.key === 'ArrowRight' && index < items.length - 1) onIndexChange(index + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length]);

  if (!current) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = current.attachment.url;
    link.download = current.attachment.fileName ?? 'download';
    link.target = '_blank';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div
      className={`fixed inset-0 z-[400] flex flex-col bg-black/95 backdrop-blur-xl transition-opacity duration-150 ${
        isClosing ? 'opacity-0' : 'opacity-100 animate-fadeIn'
      }`}
    >
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="text-sm text-gray-300">
          <span className="font-semibold text-white">
            {current.message.sender.displayName ?? current.message.sender.username}
          </span>
          <span className="mx-2 text-gray-600">•</span>
          {new Date(current.message.createdAt).toLocaleString([], {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
          <span className="mx-2 text-gray-600">•</span>
          {index + 1} of {items.length}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onJumpToMessage(current.message.id)}
            title="Go to message"
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
          >
            <MessageSquare size={17} />
          </button>
          <button
            onClick={handleDownload}
            title="Download"
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
          >
            <Download size={17} />
          </button>
          <button
            onClick={requestClose}
            title="Close"
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 px-16 relative">
        {index > 0 && (
          <button
            onClick={() => onIndexChange(index - 1)}
            className="absolute left-4 w-11 h-11 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-all active:scale-90"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {current.attachment.type === 'VIDEO' ? (
          <video
            key={current.attachment.id}
            src={current.attachment.url}
            controls
            autoPlay
            className="max-w-full max-h-[80vh] rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-modalPop"
          />
        ) : (
          <img
            key={current.attachment.id}
            src={current.attachment.url}
            alt={current.attachment.fileName ?? 'media'}
            className="max-w-full max-h-[80vh] rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.6)] object-contain animate-modalPop"
          />
        )}

        {index < items.length - 1 && (
          <button
            onClick={() => onIndexChange(index + 1)}
            className="absolute right-4 w-11 h-11 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-all active:scale-90"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {items.length > 1 && (
        <div className="flex-shrink-0 flex items-center gap-1.5 px-6 py-4 overflow-x-auto custom-scrollbar">
          {items.map((item, i) => (
            <button
              key={item.attachment.id}
              onClick={() => onIndexChange(i)}
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all active:scale-90 ${
                i === index ? 'border-blue-400' : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              {item.attachment.type === 'VIDEO' ? (
                <div className="w-full h-full bg-white/10 flex items-center justify-center text-gray-400 text-[10px]">
                  VID
                </div>
              ) : (
                <img src={item.attachment.url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
