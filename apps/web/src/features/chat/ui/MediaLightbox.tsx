import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ImageOff,
  Trash2,
  CornerUpRight,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Copy,
  Check,
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  PictureInPicture2,
  Maximize,
  Minimize,
} from 'lucide-react';
import { MediaItem } from '../model/chatMediaTypes';
import { MessageView } from '../../../entities/chat/model/types';
import Avatar from '../../../shared/ui/Avatar';
import DeleteMessageModal from './DeleteMessageModal';
import { formatFullMessageDate } from '../lib/groupMessagesByDate';
import { isVideoAttachment, formatVideoTime } from '../lib/chatMediaUtils';

export interface MediaLightboxProps {
  items: MediaItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onJumpToMessage?: (messageId: string) => void;
  onDelete?: (messageId: string, forAll: boolean) => void;
  onForward?: (message: MessageView) => void;
  originRect?: DOMRect | { top: number; left: number; width: number; height: number } | null;
  currentUserId?: string | null;
}

const EXIT_DURATION_MS = 160;

export default function MediaLightbox({
  items,
  index,
  onIndexChange,
  onClose,
  onJumpToMessage,
  onDelete,
  onForward,
  originRect,
  currentUserId,
}: MediaLightboxProps) {
  const current = items[index];
  const isVideo = isVideoAttachment(current?.attachment);

  const [animStage, setAnimStage] = useState<'entering' | 'entered' | 'closing'>(
    originRect ? 'entering' : 'entered',
  );
  const [hasError, setHasError] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showZoomSlider, setShowZoomSlider] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev' | null>(null);

  // Video player state & refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevVolumeRef = useRef<number>(1);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isVolumeSliderOpen, setIsVolumeSliderOpen] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const prevIndexRef = useRef(index);

  // Track slide direction when navigating via arrows or keyboard
  useEffect(() => {
    if (prevIndexRef.current !== index) {
      setSlideDirection(index > prevIndexRef.current ? 'next' : 'prev');
      prevIndexRef.current = index;
    }
  }, [index]);

  // Lock background scrolling while lightbox is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    };
  }, []);

  // Reset transforms and video playback state whenever displayed media changes
  useEffect(() => {
    setHasError(false);
    setRotation(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setShowZoomSlider(false);
    setIsCopied(false);

    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
    setBufferedPercent(0);
    setPlaybackRate(1);
    setIsSpeedMenuOpen(false);
    setIsVolumeSliderOpen(false);
    setIsScrubbing(false);
    setScrubTime(null);
    setAreControlsVisible(true);
  }, [current?.attachment?.id]);

  // Trigger smooth FLIP entry animation on mount
  useEffect(() => {
    if (originRect) {
      const frame1 = requestAnimationFrame(() => {
        const frame2 = requestAnimationFrame(() => {
          setAnimStage('entered');
        });
        return () => cancelAnimationFrame(frame2);
      });
      return () => cancelAnimationFrame(frame1);
    }
  }, [originRect]);

  const requestClose = useCallback(() => {
    if (animStage === 'closing') return;
    setAnimStage('closing');
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setTimeout(onClose, EXIT_DURATION_MS);
  }, [animStage, onClose]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      const p = v.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleVolumeMouseEnter = useCallback(() => {
    if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    setIsVolumeSliderOpen(true);
  }, []);

  const handleVolumeMouseLeave = useCallback(() => {
    volumeTimeoutRef.current = setTimeout(() => {
      setIsVolumeSliderOpen(false);
    }, 350);
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isMuted || volume === 0) {
      const nextVol = prevVolumeRef.current > 0 ? prevVolumeRef.current : 1;
      setVolume(nextVol);
      setIsMuted(false);
      v.muted = false;
      v.volume = nextVol;
    } else {
      prevVolumeRef.current = volume > 0 ? volume : 1;
      setIsMuted(true);
      v.muted = true;
    }
  }, [isMuted, volume]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val === 0) {
      setIsMuted(true);
      if (videoRef.current) videoRef.current.muted = true;
    } else {
      setIsMuted(false);
      prevVolumeRef.current = val;
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.volume = val;
      }
    }
  }, []);

  const calculateScrubberPos = useCallback((clientX: number) => {
    if (!scrubberRef.current) return 0;
    const rect = scrubberRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleScrubberPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || !videoRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      const pos = calculateScrubberPos(e.clientX);
      const targetTime = pos * (duration || 0);
      setIsScrubbing(true);
      setScrubTime(targetTime);

      const onPointerMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault();
        const movePos = calculateScrubberPos(moveEvent.clientX);
        setScrubTime(movePos * (duration || 0));
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        setIsScrubbing(false);
        setScrubTime(null);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);

        const finalPos = calculateScrubberPos(upEvent.clientX);
        const finalTime = finalPos * (duration || 0);
        if (videoRef.current) {
          videoRef.current.currentTime = finalTime;
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [calculateScrubberPos, duration],
  );

  const handleTogglePiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else if (videoRef.current && 'requestPictureInPicture' in videoRef.current) {
        await videoRef.current.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (err) {
      console.warn('PiP not available:', err);
    }
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        const target = containerRef.current || videoRef.current;
        if (target?.requestFullscreen) {
          await target.requestFullscreen();
          setIsFullscreen(true);
        }
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const handleEnterPiP = () => setIsPiP(true);
    const handleLeavePiP = () => setIsPiP(false);
    el.addEventListener('enterpictureinpicture', handleEnterPiP);
    el.addEventListener('leavepictureinpicture', handleLeavePiP);
    return () => {
      el.removeEventListener('enterpictureinpicture', handleEnterPiP);
      el.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [index]);

  const updateBuffered = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v.buffered.length > 0 && v.duration > 0) {
      const end = v.buffered.end(v.buffered.length - 1);
      setBufferedPercent(Math.min(100, Math.max(0, (end / v.duration) * 100)));
    }
  }, []);

  const handleContainerMouseMove = useCallback(() => {
    setAreControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!isVolumeSliderOpen && !isScrubbing && !isSpeedMenuOpen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setAreControlsVisible(false);
      }, 2500);
    }
  }, [isVolumeSliderOpen, isScrubbing, isSpeedMenuOpen]);

  const handleContainerMouseLeave = useCallback(() => {
    if (!isVolumeSliderOpen && !isScrubbing && !isSpeedMenuOpen) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setAreControlsVisible(false);
      }, 800);
    }
  }, [isVolumeSliderOpen, isScrubbing, isSpeedMenuOpen]);

  // Keyboard navigation & dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (isDeleteModalOpen) return;
        requestClose();
        return;
      }
      if (isDeleteModalOpen) return;
      if (e.code === 'Space' && isVideo) {
        e.preventDefault();
        togglePlay();
        return;
      }
      if ((e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') && isVideo) {
        e.preventDefault();
        toggleMute();
        return;
      }
      if (
        (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') &&
        !e.ctrlKey &&
        !e.metaKey &&
        isVideo
      ) {
        e.preventDefault();
        handleToggleFullscreen();
        return;
      }
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      if (e.key === 'ArrowRight' && index < items.length - 1) onIndexChange(index + 1);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    index,
    isDeleteModalOpen,
    items.length,
    onIndexChange,
    requestClose,
    isVideo,
    togglePlay,
    toggleMute,
    handleToggleFullscreen,
  ]);

  // Ctrl + MouseWheel zoom listener (non-passive to prevent browser zoom)
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setShowZoomSlider(true);
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        setZoom((prev) => {
          const next = Math.min(3.5, Math.max(1, Math.round((prev + delta) * 100) / 100));
          if (next === 1) setPan({ x: 0, y: 0 });
          return next;
        });
      }
    };

    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, []);

  // Pointer panning handlers for when zoom > 1
  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Rotate 90 degrees
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Toggle Zoom between 1x and 2x
  const handleZoomToggle = () => {
    if (zoom > 1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2);
      setShowZoomSlider(true);
    }
  };

  // Download media file to local device
  const handleDownload = async () => {
    if (!current) return;
    try {
      const response = await fetch(current.attachment.url, { mode: 'cors' });
      if (!response.ok) throw new Error('Fetch failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download =
        current.attachment.fileName || `media_${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      const link = document.createElement('a');
      link.href = current.attachment.url;
      link.download = current.attachment.fileName ?? 'download';
      link.target = '_blank';
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const isGif = Boolean(
    current?.attachment.type === 'GIF' ||
    current?.attachment.mimeType?.includes('gif') ||
    current?.attachment.fileName?.toLowerCase().endsWith('.gif') ||
    current?.attachment.url?.toLowerCase().includes('.gif'),
  );
  const isRegularImage =
    !isVideo &&
    !isGif &&
    (current?.attachment.type === 'IMAGE' ||
      Boolean(
        current?.attachment.url &&
        !current?.attachment.url.startsWith('color:') &&
        !current?.attachment.url.startsWith('blob:video'),
      ));

  // Copy regular static image to clipboard
  const handleCopyImage = async () => {
    if (!isRegularImage || isCopying || !current) return;
    setIsCopying(true);
    try {
      let pngBlob: Blob | null = null;

      try {
        const response = await fetch(current.attachment.url, { mode: 'cors' });
        if (response.ok) {
          const fetchedBlob = await response.blob();
          if (fetchedBlob.type === 'image/png') {
            pngBlob = fetchedBlob;
          } else {
            pngBlob = await new Promise<Blob | null>((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                try {
                  const canvas = document.createElement('canvas');
                  canvas.width = img.naturalWidth || 800;
                  canvas.height = img.naturalHeight || 600;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return resolve(null);
                  ctx.drawImage(img, 0, 0);
                  canvas.toBlob((b) => resolve(b), 'image/png');
                } catch {
                  resolve(null);
                }
              };
              img.onerror = () => resolve(null);
              img.src = URL.createObjectURL(fetchedBlob);
            });
          }
        }
      } catch {
        // Fallback to Image loading below
      }

      if (!pngBlob) {
        pngBlob = await new Promise<Blob | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              if (!ctx) return resolve(null);
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((b) => resolve(b), 'image/png');
            } catch {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = current.attachment.url;
        });
      }

      if (pngBlob && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': pngBlob,
          }),
        ]);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(current.attachment.url);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(current.attachment.url);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        }
      } catch {}
    } finally {
      setIsCopying(false);
    }
  };

  if (!current) return null;

  const isClosing = animStage === 'closing';
  const isOwn = currentUserId ? current.message.sender.id === currentUserId : false;
  const senderDisplayName =
    current.message.sender.displayName || current.message.sender.username || 'User';

  // Compute FLIP transform from / to clicked message bubble
  const getFlipWrapperStyle = (): React.CSSProperties => {
    if (originRect) {
      const isAtOrigin = animStage === 'entering' || animStage === 'closing';
      if (isAtOrigin) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const ox = originRect.left + originRect.width / 2;
        const oy = originRect.top + originRect.height / 2;
        const dx = ox - cx;
        const dy = oy - cy;
        const scale = Math.min(
          Math.max(originRect.width / 520, 0.2),
          Math.max(originRect.height / 420, 0.2),
        );
        return {
          transform: `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`,
          borderRadius: '16px',
          opacity: isClosing ? 0.2 : 0.9,
          transition:
            'transform 240ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 240ms ease, opacity 200ms ease',
        };
      }
      return {
        transform: 'translate3d(0, 0, 0) scale(1)',
        borderRadius: '8px',
        opacity: 1,
        transition:
          'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 260ms ease, opacity 200ms ease',
      };
    }

    // Default pop transition if no origin rect provided
    return {
      transform: isClosing ? 'scale(0.92)' : 'scale(1)',
      opacity: isClosing ? 0 : 1,
      transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease',
    };
  };

  if (!current) return null;

  const content = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      data-lightbox-open="true"
      onMouseMove={handleContainerMouseMove}
      onMouseLeave={handleContainerMouseLeave}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      className={`fixed inset-0 z-[99990] flex flex-col bg-black/92 backdrop-blur-md select-none overflow-hidden transition-opacity duration-200 ${
        isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top Header Bar */}
      <div
        className={`flex items-center justify-between px-6 py-4 flex-shrink-0 z-30 transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Top-Left: Sender Avatar, Name & Timestamp */}
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            src={current.message.sender.avatar}
            name={senderDisplayName}
            size="sm"
            className="w-10 h-10 border border-white/10 shadow-sm"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-white text-sm leading-tight truncate">
              {senderDisplayName}
            </span>
            <span className="text-xs text-gray-400 leading-tight mt-0.5">
              {formatFullMessageDate(current.message.createdAt)}
            </span>
          </div>
        </div>

        {/* Top-Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 1. Delete */}
          {onDelete && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              title="Delete"
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <Trash2 size={18} />
            </button>
          )}

          {/* 2. Forward */}
          {onForward && (
            <button
              type="button"
              onClick={() => onForward(current.message)}
              title="Forward"
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <CornerUpRight size={18} />
            </button>
          )}

          {/* 2.5. Copy Image (smoothly appears between Forward and Download for regular static images) */}
          <div
            className={`transition-all duration-300 ease-out flex items-center justify-center overflow-hidden ${
              isRegularImage
                ? 'w-9 opacity-100 scale-100'
                : 'w-0 opacity-0 scale-75 pointer-events-none -mr-1.5 sm:-mr-2'
            }`}
          >
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={!isRegularImage || isCopying}
              title={isCopied ? 'Copied to clipboard' : 'Copy image'}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              {isCopied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
            </button>
          </div>

          {/* 3. Save / Download */}
          <button
            type="button"
            onClick={handleDownload}
            title="Download"
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
          >
            <Download size={18} />
          </button>

          {/* 4. Turn 90 degrees */}
          <button
            type="button"
            onClick={handleRotate}
            title="Turn 90°"
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
          >
            <RotateCw size={18} />
          </button>

          {/* 5. Zoom In / Zoom Out */}
          <button
            type="button"
            onClick={handleZoomToggle}
            title={zoom > 1 ? 'Zoom out' : 'Zoom in'}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
          >
            {zoom > 1 ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
          </button>

          {/* 6. Close (X) */}
          <button
            type="button"
            onClick={requestClose}
            title="Close"
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Viewport: No overflow-hidden clipping so image expands naturally across interface */}
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) requestClose();
        }}
        className="flex-1 flex items-center justify-center min-h-0 relative select-none"
      >
        {/* Previous Button */}
        {index > 0 && (
          <button
            type="button"
            onClick={() => onIndexChange(index - 1)}
            title="Previous"
            className="absolute left-4 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-white transition-all active:scale-90"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* FLIP Animated Media Wrapper: No overflow-hidden so zoom expands the image across the screen */}
        <div
          ref={mediaRef}
          style={getFlipWrapperStyle()}
          className="relative flex items-center justify-center pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            key={current.attachment.id || index}
            className={`flex items-center justify-center ${
              animStage === 'entered' && slideDirection === 'next'
                ? 'animate-lightboxSlideNext'
                : animStage === 'entered' && slideDirection === 'prev'
                  ? 'animate-lightboxSlidePrev'
                  : ''
            }`}
          >
            {isVideo ? (
              <video
                key={current.attachment.id || current.attachment.url}
                ref={videoRef}
                src={current.attachment.url}
                autoPlay
                playsInline
                controls={false}
                onError={() => setHasError(true)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (d && !isNaN(d) && isFinite(d)) setDuration(d);
                }}
                onProgress={updateBuffered}
                onPointerDown={(e) => {
                  if (zoom > 1) {
                    handlePointerDown(e);
                  }
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onDoubleClick={handleZoomToggle}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDragging && zoom === 1) {
                    togglePlay();
                  }
                }}
                style={{
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: isDragging
                    ? 'none'
                    : 'transform 260ms cubic-bezier(0.2, 0.9, 0.3, 1)',
                  cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                }}
                className="max-w-[85vw] max-h-[78vh] rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.7)] object-contain select-none"
              >
                <source
                  src={current.attachment.url}
                  type={current.attachment.mimeType || undefined}
                />
              </video>
            ) : hasError || current.attachment.url?.startsWith('color:') ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-white/5 border border-white/10 rounded-2xl max-w-sm">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                  <ImageOff size={28} className="text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-white">Image unavailable</p>
                <p className="text-xs text-gray-400 mt-1 max-w-[220px] truncate">
                  {current.attachment.fileName || 'Media file not found'}
                </p>
              </div>
            ) : (
              <img
                key={current.attachment.id}
                src={current.attachment.url}
                alt={current.attachment.fileName ?? 'media'}
                onError={() => setHasError(true)}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onDoubleClick={handleZoomToggle}
                draggable={false}
                style={{
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: isDragging
                    ? 'none'
                    : 'transform 260ms cubic-bezier(0.2, 0.9, 0.3, 1)',
                  cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                }}
                className="max-w-[85vw] max-h-[78vh] rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.7)] object-contain select-none"
              />
            )}
          </div>
        </div>

        {/* Next Button */}
        {index < items.length - 1 && (
          <button
            type="button"
            onClick={() => onIndexChange(index + 1)}
            title="Next"
            className="absolute right-4 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-white transition-all active:scale-90"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Telegram-style Bottom Video Control Bar */}
      {isVideo && (
        <div
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[92vw] max-w-[620px] transition-all duration-300 ease-out select-none ${
            areControlsVisible || !isPlaying || isScrubbing || isVolumeSliderOpen || isSpeedMenuOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2.5 sm:gap-3.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-[#0f1017]/85 backdrop-blur-2xl border border-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.85)]">
            {/* Play / Pause Toggle */}
            <button
              type="button"
              onClick={togglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
              className="p-1.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center cursor-pointer shrink-0"
            >
              {isPlaying ? (
                <Pause size={18} className="fill-current" />
              ) : (
                <Play size={18} className="fill-current ml-0.5" />
              )}
            </button>

            {/* Volume Button & Slide-Out Range (Spotify style) */}
            <div
              className="relative flex items-center shrink-0"
              onMouseEnter={handleVolumeMouseEnter}
              onMouseLeave={handleVolumeMouseLeave}
            >
              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
                className="p-1.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={18} className="text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 size={18} />
                ) : (
                  <Volume2 size={18} />
                )}
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ease-out flex items-center ${
                  isVolumeSliderOpen
                    ? 'w-20 sm:w-24 opacity-100 ml-1.5'
                    : 'w-0 opacity-0 pointer-events-none ml-0'
                }`}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#8774e1] hover:accent-[#9d8bf0] transition-all"
                />
              </div>
            </div>

            {/* Time Display (Current / Duration) */}
            <span className="text-[11.5px] font-mono text-white/80 whitespace-nowrap select-none shrink-0">
              {formatVideoTime(isScrubbing && scrubTime !== null ? scrubTime : currentTime)} /{' '}
              {formatVideoTime(duration)}
            </span>

            {/* Scrubber Progress Bar */}
            <div
              ref={scrubberRef}
              onPointerDown={handleScrubberPointerDown}
              className="relative flex-1 h-5 flex items-center cursor-pointer group/scrubber select-none touch-none min-w-[80px]"
            >
              {/* Background Track */}
              <div className="w-full h-1 group-hover/scrubber:h-1.5 bg-white/20 rounded-full overflow-hidden transition-all duration-150 relative">
                {/* Buffered Progress */}
                <div
                  className="h-full bg-white/25 rounded-full"
                  style={{ width: `${bufferedPercent}%` }}
                />
                {/* Active Played Progress (Telegram purple) */}
                <div
                  className="h-full bg-[#8774e1] rounded-full absolute top-0 left-0"
                  style={{
                    width: `${duration > 0 ? Math.min(100, Math.max(0, ((isScrubbing && scrubTime !== null ? scrubTime : currentTime) / duration) * 100)) : 0}%`,
                  }}
                />
              </div>

              {/* Scrubber Knob */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.6)] pointer-events-none transition-transform ${
                  isScrubbing ? 'scale-125' : 'scale-0 group-hover/scrubber:scale-100'
                }`}
                style={{
                  left: `${duration > 0 ? Math.min(100, Math.max(0, ((isScrubbing && scrubTime !== null ? scrubTime : currentTime) / duration) * 100)) : 0}%`,
                }}
              />
            </div>

            {/* Right 3 Action Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* 1. Speed Control Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSpeedMenuOpen((prev) => !prev)}
                  title="Playback Speed"
                  className={`px-1.5 py-0.5 rounded border text-[11px] font-bold transition-all active:scale-90 cursor-pointer ${
                    playbackRate !== 1
                      ? 'border-[#8774e1] text-[#a898f8] bg-[#8774e1]/15'
                      : 'border-white/25 text-white/90 hover:border-white/50 hover:bg-white/10'
                  }`}
                >
                  {playbackRate === 1 ? '1X' : `${playbackRate}X`}
                </button>

                {isSpeedMenuOpen && (
                  <div
                    className="absolute bottom-full mb-3 right-0 z-40 bg-[#161722]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl py-1.5 px-1 min-w-[125px] flex flex-col gap-0.5 animate-fadeIn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {[
                      { label: '0.5x', rate: 0.5 },
                      { label: 'Normal (1x)', rate: 1 },
                      { label: '1.5x', rate: 1.5 },
                      { label: '2x', rate: 2 },
                      { label: '3x', rate: 3 },
                    ].map(({ label, rate }) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => {
                          setPlaybackRate(rate);
                          if (videoRef.current) videoRef.current.playbackRate = rate;
                          setIsSpeedMenuOpen(false);
                        }}
                        className={`flex items-center justify-between w-full px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                          playbackRate === rate
                            ? 'bg-[#8774e1]/25 text-[#a898f8] font-bold'
                            : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span>{label}</span>
                        {playbackRate === rate && <Check size={13} className="text-[#a898f8]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Picture-in-Picture (PiP) */}
              <button
                type="button"
                onClick={handleTogglePiP}
                title={isPiP ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
                className="p-1.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center cursor-pointer"
              >
                <PictureInPicture2 size={18} />
              </button>

              {/* 3. Fullscreen Toggle */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                className="p-1.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center cursor-pointer"
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telegram-style Bottom Zoom Slider Pill */}
      {(showZoomSlider || zoom > 1) && (
        <div
          className={`absolute ${
            isVideo ? 'bottom-22 sm:bottom-24' : 'bottom-6'
          } left-1/2 -translate-x-1/2 z-30 flex items-center gap-3.5 px-4 py-2 rounded-full bg-[#181920]/80 backdrop-blur-2xl border border-white/10 text-white shadow-[0_12px_36px_rgba(0,0,0,0.75)] transition-all duration-200 ${
            isClosing ? 'opacity-0' : 'opacity-100 animate-fadeIn'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            title="Zoom out"
            onClick={() => {
              setZoom((prev) => {
                const next = Math.max(1, Math.round((prev - 0.25) * 100) / 100);
                if (next === 1) setPan({ x: 0, y: 0 });
                return next;
              });
            }}
            className="text-gray-300 hover:text-white transition-colors active:scale-90"
          >
            <ZoomOut size={16} />
          </button>

          <input
            type="range"
            min="1"
            max="3.5"
            step="0.05"
            value={zoom}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setZoom(val);
              if (val === 1) setPan({ x: 0, y: 0 });
            }}
            className="w-36 sm:w-56 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white hover:bg-white/30 transition-all"
          />

          <button
            type="button"
            title="Zoom in"
            onClick={() => {
              setZoom((prev) => Math.min(3.5, Math.round((prev + 0.25) * 100) / 100));
            }}
            className="text-gray-300 hover:text-white transition-colors active:scale-90"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal (opens directly inside / over lightbox) */}
      {isDeleteModalOpen && (
        <DeleteMessageModal
          isOwnMessage={isOwn}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={(forAll) => {
            onDelete?.(current.message.id, forAll);
            setIsDeleteModalOpen(false);
            requestClose();
          }}
        />
      )}
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}
