import React, { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

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
  const [showSlider, setShowSlider] = useState(false);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;

    if (!active) {
      video.pause();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
      videoRef.current.volume = volume;
    }
  }, [muted, volume]);

  const handleMouseEnter = () => {
    clearTimeout(hideTimeout.current);
    setShowSlider(true);
  };
  const handleMouseLeave = () => {
    hideTimeout.current = setTimeout(() => setShowSlider(false), 300);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={muted}
        loop
        playsInline
        autoPlay
        className="w-full h-full object-cover"
      />

      <div
        className="absolute bottom-3 right-3 flex flex-col items-center z-30"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className={`mb-2 bg-black/70 backdrop-blur-md rounded-full px-2 py-3 flex justify-center transition-all duration-200 origin-bottom ${
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
            className="volume-slider"
            style={
              {
                WebkitAppearance: 'slider-vertical',
                writingMode: 'vertical-lr',
                height: 80,
                width: 4,
              } as React.CSSProperties
            }
          />
        </div>

        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="bg-black/70 hover:bg-black/90 backdrop-blur-md p-2 rounded-full text-white transition-all cursor-pointer"
        >
          {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    </div>
  );
}
