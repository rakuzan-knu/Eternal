import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Monitor,
  MoreHorizontal,
  XCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Check,
  AlertCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { VideoLoader } from './VideoLoader';

export interface ScreenShareTileProps {
  stream: MediaStream | null;
  userName?: string;
  isLocal: boolean;
  onStopScreenShare?: () => void;
  onChangeSource?: () => void;
  className?: string;
}

export function ScreenShareTile({
  stream,
  userName = 'Screen',
  isLocal,
  onStopScreenShare,
  onChangeSource,
  className = '',
}: ScreenShareTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Local streamer preview state: defaults to false
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(!isLocal);
  const [autoPauseWhenHidden, setAutoPauseWhenHidden] = useState<boolean>(true);
  const [isBackgroundPaused, setIsBackgroundPaused] = useState<boolean>(false);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(!isLocal);

  const handleVideoFrameReady = useCallback(() => {
    setIsVideoLoading(false);
  }, []);

  useEffect(() => {
    if (!isLocal) {
      const video = videoRef.current;
      if (
        video &&
        video.videoWidth > 0 &&
        (video.readyState >= 2 || video.currentTime > 0) &&
        !video.paused
      ) {
        setIsVideoLoading(false);
      } else {
        setIsVideoLoading(true);
        const timer = setTimeout(() => {
          setIsVideoLoading(false);
        }, 400);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVideoLoading(false);
    }
  }, [stream, isLocal]);

  // Safeguard: check when video is loading so it never hangs indefinitely
  useEffect(() => {
    if (isLocal || !isVideoLoading) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && (video.videoWidth > 0 || video.readyState >= 2 || video.currentTime > 0)) {
        setIsVideoLoading(false);
      }
    }, 100);
    const timer = setTimeout(() => {
      setIsVideoLoading(false);
    }, 400);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isLocal, isVideoLoading]);

  // Context menu state
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Attach stream to video element and listen to track lifecycle
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      const getActiveStream = (src: MediaStream): MediaStream => {
        const vTracks = src.getVideoTracks();
        if (vTracks.length <= 1) return src;
        // Prioritize unmuted live track (actively receiving RTP frames), or the latest live track
        const activeTrack =
          vTracks.find((t) => !t.muted && t.readyState === 'live') ||
          vTracks.find((t) => t.readyState === 'live') ||
          vTracks[vTracks.length - 1];
        return activeTrack ? new MediaStream([activeTrack, ...src.getAudioTracks()]) : src;
      };

      const targetStream = getActiveStream(stream);
      if (video.srcObject !== targetStream) {
        video.srcObject = targetStream;
      }
      void video.play().catch(() => {});

      const handleTrackUpdate = () => {
        const updatedStream = getActiveStream(stream);
        if (video.srcObject !== updatedStream) {
          video.srcObject = updatedStream;
        }
        void video.play().catch(() => {});
      };

      stream.addEventListener('addtrack', handleTrackUpdate);
      stream.addEventListener('removetrack', handleTrackUpdate);
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((t) => {
        t.enabled = true;
        t.addEventListener('unmute', handleTrackUpdate);
        t.addEventListener('mute', handleTrackUpdate);
      });

      const playTimer = setTimeout(() => {
        if (video && video.paused) {
          void video.play().catch(() => {});
        }
      }, 100);

      return () => {
        clearTimeout(playTimer);
        stream.removeEventListener('addtrack', handleTrackUpdate);
        stream.removeEventListener('removetrack', handleTrackUpdate);
        videoTracks.forEach((t) => {
          t.removeEventListener('unmute', handleTrackUpdate);
          t.removeEventListener('mute', handleTrackUpdate);
        });
      };
    } else {
      video.srcObject = null;
    }
  }, [stream, isPreviewOpen, isBackgroundPaused]);

  // Tab & Browser Visibility Listener:
  // Automatically pause local preview when browser window is minimized or tab is hidden
  useEffect(() => {
    if (!isLocal) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (autoPauseWhenHidden && isPreviewOpen) {
          setIsBackgroundPaused(true);
          videoRef.current?.pause();
        }
      } else {
        if (isBackgroundPaused) {
          setIsBackgroundPaused(false);
          void videoRef.current?.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLocal, autoPauseWhenHidden, isPreviewOpen, isBackgroundPaused]);

  // Handle Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  }, []);

  // Handle Picture-in-Picture
  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('Picture-in-Picture error:', err);
    }
    setIsMenuOpen(false);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setIsSubmenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const shouldRenderVideo = !isLocal || (isPreviewOpen && !isBackgroundPaused);

  return (
    <div
      ref={containerRef}
      className={`group relative flex items-center justify-center bg-black/95 rounded-2xl overflow-hidden border border-zinc-800/80 shadow-2xl transition-all select-none ${className}`}
    >
      <div className="absolute top-3 left-3 flex items-center z-30 pointer-events-none drop-shadow-md">
        <div className="bg-zinc-800/90 backdrop-blur-md px-2.5 py-0.5 rounded-l-md border-y border-l border-zinc-700/60 text-[10px] font-bold text-zinc-200 tracking-wider">
          1080P 60 FPS
        </div>
        <div className="bg-rose-600/95 backdrop-blur-md px-2.5 py-0.5 rounded-r-md border-y border-r border-rose-500/50 text-[10px] font-extrabold text-white tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(225,29,72,0.4)]">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>LIVE</span>
        </div>
      </div>

      {/* Top Right Controls (3-dots menu & Fullscreen) */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit full screen' : 'Full screen'}
          className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-zinc-300 hover:text-white backdrop-blur-md border border-white/10 transition-colors"
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>

        {/* 3-dots Menu Button for Local Streamer */}
        {isLocal && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(!isMenuOpen);
                setIsSubmenuOpen(false);
              }}
              title="Stream settings"
              className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-zinc-300 hover:text-white backdrop-blur-md border border-white/10 transition-colors"
            >
              <MoreHorizontal size={15} />
            </button>

            {/* Main Context Menu*/}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800/90 rounded-xl p-1 shadow-2xl text-xs z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* 1. Stop Stream */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onStopScreenShare?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-lg transition-colors font-medium text-left"
                >
                  <XCircle size={15} />
                  <span>Stop Stream</span>
                </button>

                {/* 2. Change Source */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onChangeSource?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-200 hover:bg-white/10 rounded-lg transition-colors font-medium text-left"
                >
                  <RefreshCw size={15} />
                  <span>Change Source</span>
                </button>

                {/* 3. Stream in PiP / New Window */}
                <button
                  type="button"
                  onClick={togglePiP}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-200 hover:bg-white/10 rounded-lg transition-colors font-medium text-left"
                >
                  <ExternalLink size={15} />
                  <span>Stream in Separate Window</span>
                </button>

                <div className="h-px bg-white/10 my-1" />

                {/* 4. Other Settings Submenu Trigger */}
                <div
                  className="relative"
                  onMouseEnter={() => setIsSubmenuOpen(true)}
                  onMouseLeave={() => setIsSubmenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-zinc-200 hover:bg-white/10 rounded-lg transition-colors font-medium text-left"
                  >
                    <span>Other Settings</span>
                    <ChevronRight size={14} className="text-zinc-400" />
                  </button>

                  {/* Submenu Flyout*/}
                  {isSubmenuOpen && (
                    <div className="absolute right-full top-0 mr-1.5 w-64 bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800/90 rounded-xl p-1.5 shadow-2xl text-xs z-50 animate-in fade-in zoom-in-95 duration-150">
                      {/* Submenu Item 1: Show My Screen */}
                      <button
                        type="button"
                        onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 text-zinc-200 hover:bg-white/10 rounded-lg transition-colors font-medium text-left"
                      >
                        <span>Show My Screen</span>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isPreviewOpen
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'border-zinc-600 bg-zinc-800'
                          }`}
                        >
                          {isPreviewOpen && <Check size={12} strokeWidth={3} />}
                        </div>
                      </button>

                      {/* Submenu Item 2: Auto-pause preview when unfocused */}
                      <button
                        type="button"
                        onClick={() => setAutoPauseWhenHidden(!autoPauseWhenHidden)}
                        className="w-full flex items-center justify-between px-3 py-2 text-zinc-200 hover:bg-white/10 rounded-lg transition-colors font-medium text-left"
                      >
                        <span className="pr-2 leading-tight">
                          Pause preview when app is minimized
                        </span>
                        <div
                          className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                            autoPauseWhenHidden
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'border-zinc-600 bg-zinc-800'
                          }`}
                        >
                          {autoPauseWhenHidden && <Check size={12} strokeWidth={3} />}
                        </div>
                      </button>

                      <div className="h-px bg-white/10 my-1" />

                      {/* Submenu Item 3: Report issue */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsSubmenuOpen(false);
                          alert('Stream quality report sent to developers. Thank you!');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors font-medium text-left"
                      >
                        <AlertCircle size={14} />
                        <span>Report an issue</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => {
          void videoRef.current?.play().catch(() => {});
          handleVideoFrameReady();
        }}
        onLoadedData={() => {
          void videoRef.current?.play().catch(() => {});
          handleVideoFrameReady();
        }}
        onCanPlay={() => {
          void videoRef.current?.play().catch(() => {});
          handleVideoFrameReady();
        }}
        onPlaying={() => {
          handleVideoFrameReady();
        }}
        onWaiting={() => {
          if (!isLocal) {
            setIsVideoLoading(true);
          }
        }}
        className={`w-full h-full object-contain transition-opacity duration-300 ${
          shouldRenderVideo && !isVideoLoading
            ? 'opacity-100'
            : 'opacity-0 absolute pointer-events-none'
        }`}
        onClick={() => {
          if (isLocal) {
            // Clicking live preview as streamer allows pausing it back to placeholder
            setIsPreviewOpen(false);
          } else {
            if (videoRef.current && videoRef.current.paused) {
              void videoRef.current.play().catch(() => {});
            }
          }
        }}
      />

      {/* Video Loader Screen (Tumbling dual purple cubes) */}
      {shouldRenderVideo && isVideoLoading && (
        <VideoLoader
          userName={userName.startsWith('@') ? userName : `@${userName}`}
          isScreenShare={true}
        />
      )}

      {/* Resource-Saving Dark Placeholder */}
      {!shouldRenderVideo && (
        <div
          onClick={() => setIsPreviewOpen(true)}
          className="w-full h-full flex flex-col items-center justify-center text-center p-6 cursor-pointer select-none bg-zinc-950 transition-all duration-300 hover:bg-zinc-900/80 group/placeholder"
          title="Click to enable preview"
        >
          <div className="transform transition-transform duration-200 group-hover/placeholder:scale-105">
            <h3 className="text-base sm:text-lg font-bold text-white mb-1 tracking-wide">
              Your stream is still running!
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto">
              We paused the preview to save resources.
            </p>
          </div>
          <span className="mt-3 text-[11px] text-indigo-400 font-medium opacity-0 group-hover/placeholder:opacity-100 transition-opacity">
            Click anywhere to resume preview
          </span>
        </div>
      )}

      {/* Bottom Left Stream Metadata Pill */}
      {(!isVideoLoading || !shouldRenderVideo) && (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-semibold text-zinc-200 shadow-lg pointer-events-none">
          <Monitor size={14} className="text-indigo-400" />
          <span className="truncate max-w-44">
            {userName.startsWith('@') ? userName : `@${userName}`}
          </span>
        </div>
      )}
    </div>
  );
}
