import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useThemeStore, rehydrateWallpaperBlob } from '@/shared/model/useThemeStore';

export function GlobalThemeBackgroundLayer() {
  const location = useLocation();
  const themeMode = useThemeStore((s) => s.themeMode);
  const wallpaper = useThemeStore((s) => s.wallpaper);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const rehydrateAttemptsRef = useRef(0);

  const isReelsRoute = location.pathname.startsWith('/reels');
  const hasWallpaper = themeMode === 'wallpaper' && Boolean(wallpaper?.url);

  // Rehydrate wallpaper from IndexedDB on fresh reload
  useEffect(() => {
    if (!wallpaper?.url) {
      void rehydrateWallpaperBlob();
    }
  }, [wallpaper?.url]);

  // Video Lifecycle Management: pause on tab hidden, /reels, or when unmounted
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasWallpaper || wallpaper?.mediaType !== 'video') return;

    const release = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    const handleVisibilityChange = () => {
      if (document.hidden || isReelsRoute) {
        release();
      } else {
        if (video.getAttribute('src') !== wallpaper.url) {
          video.setAttribute('src', wallpaper.url!);
          video.load();
        }
        video.play().catch(() => {});
      }
    };

    handleVisibilityChange();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      release();
    };
  }, [hasWallpaper, isReelsRoute, wallpaper?.mediaType, wallpaper?.url]);

  const handleMediaError = useCallback(() => {
    if (rehydrateAttemptsRef.current < 2) {
      rehydrateAttemptsRef.current += 1;
      void rehydrateWallpaperBlob();
    }
  }, []);

  const handleMediaSuccess = useCallback(() => {
    setLoadedUrl(wallpaper?.url ?? null);
    rehydrateAttemptsRef.current = 0;
  }, [wallpaper?.url]);

  return (
    <>
      {/* 1. Hardware-Isolated Wallpaper Layer */}
      {hasWallpaper && wallpaper && wallpaper.url && (
        <div
          className="wallpaper-layer fixed inset-0 pointer-events-none z-0 overflow-hidden"
          style={{
            opacity: loadedUrl === wallpaper.url ? 1 : 0,
            transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            contain: 'strict',
          }}
        >
          {wallpaper.mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={isReelsRoute ? undefined : wallpaper.url}
              preload="none"
              loop
              muted
              playsInline
              onLoadedData={handleMediaSuccess}
              onError={(event) => {
                if (event.currentTarget.getAttribute('src')) handleMediaError();
              }}
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
