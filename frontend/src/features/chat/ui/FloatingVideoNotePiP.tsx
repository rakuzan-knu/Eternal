import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, X, Maximize2, Trash2 } from 'lucide-react';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';
import { useNavigate, useLocation } from 'react-router-dom';

function formatTimer(sec: number): string {
  if (isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function FloatingVideoNotePiP() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    activeMediaId,
    mediaType,
    url,
    senderName,
    currentTime,
    duration,
    isPlaying,
    isMuted,
    conversationId,
    currentViewingChatId,
    togglePlay,
    toggleMute,
    stopAll,
  } = useActiveMediaPlaybackStore();

  const [isEnlarged, setIsEnlarged] = useState(false);
  const size = isEnlarged ? 192 : 128;

  // Position state (default: bottom right)
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: typeof window !== 'undefined' ? window.innerWidth - 144 : 300,
    y: typeof window !== 'undefined' ? window.innerHeight - 180 : 500,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isHoveredOverTrash, setIsHoveredOverTrash] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number; time: number }>({
    x: 0,
    y: 0,
    posX: 0,
    posY: 0,
    time: 0,
  });

  const lastPosRef = useRef<{ y: number; time: number }>({ y: 0, time: 0 });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Keyboard avoidance on mobile (using visualViewport)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;

      const keyboardHeight = window.innerHeight - vv.height;
      if (keyboardHeight > 100) {
        // Keyboard open -> move PiP above keyboard
        setPosition((prev) => ({
          ...prev,
          y: Math.min(prev.y, vv.height - size - 16),
        }));
      }
    };

    window.visualViewport.addEventListener('resize', handleViewportResize);
    return () => window.visualViewport?.removeEventListener('resize', handleViewportResize);
  }, [size]);

  // Determine visibility: active video note, and user is outside the current chat thread
  const isInCurrentChat =
    (location.pathname.startsWith('/chat') || location.pathname.startsWith('/messages')) &&
    Boolean(conversationId && currentViewingChatId === conversationId);

  const shouldShow = Boolean(
    activeMediaId && mediaType === 'video' && !isInCurrentChat && !isDismissing,
  );

  // Sync video element with store
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying, url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
  }, [isMuted]);

  // Drag Gesture Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
      time: Date.now(),
    };
    lastPosRef.current = { y: e.clientY, time: Date.now() };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const newX = dragStartRef.current.posX + deltaX;
    const newY = dragStartRef.current.posY + deltaY;

    // Viewport clamping
    const clampedX = Math.max(16, Math.min(window.innerWidth - size - 16, newX));
    const clampedY = Math.max(16, Math.min(window.innerHeight - size - 16, newY));

    setPosition({ x: clampedX, y: clampedY });

    // Track trash hover target (bottom center of screen)
    const isNearTrash =
      e.clientY > window.innerHeight - 100 && Math.abs(e.clientX - window.innerWidth / 2) < 90;
    setIsHoveredOverTrash(isNearTrash);

    lastPosRef.current = { y: e.clientY, time: Date.now() };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    const totalDeltaTime = Date.now() - lastPosRef.current.time;
    const lastDeltaY = e.clientY - lastPosRef.current.y;
    const velocityY = totalDeltaTime > 0 ? lastDeltaY / totalDeltaTime : 0;

    // Fling to Dismiss: quick downward swipe (vy > 0.8) or dropped onto trash can
    if (isHoveredOverTrash || velocityY > 0.8 || e.clientY > window.innerHeight - 90) {
      setIsDismissing(true);
      setTimeout(() => {
        stopAll();
        setIsDismissing(false);
        setIsHoveredOverTrash(false);
      }, 250);
      return;
    }

    // Magnetic Corner Snapping: calculate distance to 4 corners
    const margin = 20;
    const corners = [
      { x: margin, y: margin }, // top-left
      { x: window.innerWidth - size - margin, y: margin }, // top-right
      { x: margin, y: window.innerHeight - size - margin }, // bottom-left
      { x: window.innerWidth - size - margin, y: window.innerHeight - size - margin }, // bottom-right
    ];

    let closestCorner = corners[3];
    let minDistance = Infinity;

    corners.forEach((corner) => {
      const dist = Math.hypot(corner.x - position.x, corner.y - position.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestCorner = corner;
      }
    });

    setPosition(closestCorner);
    setIsHoveredOverTrash(false);
  };

  // Double Click / Double Tap Gesture: toggle size
  const lastTapRef = useRef<number>(0);
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap!
      setIsEnlarged((prev) => !prev);
    }
    lastTapRef.current = now;
  };

  // Expand / Return to chat
  const handleReturnToChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (conversationId) {
      navigate(`/chat?conversationId=${conversationId}`);
    } else {
      navigate('/chat');
    }
  };

  if (!shouldShow) return null;

  const strokeWidth = 3;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressFraction = duration > 0 ? currentTime / duration : 0;
  const strokeDashoffset = circumference * (1 - progressFraction);

  return (
    <>
      {/* Animated Trash Target at Bottom Center during Drag */}
      {isDragging && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[390] pointer-events-none animate-fadeIn flex flex-col items-center gap-1">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-200 ${
              isHoveredOverTrash
                ? 'bg-red-500/40 border-red-400 scale-125 shadow-[0_0_25px_rgba(239,68,68,0.7)] text-white'
                : 'bg-black/70 border-white/20 scale-100 text-gray-300 backdrop-blur-md'
            }`}
          >
            <Trash2 size={22} className={isHoveredOverTrash ? 'animate-bounce' : ''} />
          </div>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            Fling down to dismiss
          </span>
        </div>
      )}

      {/* Floating Magnetic PiP Circle */}
      <div
        data-testid="floating-video-pip"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleTap}
        style={{
          width: size,
          height: size,
          transform: `translate3d(${position.x}px, ${position.y}px, 0px)${
            isDismissing ? ' scale(0) translate3d(0, 100px, 0)' : ''
          }`,
          transition: isDragging ? 'none' : 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        className={`fixed top-0 left-0 z-[400] rounded-full overflow-hidden border-2 border-purple-500/50 bg-black shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(168,85,247,0.35)] cursor-grab active:cursor-grabbing select-none group touch-none backdrop-blur-xl ${
          isDismissing ? 'opacity-0' : 'opacity-100'
        }`}
        title="Drag to reposition, Double-tap to resize"
      >
        <video
          ref={videoRef}
          src={url ?? undefined}
          playsInline
          loop
          muted={isMuted}
          className="w-full h-full object-cover pointer-events-none"
        />

        {/* Radial Progress Ring */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#a855f7"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-150"
          />
        </svg>

        {/* Hover Overlay Controls */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
          {/* Top Bar: Expand & Close */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleReturnToChat}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition active:scale-90"
              title="Return to chat"
            >
              <Maximize2 size={11} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                stopAll();
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-500/80 transition active:scale-90"
              title="Close PiP"
            >
              <X size={12} />
            </button>
          </div>

          {/* Center: Play/Pause */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-600/90 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] active:scale-90 transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5 fill-white" />}
            </button>
          </div>

          {/* Bottom: Mute & Timer */}
          <div className="flex items-center justify-between text-[10px] font-mono text-white">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="w-5 h-5 flex items-center justify-center rounded-full bg-black/60 text-white"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX size={10} className="text-red-400" />
              ) : (
                <Volume2 size={10} className="text-purple-300" />
              )}
            </button>
            <span className="bg-black/60 px-1.5 py-0.5 rounded-full font-bold">
              {formatTimer(currentTime)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
