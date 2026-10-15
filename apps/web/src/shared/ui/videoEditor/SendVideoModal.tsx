import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MoreVertical, Smile, Send, EyeOff, FileText, VolumeX, Check } from 'lucide-react';
import CircularProgress from '../CircularProgress';

interface SendVideoModalProps {
  videoSrc: string;
  isSpoiler: boolean;
  sendAsFile: boolean;
  isMuted: boolean;
  onToggleSpoiler: () => void;
  onToggleSendAsFile: () => void;
  onToggleMute: () => void;
  onClose: () => void;
  onSend: (caption: string) => void;
  uploadProgress?: number | null;
  isUploading?: boolean;
}

export default function SendVideoModal({
  videoSrc,
  isSpoiler,
  sendAsFile,
  isMuted,
  onToggleSpoiler,
  onToggleSendAsFile,
  onToggleMute,
  onClose,
  onSend,
  uploadProgress = null,
  isUploading = false,
}: SendVideoModalProps) {
  const [caption, setCaption] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isUploading) return;
    onSend(caption);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md rounded-3xl bg-[#1c1d27] border border-white/10 text-white shadow-2xl p-4 sm:p-5 flex flex-col gap-3.5 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={20} />
          </button>

          <h2 className="text-base font-bold text-white tracking-tight">Send Video</h2>

          {/* Three-dots menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="p-1 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="More options"
            >
              <MoreVertical size={20} />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-[#242533] border border-white/10 shadow-2xl py-1.5 px-1 flex flex-col gap-1 z-30 animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. Send as spoiler */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleSpoiler();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-200 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <EyeOff size={15} className="text-purple-400" />
                    <span>Send as spoiler</span>
                  </div>
                  {isSpoiler && <Check size={14} className="text-purple-400 font-bold" />}
                </button>

                {/* 2. Send as file */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleSendAsFile();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-200 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-blue-400" />
                    <span>Send as file</span>
                  </div>
                  {sendAsFile && <Check size={14} className="text-blue-400 font-bold" />}
                </button>

                {/* 3. Mute video */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleMute();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-200 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <VolumeX size={15} className="text-amber-400" />
                    <span>Mute video</span>
                  </div>
                  {isMuted && <Check size={14} className="text-amber-400 font-bold" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Video Preview with Circular Progress Overlay */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/90 border border-white/10 flex items-center justify-center shadow-lg">
          <video
            src={videoSrc || undefined}
            muted={isMuted}
            autoPlay
            loop
            playsInline
            className={`w-full h-full object-contain ${isSpoiler ? 'blur-md brightness-75' : ''}`}
          />

          {/* Spoiler badge overlay if enabled */}
          {isSpoiler && (
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/80 border border-purple-400/40 text-purple-300 text-[11px] font-bold flex items-center gap-1 shadow">
              <EyeOff size={12} />
              <span>Spoiler</span>
            </div>
          )}

          {/* Muted badge overlay if enabled */}
          {isMuted && (
            <div className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-black/80 border border-white/20 text-white/90 shadow">
              <VolumeX size={13} />
            </div>
          )}

          {/* Telegram Circular Progress Loader (Screenshot 5: 47%) */}
          {(isUploading || uploadProgress !== null) && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-20">
              <CircularProgress
                percent={uploadProgress ?? 47}
                size={68}
                strokeWidth={4.5}
                color="#ffffff"
              />
            </div>
          )}
        </div>

        {/* Caption Row with Send button */}
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2 mt-1">
          <div className="relative flex items-center flex-1 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 focus-within:border-purple-400/50 transition-colors">
            <button
              type="button"
              className="text-gray-400 hover:text-white transition-colors mr-2 cursor-pointer"
              title="Emoji"
            >
              <Smile size={19} />
            </button>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-transparent text-sm text-white placeholder-gray-400 outline-none"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className="w-10 h-10 rounded-full bg-[#8774e1] hover:bg-[#7763db] active:scale-90 text-white flex items-center justify-center shrink-0 shadow-lg shadow-[#8774e1]/30 transition-all cursor-pointer disabled:opacity-50"
            title="Send"
          >
            <Send size={18} className="translate-x-0.5" />
          </button>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
}
