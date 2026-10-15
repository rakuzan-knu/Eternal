import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReelVideoLease, ReelVideoPool } from './reelVideoPool';

interface PlayerOptions {
  pool: ReelVideoPool;
  reelId: string;
  src: string;
  hlsUrl?: string | null;
  poster?: string | null;
  isActive: boolean;
  isMuted: boolean;
  volume: number;
  playbackRate: number;
  onPlayed?: () => void;
}

export function usePooledReelVideo({
  pool,
  reelId,
  src,
  hlsUrl,
  poster,
  isActive,
  isMuted,
  volume,
  playbackRate,
  onPlayed,
}: PlayerOptions) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const leaseRef = useRef<ReelVideoLease | null>(null);
  const playAttempt = useRef(0);
  const manuallyPaused = useRef(false);
  const mayAutoplay = useRef(false);
  const playedCallback = useRef(onPlayed);
  const [lease, setLease] = useState<ReelVideoLease | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useLayoutEffect(() => {
    playedCallback.current = onPlayed;
  }, [onPlayed]);
  useLayoutEffect(() => {
    manuallyPaused.current = false;
  }, [reelId]);
  useLayoutEffect(() => {
    mayAutoplay.current = isActive && isVisible && pageVisible;
    if (!isActive) manuallyPaused.current = false;
  }, [isActive, isVisible, pageVisible]);

  const release = useCallback(() => {
    const current = leaseRef.current;
    leaseRef.current = null;
    videoRef.current = null;
    playAttempt.current += 1;
    current?.release();
    setLease(null);
    setIsPlaying(false);
    setIsLoaded(false);
    setHasError(false);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.5);
        // Tear down synchronously, before React renders or a pending play can resolve.
        if (!visible) release();
        setIsVisible(visible);
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(host);
    const visibilityChanged = () => {
      if (document.hidden) release();
      setPageVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [release]);

  useLayoutEffect(() => {
    if (!isVisible || !pageVisible || document.hidden || !hostRef.current) return;
    const acquired = pool.acquire(hostRef.current);
    if (!acquired) return;
    leaseRef.current = acquired;
    videoRef.current = acquired.video;
    acquired.video.className =
      'absolute inset-0 w-full h-full object-cover z-0 transition-all duration-300';
    if (poster) acquired.video.poster = poster;
    void acquired.setSource(src, hlsUrl);
    setIsLoaded(false);
    setHasError(false);
    setLease(acquired);
    return () => {
      if (leaseRef.current === acquired) {
        leaseRef.current = null;
        videoRef.current = null;
        playAttempt.current += 1;
      }
      acquired.release();
    };
  }, [pool, reelId, src, hlsUrl, poster, isVisible, pageVisible]);

  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video || !lease?.isCurrent()) return;
    video.muted = isMuted;
    video.volume = isMuted ? 0 : Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 1));
    video.playbackRate = playbackRate;
  }, [lease, isMuted, volume, playbackRate]);

  const startPlayback = useCallback(async (current: ReelVideoLease) => {
    const attempt = ++playAttempt.current;
    const playing = await current.play();
    if (
      attempt !== playAttempt.current ||
      leaseRef.current !== current ||
      !current.isCurrent() ||
      !mayAutoplay.current
    )
      return false;
    setIsPlaying(playing);
    if (playing) playedCallback.current?.();
    return playing;
  }, []);

  useLayoutEffect(() => {
    if (!lease?.isCurrent()) return;
    const video = lease.video;
    const current = () => leaseRef.current === lease && lease.isCurrent();
    const playing = () => {
      if (current() && mayAutoplay.current && !manuallyPaused.current && !document.hidden)
        setIsPlaying(true);
    };
    const paused = () => {
      if (current() && video.paused) setIsPlaying(false);
    };
    const loaded = () => {
      if (!current()) return;
      setIsLoaded(true);
      setHasError(false);
    };
    const canPlay = () => {
      loaded();
      if (current() && mayAutoplay.current && !manuallyPaused.current && video.paused)
        void startPlayback(lease);
    };
    const failed = () => {
      if (current()) setHasError(true);
    };
    video.addEventListener('play', playing);
    video.addEventListener('pause', paused);
    video.addEventListener('loadeddata', loaded);
    video.addEventListener('canplay', canPlay);
    video.addEventListener('error', failed);
    return () => {
      video.removeEventListener('play', playing);
      video.removeEventListener('pause', paused);
      video.removeEventListener('loadeddata', loaded);
      video.removeEventListener('canplay', canPlay);
      video.removeEventListener('error', failed);
    };
  }, [lease, startPlayback]);

  useLayoutEffect(() => {
    if (!lease?.isCurrent()) return;
    if (isActive && !manuallyPaused.current) void startPlayback(lease);
    else {
      playAttempt.current += 1;
      lease.pause();
      setIsPlaying(false);
    }
  }, [isActive, lease, startPlayback]);

  const play = useCallback(() => {
    const current = leaseRef.current;
    if (!current || !mayAutoplay.current || document.hidden) return Promise.resolve(false);
    manuallyPaused.current = false;
    return startPlayback(current);
  }, [startPlayback]);

  const pause = useCallback(() => {
    manuallyPaused.current = true;
    playAttempt.current += 1;
    leaseRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const retry = useCallback(async () => {
    const current = leaseRef.current;
    if (!current || !mayAutoplay.current || document.hidden) return false;
    setHasError(false);
    setIsLoaded(false);
    await current.setSource(src, hlsUrl);
    if (leaseRef.current !== current || !current.isCurrent()) return false;
    return play();
  }, [src, hlsUrl, play]);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (video && Number.isFinite(time)) video.currentTime = Math.max(0, time);
  }, []);

  // These subscriptions remount for each lease so they bind only to its physical node.
  return {
    hostRef,
    videoRef,
    videoKey: lease?.id,
    hasVideo: lease !== null && isVisible && pageVisible,
    isPlaying,
    isLoaded,
    hasError,
    play,
    pause,
    retry,
    seek,
  };
}
