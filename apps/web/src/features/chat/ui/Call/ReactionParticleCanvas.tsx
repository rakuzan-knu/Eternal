import React, { useEffect, useRef } from 'react';
import { ReactionParticleEngine } from '../../lib/webrtc/reactionParticleEngine';
import { useCallStore } from '../../model/callStore';
import { initOffscreenParticleBridge } from '../../lib/webrtc/offscreenParticleWorkerBridge';

interface ReactionParticleCanvasProps {
  engine: ReactionParticleEngine;
}

export function ReactionParticleCanvas({ engine }: ReactionParticleCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isTravelerModeEnabled = useCallStore((s) => s.isTravelerModeEnabled);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Dynamically create a canvas element to safely support transferControlToOffscreen()
    // and prevent DOMException on React StrictMode remounts.
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.className = 'pointer-events-none absolute inset-0 z-30 w-full h-full';
    container.appendChild(canvas);

    const rect = container.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    // Initialize Offscreen Worker Bridge
    const bridge = initOffscreenParticleBridge(
      canvas,
      engine,
      rect.width || 800,
      rect.height || 600,
      dpr,
    );

    bridge.setTravelerMode(isTravelerModeEnabled);

    // If running in Offscreen Web Worker, the worker manages 100% of rendering loop
    if (bridge.isOffscreen) {
      const unsubscribeSpawn = engine.setOnSpawn((emoji, w, h, ratio) => {
        bridge.spawn(emoji, w, h, ratio !== undefined ? ratio * w : undefined);
      });

      const handleResize = () => {
        const r = container.getBoundingClientRect();
        const currentDpr = window.devicePixelRatio || 1;
        bridge.resize(r.width, r.height, currentDpr);
      };

      window.addEventListener('resize', handleResize);

      return () => {
        unsubscribeSpawn();
        window.removeEventListener('resize', handleResize);
        bridge.destroy();
        canvas.remove();
      };
    }

    // Fallback: In-thread RAF rendering loop if OffscreenCanvas is unavailable
    let isRunning = true;
    let animFrame: number | null = null;
    let lastTime = performance.now();
    let containerWidth = 800;
    let containerHeight = 600;

    const resizeCanvas = () => {
      const r = container.getBoundingClientRect();
      containerWidth = r.width || 800;
      containerHeight = r.height || 600;
      const currentDpr = window.devicePixelRatio || 1;
      canvas.width = containerWidth * currentDpr;
      canvas.height = containerHeight * currentDpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(currentDpr, currentDpr);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const targetIntervalMs = isTravelerModeEnabled ? 66 : 16;
    let lastRenderTime = performance.now();

    const loop = (currentTime: number) => {
      if (!isRunning) return;

      const elapsed = currentTime - lastRenderTime;

      if (elapsed >= targetIntervalMs) {
        lastRenderTime = currentTime;
        const dtSeconds = Math.min(0.1, (currentTime - lastTime) / 1000);
        lastTime = currentTime;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, containerWidth, containerHeight);

          const hasActiveParticles = engine.update(dtSeconds);
          if (hasActiveParticles) {
            engine.render(ctx);
          }
        }
      }

      animFrame = requestAnimationFrame(loop);
    };

    lastTime = performance.now();
    animFrame = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      window.removeEventListener('resize', resizeCanvas);
      if (animFrame) {
        cancelAnimationFrame(animFrame);
      }
      bridge.destroy();
      canvas.remove();
    };
  }, [engine, isTravelerModeEnabled]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 w-full h-full overflow-hidden"
    />
  );
}
