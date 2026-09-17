import React, { useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  Video,
  Archive,
  Image as ImageIcon,
  Download,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { useCallStore } from '../../model/callStore';
import type { FileTransferItem } from '../../lib/webrtc/p2pFileTransfer';

interface FileTransferDrawerProps {
  onClose: () => void;
  onSendFile: (file: File) => Promise<string>;
  onCancelTransfer: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(name: string, mime: string) {
  const lower = name.toLowerCase();
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(lower)) {
    return <ImageIcon size={20} className="text-emerald-400" />;
  }
  if (mime.startsWith('video/') || /\.(mp4|mkv|webm|mov)$/.test(lower)) {
    return <Video size={20} className="text-blue-400" />;
  }
  if (/\.(zip|tar|gz|rar|7z)$/.test(lower)) {
    return <Archive size={20} className="text-amber-400" />;
  }
  return <FileText size={20} className="text-violet-400" />;
}

export function FileTransferDrawer({
  onClose,
  onSendFile,
  onCancelTransfer,
}: FileTransferDrawerProps) {
  const { fileTransfers } = useCallStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Escape key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const transferList = Object.values(fileTransfers);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      for (let i = 0; i < e.target.files.length; i++) {
        await onSendFile(e.target.files[i]);
      }
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        await onSendFile(e.dataTransfer.files[i]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg p-6 rounded-2xl bg-zinc-950/95 border border-white/10 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud size={20} className="text-indigo-400" />
            <h3 className="text-base font-semibold text-white tracking-wide">
              P2P File Transfer ($0 Cloud Cost)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="relative group border-2 border-dashed border-white/20 hover:border-indigo-500/80 rounded-xl p-6 flex flex-col items-center justify-center gap-2 bg-zinc-900/50 hover:bg-indigo-950/10 cursor-pointer transition-all duration-200"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-400 flex items-center justify-center transition-transform group-hover:scale-110">
            <UploadCloud size={24} />
          </div>
          <p className="text-xs font-semibold text-white text-center">
            Click or drag & drop files here
          </p>
          <p className="text-[11px] text-gray-400 text-center">
            Files stream directly peer-to-peer via RTCDataChannel with unlimited size.
          </p>
        </div>

        {/* Transfers List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {transferList.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-xs">
              No active or completed P2P transfers yet.
            </div>
          ) : (
            transferList.map((item: FileTransferItem) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/5 space-y-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-zinc-800">
                      {getFileIcon(item.name, item.mimeType)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate max-w-50 sm:max-w-65">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                        <span>{formatBytes(item.size)}</span>
                        <span>•</span>
                        <span className="capitalize">{item.direction}</span>
                        {item.status === 'transferring' && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-400 font-mono font-medium">
                              {item.speedMb} MB/s
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'completed' && item.blobUrl && (
                      <a
                        href={item.blobUrl}
                        download={item.name}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors shadow-sm"
                      >
                        <Download size={13} />
                        <span>Save</span>
                      </a>
                    )}
                    {item.status === 'completed' && !item.blobUrl && (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                        <CheckCircle2 size={14} />
                        <span>Sent</span>
                      </span>
                    )}
                    {item.status === 'transferring' && (
                      <button
                        onClick={() => onCancelTransfer(item.id)}
                        className="text-gray-400 hover:text-rose-400 transition-colors"
                        title="Cancel"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                    {item.status === 'cancelled' && (
                      <span className="text-gray-400 text-xs italic">Cancelled</span>
                    )}
                    {item.status === 'error' && (
                      <span className="flex items-center gap-1 text-rose-400 text-xs font-medium">
                        <AlertCircle size={14} />
                        <span>Failed</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {item.status === 'transferring' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Progress</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-indigo-500 via-violet-500 to-purple-400 transition-all duration-150"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
