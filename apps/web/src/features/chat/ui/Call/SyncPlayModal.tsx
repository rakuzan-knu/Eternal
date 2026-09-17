import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Film,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  X,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import type { SyncPlayEngine } from '../../lib/webrtc/syncPlayEngine';
import { sanitizeMediaUrl } from '@/shared/lib/urlSecurity';

interface SyncPlayModalProps {
  engine: SyncPlayEngine | null;
  isOpen: boolean;
  onClose: () => void;
  driftMs?: number;
  rttMs?: number;
}

export const SyncPlayModal: React.FC<SyncPlayModalProps> = ({
  engine,
  isOpen,
  onClose,
  driftMs = 0,
  rttMs = 0,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  // Default sample video for quick testing
  const DEFAULT_SAMPLE_URL =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  const [videoSrc, setVideoSrc] = useState<string>(DEFAULT_SAMPLE_URL);

  useEffect(() => {
    if (videoSrc.startsWith('blob:')) {
      if (blobUrlRef.current && blobUrlRef.current !== videoSrc) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      blobUrlRef.current = videoSrc;
    }
  }, [videoSrc]);
  const [videoTitle, setVideoTitle] = useState<string>('Big Buck Bunny (Sample)');
  const [urlInput, setUrlInput] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [showUrlPrompt, setShowUrlPrompt] = useState<boolean>(false);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Attach video element to engine
  useEffect(() => {
    if (!isOpen) return;

    const video = videoRef.current;
    if (video && engine) {
      engine.attachVideo(video);
    }

    return () => {
      if (engine) {
        engine.detachVideo();
      }
    };
  }, [isOpen, engine]);

  // SyncPlay state listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => setDuration(video.duration || 0);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [videoSrc]);

  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      engine?.notifyPlay();
    } else {
      video.pause();
      engine?.notifyPause();
    }
  }, [engine]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    engine?.notifySeek(newTime);
  };

  const handleLoadUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = urlInput.trim();
    if (!raw) return;

    const sanitized = sanitizeMediaUrl(raw);
    if (!sanitized) return;

    setVideoSrc(sanitized);
    setVideoTitle(sanitized.split('/').pop() || 'Remote Stream');
    setShowUrlPrompt(false);
    engine?.notifySourceChange(sanitized, sanitized.split('/').pop());
    setUrlInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
    const localBlobUrl = URL.createObjectURL(file);
    blobUrlRef.current = localBlobUrl;
    setVideoSrc(localBlobUrl);
    setVideoTitle(file.name);
    engine?.notifySourceChange('', file.name);
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="SyncPlay Watch Together"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Watch Together (SyncPlay)</h3>
                <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  NTP Sync • Drift {Math.abs(driftMs)}ms
                </span>
                {rttMs > 0 && (
                  <span className="text-[11px] font-mono text-neutral-400">RTT: {rttMs}ms</span>
                )}
              </div>
              <p className="text-xs text-neutral-400 truncate max-w-md">{videoTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowUrlPrompt((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors border border-white/5"
            >
              <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
              URL
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors border border-white/5"
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close SyncPlay"
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* URL Input Bar */}
        {showUrlPrompt && (
          <form
            onSubmit={handleLoadUrl}
            className="px-5 py-2.5 bg-neutral-900/90 border-b border-white/10 flex gap-2"
          >
            <input
              type="url"
              placeholder="Paste direct MP4 or WebM video URL..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white rounded-lg transition-colors"
            >
              Sync & Load
            </button>
          </form>
        )}

        {/* Video Display Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-90 overflow-hidden group">
          <video
            ref={videoRef}
            src={sanitizeMediaUrl(videoSrc) || undefined}
            playsInline
            muted={isMuted}
            className="w-full h-full object-contain max-h-[60vh]"
            onClick={handleTogglePlay}
          />

          {/* Big Play Overlay if paused */}
          {!isPlaying && (
            <button
              type="button"
              onClick={handleTogglePlay}
              aria-label="Play video"
              className="absolute p-5 rounded-full bg-purple-600/80 hover:bg-purple-500 text-white shadow-2xl backdrop-blur transition-transform transform hover:scale-110 active:scale-95"
            >
              <Play className="w-8 h-8 fill-current ml-1" />
            </button>
          )}

          {/* Sync indicator pill floating */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] text-neutral-300 border border-white/10">
            <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>Frame-Accurate P2P NTP</span>
          </div>
        </div>

        {/* Sync Controls Bar */}
        <div className="px-5 py-3 bg-neutral-950 border-t border-white/10 space-y-2 select-none">
          {/* Timeline Scrub Bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-neutral-400 w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-xs font-mono text-neutral-400 w-12">{formatTime(duration)}</span>
          </div>

          {/* Controls Bottom Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTogglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMuted((prev) => !prev)}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    if (videoRef.current) {
                      videoRef.current.volume = val;
                    }
                    setIsMuted(val === 0);
                  }}
                  className="w-20 h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-purple-400/80 bg-purple-950/40 px-2.5 py-1 rounded-full border border-purple-500/20">
                P2P Watch Party Active
              </span>

              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label="Toggle Fullscreen"
                className="p-1.5 text-neutral-400 hover:text-white transition-colors"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
