import React, { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  active?: boolean;
}

export function VideoPlayer({ src, poster, active = true }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSlider, setShowSlider] = useState(false);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const playbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;

    let visible = false;
    let disposed = false;
    let resumeAt = 0;
    let manuallyPaused = false;
    const release = () => {
      if (video.getAttribute('src')) resumeAt = video.currentTime;
      video.pause();
      video.srcObject = null;
      video.removeAttribute('src');
      video.load();
    };
    const eligible = () => active && visible && !document.hidden && !disposed;
    const play = () => {
      if (!eligible() || manuallyPaused) return;
      if (video.getAttribute('src') !== src) video.src = src;
      void Promise.resolve(video.play())
        .then(() => {
          if (!eligible() && (!disposed || !video.getAttribute('src'))) video.pause();
        })
        .catch(() => {});
    };
    const restorePosition = () => {
      if (eligible() && resumeAt > 0 && Number.isFinite(video.duration)) {
        video.currentTime = Math.min(resumeAt, video.duration);
      }
    };
    const onVisibility = () => {
      if (eligible()) play();
      else release();
    };
    playbackRef.current = () => {
      if (!eligible()) return;
      manuallyPaused = !video.paused;
      if (manuallyPaused) video.pause();
      else play();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        onVisibility();
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(el);
    video.addEventListener('loadedmetadata', restorePosition);
    document.addEventListener('visibilitychange', onVisibility);
    if (!active) release();
    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      video.removeEventListener('loadedmetadata', restorePosition);
      playbackRef.current = null;
      release();
    };
  }, [active, src]);

  useEffect(() => () => clearTimeout(hideTimeout.current), []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
      videoRef.current.volume = volume;
    }
  }, [muted, volume]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration || 1;
      setProgress((current / total) * 100);
      setDuration(total);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = Number(e.target.value);
    if (videoRef.current && duration) {
      videoRef.current.currentTime = (newProgress / 100) * duration;
      setProgress(newProgress);
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    playbackRef.current?.();
  };

  const handleMouseEnter = () => {
    clearTimeout(hideTimeout.current);
    setShowSlider(true);
  };
  const handleMouseLeave = () => {
    hideTimeout.current = setTimeout(() => setShowSlider(false), 300);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group select-none overflow-hidden"
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        poster={poster}
        muted={muted}
        loop
        playsInline
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Play/Pause center overlay when paused */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md p-3.5 rounded-full text-white">
            <Play size={24} className="fill-white translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Bottom Controls Bar (Scrubber timeline + Volume) */}
      <div
        className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-6 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar / Scrubber */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={handleSeek}
          className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:h-1.5 transition-all"
        />

        <div className="flex items-center justify-between mt-1">
          <button
            type="button"
            onClick={togglePlay}
            className="text-white hover:text-purple-400 p-1 transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="fill-white" />}
          </button>

          <div
            className="relative flex items-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className={`absolute bottom-full right-0 mb-2 bg-black/80 backdrop-blur-md rounded-2xl px-2 py-3 flex justify-center transition-all duration-200 origin-bottom ${
                showSlider
                  ? 'opacity-100 scale-100 translate-y-0'
                  : 'opacity-0 scale-90 translate-y-2 pointer-events-none'
              }`}
            >
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVolume(v);
                  setMuted(v === 0);
                }}
                style={
                  {
                    WebkitAppearance: 'slider-vertical',
                    writingMode: 'vertical-lr',
                    height: 70,
                    width: 4,
                  } as React.CSSProperties
                }
              />
            </div>

            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="bg-black/60 hover:bg-black/80 backdrop-blur-md p-1.5 rounded-full text-white transition-all cursor-pointer"
            >
              {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
