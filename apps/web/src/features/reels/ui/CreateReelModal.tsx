import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, Film, Loader2, Zap } from 'lucide-react';
import { useCreateReel } from '../api/reelsApi';
import { compressVideo } from '../lib/videoCompressor';
import { sanitizeMediaUrl } from '@/shared/lib/urlSecurity';

interface CreateReelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateReelModal: React.FC<CreateReelModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionPercent, setCompressionPercent] = useState(0);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    savingsPercent: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const createReelMutation = useCreateReel();

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('video/')) {
      setError('Please select a valid video file (MP4, WebM, MOV)');
      return;
    }

    if (selected.size > 150 * 1024 * 1024) {
      setError('Video file size exceeds 150MB limit');
      return;
    }

    setError(null);
    setFile(selected);
    setCompressionStats(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const rawUrl = URL.createObjectURL(selected);
    setPreviewUrl(sanitizeMediaUrl(rawUrl));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a video to upload');
      return;
    }

    let finalFile = file;
    let thumbnailBlob: Blob | null = null;
    let duration: number | null = null;
    let width: number | null = null;
    let height: number | null = null;

    try {
      setIsCompressing(true);
      setCompressionPercent(5);

      const compressionResult = await compressVideo(file, {
        onProgress: (p) => {
          setCompressionPercent(p.percent);
        },
      });

      finalFile = compressionResult.file;
      thumbnailBlob = compressionResult.thumbnailBlob;
      duration = compressionResult.duration;
      width = compressionResult.width;
      height = compressionResult.height;

      if (compressionResult.savingsPercent > 0) {
        setCompressionStats({
          originalSize: compressionResult.originalSize,
          compressedSize: compressionResult.compressedSize,
          savingsPercent: compressionResult.savingsPercent,
        });
      }
    } catch {
      // Gracefully continue with original file if browser compression fails
    } finally {
      setIsCompressing(false);
    }

    const formData = new FormData();
    formData.append('video', finalFile);
    if (thumbnailBlob) {
      formData.append('thumbnail', thumbnailBlob, 'thumbnail.webp');
    }
    if (duration) formData.append('duration', String(duration));
    if (width) formData.append('width', String(width));
    if (height) formData.append('height', String(height));
    if (caption.trim()) formData.append('caption', caption.trim());

    try {
      await createReelMutation.mutateAsync(formData);
      onClose();
      // Reset form
      setFile(null);
      setPreviewUrl(null);
      setCaption('');
      setCompressionStats(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create reel';
      setError(msg);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[92dvh] glass-modal border border-black/10 dark:border-white/10 rounded-2xl sm:rounded-3xl overflow-y-auto shadow-2xl flex flex-col my-auto text-gray-900 dark:text-white backdrop-blur-3xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-black/10 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500">
              <Film className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Create New Reel
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Video Dropzone / Preview */}
          {!previewUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-black/15 dark:border-white/15 hover:border-pink-500 rounded-2xl p-6 sm:p-9 flex flex-col items-center justify-center cursor-pointer transition-all bg-black/[0.02] dark:bg-white/[0.03] hover:bg-pink-500/[0.03] group"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-pink-500/10 flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform shadow-xs">
                <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7 text-pink-500" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm text-center">
                Select vertical video to upload
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                MP4, WebM up to 150MB (9:16 recommended)
              </p>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-9/16 max-h-[min(280px,35dvh)] mx-auto flex items-center justify-center shadow-lg border border-black/10 dark:border-white/10">
              <video
                src={sanitizeMediaUrl(previewUrl) || undefined}
                controls
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreviewUrl(null);
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 cursor-pointer shadow-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a catchy caption..."
                rows={3}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-pink-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Video Compression Progress & Savings Feedback */}
          {isCompressing && (
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/25 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-500 dark:text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
                  Optimizing video before uploading to Cloudflare...
                </span>
                <span className="font-mono">{compressionPercent}%</span>
              </div>
              <div className="w-full bg-black/10 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-linear-to-r from-pink-500 to-indigo-500 h-full transition-all duration-150 rounded-full"
                  style={{ width: `${compressionPercent}%` }}
                />
              </div>
            </div>
          )}

          {compressionStats && !isCompressing && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                Compressed for fast streaming:
              </span>
              <span className="font-mono font-bold">
                {(compressionStats.originalSize / (1024 * 1024)).toFixed(1)}MB →{' '}
                {(compressionStats.compressedSize / (1024 * 1024)).toFixed(1)}MB (-
                {compressionStats.savingsPercent}%)
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isCompressing || createReelMutation.isPending}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || isCompressing || createReelMutation.isPending}
              className="px-6 py-2 rounded-xl text-sm font-semibold bg-linear-to-r from-pink-600 to-indigo-600 text-white hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Compressing ({compressionPercent}%)...
                </>
              ) : createReelMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading to Cloudflare...
                </>
              ) : (
                'Post Reel'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
