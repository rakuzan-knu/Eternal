import React, { useEffect, useRef } from 'react';
import { useCallStore } from '../../model/callStore';
import {
  WebGLVideoGridRenderer,
  type VideoStreamItem,
} from '../../lib/webrtc/webglVideoGridRenderer';
import { useAuthStore } from '@/shared/model/useAuthStore';

interface WebGLVideoGridProps {
  className?: string;
}

export function WebGLVideoGrid({ className = '' }: WebGLVideoGridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<WebGLVideoGridRenderer | null>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  const { localStream, remoteStreams, remoteParticipant, dominantSpeakerId, isVideoOff } =
    useCallStore();

  const currentUserId = useAuthStore((s) => s.userId) || 'me';

  // Helper to get or create invisible in-memory video element
  const getVideoElement = (userId: string, stream: MediaStream): HTMLVideoElement => {
    let video = videoElementsRef.current.get(userId);
    if (!video) {
      video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      videoElementsRef.current.set(userId, video);
    }
    if (video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
    return video;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new WebGLVideoGridRenderer(canvas);
    rendererRef.current = renderer;
    const videoElements = videoElementsRef.current;

    let animId: number;

    const renderLoop = () => {
      renderer.render();
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(entry.contentRect.width * dpr);
        canvas.height = Math.round(entry.contentRect.height * dpr);
      }
    });

    resizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.destroy();
      videoElements.forEach((v) => {
        v.srcObject = null;
        v.remove();
      });
      videoElements.clear();
    };
  }, []);

  // Update streams collection whenever call participants change
  useEffect(() => {
    if (!rendererRef.current) return;

    const items: VideoStreamItem[] = [];

    // Local stream
    if (localStream && !isVideoOff && localStream.getVideoTracks().length > 0) {
      items.push({
        userId: currentUserId,
        label: 'You',
        videoElement: getVideoElement(currentUserId, localStream),
        isDominant: dominantSpeakerId === currentUserId,
      });
    }

    // Remote streams
    for (const [userId, stream] of Object.entries(remoteStreams)) {
      if (stream.getVideoTracks().length > 0) {
        items.push({
          userId,
          label:
            userId === remoteParticipant?.id
              ? remoteParticipant.username
              : `User ${userId.slice(0, 4)}`,
          videoElement: getVideoElement(userId, stream),
          isDominant: dominantSpeakerId === userId,
        });
      }
    }

    rendererRef.current.setStreams(items);
  }, [localStream, remoteStreams, remoteParticipant, dominantSpeakerId, isVideoOff, currentUserId]);

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain rounded-2xl shadow-2xl bg-zinc-950"
      />
    </div>
  );
}
