import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { formatVideoTime } from '@/features/chat/lib/chatMediaUtils';

interface VideoTrimmerProps {
  duration: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  onSeek: (time: number) => void;
  videoSrc: string;
}

export default function VideoTrimmer({
  duration,
  currentTime,
  trimStart,
  trimEnd,
  onTrimChange,
  onSeek,
  videoSrc,
}: VideoTrimmerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [activeDrag, setActiveDrag] = useState<'left' | 'right' | 'scrub' | null>(null);

  // Generate thumbnail frames from the video
  useEffect(() => {
    if (!videoSrc || duration <= 0) return;
    let isCancelled = false;

    const generateFrames = async () => {
      try {
        const v = document.createElement('video');
        v.src = videoSrc;
        v.muted = true;
        v.playsInline = true;
        v.preload = 'auto';
        if (videoSrc.startsWith('http://') || videoSrc.startsWith('https://')) {
          v.crossOrigin = 'anonymous';
        }

        await new Promise<void>((resolve, reject) => {
          if (v.readyState >= 1) {
            resolve();
            return;
          }
          let timer: any;
          const onMeta = () => {
            clearTimeout(timer);
            resolve();
          };
          const onError = () => {
            clearTimeout(timer);
            reject(new Error('Video load error'));
          };
          timer = setTimeout(() => {
            v.removeEventListener('loadedmetadata', onMeta);
            v.removeEventListener('error', onError);
            resolve();
          }, 1500);

          v.addEventListener('loadedmetadata', onMeta, { once: true });
          v.addEventListener('error', onError, { once: true });
          if (
            typeof v.load === 'function' &&
            typeof window !== 'undefined' &&
            !window.navigator.userAgent?.includes('jsdom')
          ) {
            try {
              v.load();
            } catch {}
          }
        });

        if (isCancelled) return;

        const count = 10;
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 70;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const frames: string[] = [];
        const dur = v.duration && isFinite(v.duration) && v.duration > 0 ? v.duration : duration;
        const step = dur / count;

        for (let i = 0; i < count; i++) {
          if (isCancelled) return;
          const target = Math.min(dur - 0.05, Math.max(0, i * step + step / 2));
          v.currentTime = target;
          await new Promise<void>((r) => {
            let timer: any;
            const onSeeked = () => {
              clearTimeout(timer);
              v.removeEventListener('seeked', onSeeked);
              r();
            };
            timer = setTimeout(() => {
              v.removeEventListener('seeked', onSeeked);
              r();
            }, 350);
            v.addEventListener('seeked', onSeeked);
          });

          try {
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.6));
          } catch {
            // In case of drawing issue, continue
          }
        }

        if (!isCancelled && frames.length > 0) {
          setThumbnails(frames);
        }
      } catch {
        // Fallback: empty thumbnails will use smooth dark gradient filmstrip
      }
    };

    generateFrames();
    return () => {
      isCancelled = true;
    };
  }, [videoSrc, duration]);

  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      if (!containerRef.current || duration <= 0) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return pos * duration;
    },
    [duration],
  );

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    type: 'left' | 'right' | 'scrub',
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDrag(type);

    const onPointerMove = (ev: PointerEvent) => {
      const time = getTimeFromClientX(ev.clientX);
      if (type === 'left') {
        const nextStart = Math.min(Math.max(0, time), trimEnd - 0.5);
        onTrimChange(nextStart, trimEnd);
        onSeek(nextStart);
      } else if (type === 'right') {
        const nextEnd = Math.max(Math.min(duration, time), trimStart + 0.5);
        onTrimChange(trimStart, nextEnd);
        onSeek(nextEnd);
      } else if (type === 'scrub') {
        const seekTime = Math.min(trimEnd, Math.max(trimStart, time));
        onSeek(seekTime);
      }
    };

    const onPointerUp = () => {
      setActiveDrag(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const startPercent = duration > 0 ? (trimStart / duration) * 100 : 0;
  const endPercent = duration > 0 ? (trimEnd / duration) * 100 : 100;
  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const selectedDuration = Math.max(0, trimEnd - trimStart);

  return (
    <div className="flex flex-col items-center w-full max-w-xl select-none">
      {/* Duration Label */}
      <div className="flex items-center justify-between w-full px-2 mb-1.5 text-xs text-gray-300 font-medium">
        <span className="text-[#a898f8] font-bold">{formatVideoTime(selectedDuration)}</span>
        <span className="text-gray-400">
          {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
        </span>
      </div>

      {/* Filmstrip & Trimmer Container */}
      <div
        ref={containerRef}
        onClick={(e) => {
          const time = getTimeFromClientX(e.clientX);
          const seekTime = Math.min(trimEnd, Math.max(trimStart, time));
          onSeek(seekTime);
        }}
        className="relative w-full h-14 sm:h-16 rounded-xl overflow-hidden bg-black/60 border border-white/10 cursor-pointer shadow-inner"
      >
        {/* Thumbnails Filmstrip */}
        <div className="absolute inset-0 flex overflow-hidden opacity-90 pointer-events-none">
          {thumbnails.length > 0 ? (
            thumbnails.map((src, i) => (
              <img
                key={i}
                src={src}
                alt="thumb"
                className="h-full flex-1 object-cover border-r border-black/30 last:border-none"
              />
            ))
          ) : (
            <div className="w-full h-full bg-linear-to-r from-purple-900/30 via-slate-800/40 to-purple-900/30 flex items-center justify-around">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-px h-full bg-white/10" />
              ))}
            </div>
          )}
        </div>

        {/* Dimmed Overlays outside the active trim window */}
        <div
          className="absolute inset-y-0 left-0 bg-black/70 backdrop-blur-[1px] pointer-events-none transition-all duration-75"
          style={{ width: `${startPercent}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-black/70 backdrop-blur-[1px] pointer-events-none transition-all duration-75"
          style={{ width: `${100 - endPercent}%` }}
        />

        {/* Telegram Active Trim Box (White Border with rounded handles) */}
        <div
          className="absolute inset-y-0 border-y-2 border-white pointer-events-none transition-all duration-75 shadow-[0_0_12px_rgba(255,255,255,0.2)]"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`,
          }}
        >
          {/* Left Handle */}
          <div
            onPointerDown={(e) => handlePointerDown(e, 'left')}
            className={`absolute -left-3.5 inset-y-0 w-4 bg-white rounded-l-lg flex items-center justify-center cursor-ew-resize pointer-events-auto transition-transform ${
              activeDrag === 'left' ? 'scale-105 brightness-110 shadow-lg' : 'hover:brightness-110'
            }`}
            title="Drag to trim start"
          >
            {/* Grip Handle Lines */}
            <div className="flex flex-col gap-0.5">
              <div className="w-0.5 h-3 bg-gray-600 rounded-full" />
              <div className="w-0.5 h-3 bg-gray-600 rounded-full" />
            </div>

            {/* Small Cover Frame Badge above handle */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded bg-white text-gray-900 shadow text-[9px] font-bold flex items-center gap-0.5 pointer-events-none">
              <ImageIcon size={10} />
            </div>
          </div>

          {/* Right Handle */}
          <div
            onPointerDown={(e) => handlePointerDown(e, 'right')}
            className={`absolute -right-3.5 inset-y-0 w-4 bg-white rounded-r-lg flex items-center justify-center cursor-ew-resize pointer-events-auto transition-transform ${
              activeDrag === 'right' ? 'scale-105 brightness-110 shadow-lg' : 'hover:brightness-110'
            }`}
            title="Drag to trim end"
          >
            {/* Grip Handle Lines */}
            <div className="flex flex-col gap-0.5">
              <div className="w-0.5 h-3 bg-gray-600 rounded-full" />
              <div className="w-0.5 h-3 bg-gray-600 rounded-full" />
            </div>
          </div>
        </div>

        {/* Current Playhead Scrubber */}
        <div
          onPointerDown={(e) => handlePointerDown(e, 'scrub')}
          className="absolute inset-y-0 w-1 -translate-x-1/2 bg-white rounded-full shadow-[0_0_8px_rgba(0,0,0,0.8)] cursor-pointer pointer-events-auto z-10"
          style={{ left: `${currentPercent}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow" />
        </div>
      </div>
    </div>
  );
}
