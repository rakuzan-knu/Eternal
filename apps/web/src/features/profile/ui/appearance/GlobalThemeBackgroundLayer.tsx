import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useThemeStore, rehydrateWallpaperBlob } from '@/shared/model/useThemeStore';

export function GlobalThemeBackgroundLayer() {
  const location = useLocation();
  const themeMode = useThemeStore((s) => s.themeMode);
  const wallpaper = useThemeStore((s) => s.wallpaper);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);
  const rehydrateAttemptsRef = useRef(0);

  const isReelsRoute = location.pathname.startsWith('/reels');

  // Rehydrate wallpaper from IndexedDB on fresh reload
  useEffect(() => {
    if (!wallpaper?.url) {
      void rehydrateWallpaperBlob();
    }
  }, [wallpaper?.url]);

  // Video Lifecycle Management: pause on tab hidden, /reels, or when unmounted
  useEffect(() => {
    const video = videoRef.current;
    if (!video || wallpaper?.mediaType !== 'video') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
      } else if (!isReelsRoute) {
        video.play().catch(() => {});
      }
    };

    if (isReelsRoute || document.hidden) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isReelsRoute, wallpaper?.mediaType]);

  const handleMediaError = useCallback(() => {
    if (rehydrateAttemptsRef.current < 2) {
      rehydrateAttemptsRef.current += 1;
      void rehydrateWallpaperBlob();
    }
  }, []);

  const handleMediaSuccess = useCallback(() => {
    setIsMediaLoaded(true);
    rehydrateAttemptsRef.current = 0;
  }, []);

  const hasWallpaper = themeMode === 'wallpaper' && Boolean(wallpaper?.url);

  return (
    <>
      {/* 1. Hardware-Isolated Wallpaper Layer */}
      {hasWallpaper && wallpaper && wallpaper.url && (
        <div
          className="wallpaper-layer fixed inset-0 pointer-events-none z-0 overflow-hidden"
          style={{
            opacity: isMediaLoaded ? 1 : 0,
            transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: 'translateZ(0)',
            willChange: 'transform, opacity',
            contain: 'strict',
          }}
        >
          {wallpaper.mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={wallpaper.url}
              autoPlay
              loop
              muted
              playsInline
              onLoadedData={handleMediaSuccess}
              onError={handleMediaError}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={wallpaper.url}
              alt="App Background"
              onLoad={handleMediaSuccess}
              onError={handleMediaError}
              className="w-full h-full object-cover"
              style={{
                filter: wallpaper.blur ? `blur(${wallpaper.blur}px)` : undefined,
                transform: wallpaper.blur ? 'scale(1.05)' : undefined,
              }}
            />
          )}

          {/* Dimming Overlay Layer */}
          <div
            className="absolute inset-0 bg-black"
            style={{
              opacity: wallpaper.dimming,
              transition: 'opacity 0.2s ease',
            }}
          />
        </div>
      )}
    </>
  );
}
