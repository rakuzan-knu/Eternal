import { useState, useRef, useEffect } from 'react';
import { EyeOff, Play, VolumeX } from 'lucide-react';
import { AttachmentView } from '../../../entities/chat/model/types';
import SkeletonBone from '@/shared/ui/SkeletonBone';
import { isVideoAttachment, formatVideoTime } from '../lib/chatMediaUtils';

export function MediaAttachment({
  attachment,
  onOpenMedia,
}: {
  attachment: AttachmentView;
  onOpenMedia?: (attachment: AttachmentView, originRect?: DOMRect) => void;
}) {
  const [isLoaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement | HTMLAnchorElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isSpoilerAttachment = Boolean(
    attachment.isSpoiler ||
    attachment.fileName?.toLowerCase().includes('spoiler') ||
    attachment.url?.toLowerCase().includes('spoiler'),
  );
  const [isSpoilerRevealed, setSpoilerRevealed] = useState(!isSpoilerAttachment);

  const isVideo = isVideoAttachment(attachment);
  const [videoDuration, setVideoDuration] = useState(attachment.duration || 0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);

  const isGif = Boolean(
    attachment.type === 'GIF' ||
    attachment.fileName?.toLowerCase().endsWith('.gif') ||
    attachment.url?.toLowerCase().includes('.gif') ||
    attachment.mimeType?.includes('gif'),
  );

  const [isInView, setIsInView] = useState(true);
  const [isPausedByUser, setIsPausedByUser] = useState(false);
  const [posterFrame, setPosterFrame] = useState<string | null>(null);

  // IntersectionObserver: automatically halt decoders when out of viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Video playback pause when scrolled out of view
  useEffect(() => {
    if (isVideo && videoRef.current) {
      if (!isInView && !videoRef.current.paused) {
        videoRef.current.pause();
      } else if (isInView && videoRef.current.paused && isSpoilerRevealed) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isInView, isVideo, isSpoilerRevealed]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true);
    setHasError(false);
    if (isGif && !posterFrame) {
      try {
        const img = e.currentTarget;
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 300;
        canvas.height = img.naturalHeight || 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setPosterFrame(canvas.toDataURL('image/jpeg', 0.85));
        }
      } catch {
        // Cross-origin capture protection
      }
    }
  };

  const aspectRatio =
    attachment.width && attachment.height
      ? `${attachment.width} / ${attachment.height}`
      : isGif
        ? '16 / 9'
        : undefined;

  if (isVideo) {
    const remainingSec = Math.max(0, Math.ceil((videoDuration || 0) - videoCurrentTime));
    const countdownDisplay =
      videoDuration > 0
        ? formatVideoTime(remainingSec)
        : attachment.duration
          ? formatVideoTime(attachment.duration)
          : '0:00';

    return (
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        onClick={(e) => {
          if (!isSpoilerRevealed) {
            e.preventDefault();
            e.stopPropagation();
            setSpoilerRevealed(true);
            return;
          }
          if (onOpenMedia) {
            e.preventDefault();
            e.stopPropagation();
            const rect = containerRef.current?.getBoundingClientRect();
            onOpenMedia(attachment, rect);
          }
        }}
        className="relative block w-full min-w-[260px] sm:min-w-[320px] max-w-[440px] sm:max-w-[480px] min-h-[180px] max-h-[460px] overflow-hidden rounded-2xl bg-black group/video shadow-md cursor-pointer select-none"
        style={{ aspectRatio: aspectRatio || undefined, contain: 'layout paint' }}
      >
        {!isLoaded && <SkeletonBone className="absolute inset-0 rounded-2xl" />}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          preload="metadata"
          className={`h-full w-full object-cover transition-all duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${!isSpoilerRevealed ? 'filter blur-xl scale-105 pointer-events-none' : ''}`}
          src={attachment.url}
          onLoadedData={() => setLoaded(true)}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (d && !isNaN(d) && isFinite(d)) {
              setVideoDuration(d);
            }
          }}
          onTimeUpdate={(e) => {
            setVideoCurrentTime(e.currentTarget.currentTime);
          }}
        />

        {/* Telegram Glass Timer Badge Top-Left (Countdown + Muted speaker icon) */}
        {isSpoilerRevealed && (
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-medium tracking-wide shadow-md pointer-events-none select-none transition-opacity duration-200">
            <span>{countdownDisplay}</span>
            <VolumeX size={12} className="text-white/80 shrink-0" />
          </div>
        )}

        {!isSpoilerRevealed && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSpoilerRevealed(true);
            }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0e0f18]/95 border border-white/10 cursor-pointer hover:bg-[#141522] transition-all select-none group/spoiler w-full h-full"
            title="Click to reveal spoiler"
          >
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#181926]/95 border border-white/20 text-white text-xs font-semibold shadow-2xl group-hover/spoiler:scale-105 group-hover/spoiler:border-purple-400/50 group-hover/spoiler:text-purple-200 transition-all">
              <EyeOff size={14} className="text-purple-400" />
              <span>Spoiler</span>
            </div>
            <span className="text-[10px] text-gray-400 mt-1 opacity-0 group-hover/spoiler:opacity-100 transition-opacity">
              Click to view
            </span>
          </button>
        )}
      </div>
    );
  }

  const isGifPlaying = isGif && isInView && !isPausedByUser;

  return (
    <a
      ref={containerRef as React.RefObject<HTMLAnchorElement>}
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => {
        if (!isSpoilerRevealed) {
          e.preventDefault();
          e.stopPropagation();
          setSpoilerRevealed(true);
          return;
        }
        if (onOpenMedia) {
          e.preventDefault();
          e.stopPropagation();
          const rect = containerRef.current?.getBoundingClientRect();
          onOpenMedia(attachment, rect);
        }
      }}
      className="relative block w-full min-w-[260px] sm:min-w-[320px] max-w-[440px] sm:max-w-[480px] min-h-[180px] max-h-[460px] overflow-hidden rounded-2xl group/img bg-black/40 shadow-md cursor-pointer"
      style={{ aspectRatio: aspectRatio || undefined, contain: 'layout paint' }}
    >
      {!isLoaded && !hasError && <SkeletonBone className="absolute inset-0 rounded-2xl" />}

      {/* When GIF is scrolled offscreen or paused by user, freeze decoder by swapping with static poster frame */}
      {isGif && !isGifPlaying && posterFrame ? (
        <img
          src={posterFrame}
          alt={attachment.fileName ?? 'attachment'}
          className={`h-full w-full object-cover transition-opacity duration-300 hover:opacity-95 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${!isSpoilerRevealed ? 'filter blur-xl scale-105' : ''}`}
        />
      ) : (
        <img
          src={attachment.url}
          alt={attachment.fileName ?? 'attachment'}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-opacity duration-300 hover:opacity-95 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${!isSpoilerRevealed ? 'filter blur-xl scale-105' : ''}`}
          onLoad={handleImageLoad}
          onError={() => setHasError(true)}
        />
      )}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white/80 p-4 text-center z-10">
          <p className="text-xs font-medium mb-2 text-gray-300">Failed to load media</p>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setHasError(false);
            }}
            className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* GIF playback pill badge */}
      {isGif && isSpoilerRevealed && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsPausedByUser((prev) => !prev);
          }}
          className="absolute bottom-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/75 hover:bg-black/90 text-white text-[10px] font-bold tracking-wider select-none border border-white/10 shadow-md transition-all active:scale-95 cursor-pointer"
          title={isGifPlaying ? 'Click to pause GIF' : 'Click to play GIF'}
        >
          {!isGifPlaying && <Play size={9} className="fill-white" />}
          <span>GIF</span>
        </button>
      )}

      {!isSpoilerRevealed && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0e0f18]/95 border border-white/10 cursor-pointer hover:bg-[#141522] transition-all select-none group/spoiler"
          title="Click to reveal spoiler"
        >
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#181926]/95 border border-white/20 text-white text-xs font-semibold shadow-2xl group-hover/spoiler:scale-105 group-hover/spoiler:border-purple-400/50 group-hover/spoiler:text-purple-200 transition-all">
            <EyeOff size={14} className="text-purple-400" />
            <span>Spoiler</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 opacity-0 group-hover/spoiler:opacity-100 transition-opacity">
            Click to view
          </span>
        </div>
      )}
    </a>
  );
}

export function AudioAttachment({ attachment }: { attachment: AttachmentView }) {
  const [isLoaded, setLoaded] = useState(false);

  return (
    <div className="relative max-w-[280px]">
      {!isLoaded && <SkeletonBone className="absolute inset-0 h-10 rounded-full" />}
      <audio
        controls
        preload="metadata"
        className={`max-w-[280px] transition-opacity duration-150 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        src={attachment.url}
        onLoadedMetadata={() => setLoaded(true)}
      />
    </div>
  );
}
