import React, { useRef, useEffect, useCallback } from 'react';
import { useActiveMediaPlaybackStore } from '../../../shared/model/useActiveMediaPlaybackStore';

interface ProceduralChatBackgroundProps {
  shaderId?: string; // 'neon-smoke' | 'cosmic-aurora' | 'synthwave-grid' | 'starlight-drift' | 'cyber-matrix'
  audioReactive?: boolean;
  parallax3d?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export default function ProceduralChatBackground({
  shaderId = 'neon-smoke',
  audioReactive = true,
  parallax3d = true,
  className = '',
  style,
}: ProceduralChatBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Audio Playback Store Integration
  const isAudioPlaying = useActiveMediaPlaybackStore((s) => s.isPlaying);
  const audioVolume = useActiveMediaPlaybackStore((s) => s.volume);

  // Mouse & Gyro Coordinates with smooth lerp
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
  const tiltRef = useRef({ gamma: 0, beta: 0, targetGamma: 0, targetBeta: 0 });

  // Handle Mouse / Touch Move
  const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
    const clientY = 'touches' in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;

    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / (rect.width || 1)));
    const normY = Math.max(0, Math.min(1, (clientY - rect.top) / (rect.height || 1)));

    mouseRef.current.targetX = normX;
    mouseRef.current.targetY = normY;
  }, []);

  // Handle Mobile Device Orientation (3D Gyro Parallax)
  useEffect(() => {
    if (!parallax3d || typeof window === 'undefined') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        // Clamp gamma (-30 to +30) and beta (-30 to +30)
        tiltRef.current.targetGamma = Math.max(-30, Math.min(30, e.gamma));
        tiltRef.current.targetBeta = Math.max(-30, Math.min(30, e.beta - 45)); // assume holding phone at 45 deg
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [parallax3d]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    let isVisible = true;

    // Resize canvas with devicePixelRatio
    const handleResize = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const newWidth = Math.floor((rect.width || 400) * dpr);
      const newHeight = Math.floor((rect.height || 600) * dpr);
      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Dynamic resize observer for sidebar / panel collapse & expand transitions
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(containerRef.current);
    }

    // Track visibility to maintain 0% CPU when tab or chat is hidden
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    if (containerRef.current) observer.observe(containerRef.current);

    // Initialize particles for starlight / aurora shaders
    const particles: Particle[] = [];
    const particleColors = ['#9333ea', '#38bdf8', '#818cf8', '#c084fc', '#ffffff'];
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        z: Math.random() * 0.8 + 0.2,
        vx: (Math.random() - 0.5) * 0.0006,
        vy: (Math.random() - 0.5) * 0.0006,
        size: Math.random() * 2 + 1,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        alpha: Math.random() * 0.7 + 0.3,
      });
    }

    // Animation Loop
    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const width = canvas.width;
      const height = canvas.height;

      // Smooth mouse and tilt interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;
      tiltRef.current.gamma += (tiltRef.current.targetGamma - tiltRef.current.gamma) * 0.08;
      tiltRef.current.beta += (tiltRef.current.targetBeta - tiltRef.current.beta) * 0.08;

      // Audio beat intensity multiplier
      const audioIntensity =
        audioReactive && isAudioPlaying ? 1 + audioVolume * 0.45 * Math.sin(time * 8) : 1;
      const speedMultiplier = audioReactive && isAudioPlaying ? 1.6 : 1.0;
      time += 0.012 * speedMultiplier;

      // Parallax pixel offsets
      const parallaxX = (tiltRef.current.gamma / 30) * 16 + (mouseRef.current.x - 0.5) * 14;
      const parallaxY = (tiltRef.current.beta / 30) * 16 + (mouseRef.current.y - 0.5) * 14;

      ctx.save();
      ctx.translate(parallaxX, parallaxY);

      // ----------------------------------------------------
      // 1. Shader: Liquid Neon Smoke (Шейдер жидкого неонового дыма)
      // ----------------------------------------------------
      if (shaderId === 'neon-smoke') {
        // Deep background gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#0a0416');
        bgGrad.addColorStop(0.5, '#0e0824');
        bgGrad.addColorStop(1, '#05020c');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(-20, -20, width + 40, height + 40);

        // Fluid smoke plasma blobs
        const cx = width * mouseRef.current.x;
        const cy = height * mouseRef.current.y;

        // Wave 1: Ultraviolet Swirl
        const r1 = Math.min(width, height) * (0.55 + 0.08 * Math.sin(time * 1.5)) * audioIntensity;
        const x1 = width * 0.4 + Math.sin(time * 0.9) * width * 0.2;
        const y1 = height * 0.4 + Math.cos(time * 0.7) * height * 0.2;
        const grad1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, r1);
        grad1.addColorStop(0, 'rgba(147, 51, 234, 0.45)');
        grad1.addColorStop(0.6, 'rgba(99, 102, 241, 0.2)');
        grad1.addColorStop(1, 'rgba(147, 51, 234, 0)');
        ctx.fillStyle = grad1;
        ctx.beginPath();
        ctx.arc(x1, y1, r1, 0, Math.PI * 2);
        ctx.fill();

        // Wave 2: Cyan Ambient Fluid
        const r2 = Math.min(width, height) * (0.5 + 0.07 * Math.cos(time * 1.8)) * audioIntensity;
        const x2 = width * 0.65 + Math.cos(time * 1.1) * width * 0.18;
        const y2 = height * 0.65 + Math.sin(time * 1.3) * height * 0.18;
        const grad2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
        grad2.addColorStop(0, 'rgba(6, 182, 212, 0.38)');
        grad2.addColorStop(0.55, 'rgba(59, 130, 246, 0.18)');
        grad2.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = grad2;
        ctx.beginPath();
        ctx.arc(x2, y2, r2, 0, Math.PI * 2);
        ctx.fill();

        // Interactive Cursor Radiant Glow
        const cursorRadius = Math.min(width, height) * 0.35 * audioIntensity;
        const cursorGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cursorRadius);
        cursorGrad.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
        cursorGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.12)');
        cursorGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = cursorGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, cursorRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // ----------------------------------------------------
      // 2. Shader: Cosmic Aurora Borealis (Северное сияние)
      // ----------------------------------------------------
      else if (shaderId === 'cosmic-aurora') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#020617');
        bgGrad.addColorStop(0.6, '#061713');
        bgGrad.addColorStop(1, '#020617');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(-20, -20, width + 40, height + 40);

        // Aurora Ribbons
        const ribbonCount = 3;
        for (let r = 0; r < ribbonCount; r++) {
          ctx.beginPath();
          const baseHeight = height * (0.25 + r * 0.18);
          ctx.moveTo(-20, baseHeight);

          for (let x = -20; x <= width + 20; x += 15) {
            const wave1 = Math.sin(x * 0.004 + time * 1.2 + r) * 45;
            const wave2 = Math.cos(x * 0.008 - time * 0.8 + r * 2) * 25;
            const y = baseHeight + (wave1 + wave2) * audioIntensity;
            ctx.lineTo(x, y);
          }

          ctx.lineTo(width + 20, height + 20);
          ctx.lineTo(-20, height + 20);
          ctx.closePath();

          const ribbonGrad = ctx.createLinearGradient(0, baseHeight - 40, 0, baseHeight + 160);
          if (r === 0) {
            ribbonGrad.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
            ribbonGrad.addColorStop(0.5, 'rgba(52, 211, 153, 0.15)');
            ribbonGrad.addColorStop(1, 'transparent');
          } else if (r === 1) {
            ribbonGrad.addColorStop(0, 'rgba(139, 92, 246, 0.28)');
            ribbonGrad.addColorStop(0.6, 'rgba(99, 102, 241, 0.12)');
            ribbonGrad.addColorStop(1, 'transparent');
          } else {
            ribbonGrad.addColorStop(0, 'rgba(236, 72, 153, 0.22)');
            ribbonGrad.addColorStop(0.7, 'rgba(16, 185, 129, 0.08)');
            ribbonGrad.addColorStop(1, 'transparent');
          }
          ctx.fillStyle = ribbonGrad;
          ctx.fill();
        }

        // Starfield Particles
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = 1;
          if (p.x > 1) p.x = 0;
          if (p.y < 0) p.y = 1;
          if (p.y > 1) p.y = 0;

          const px = p.x * width;
          const py = p.y * height;
          const twinkle = Math.sin(time * 3 + p.z * 10) * 0.3 + 0.7;

          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * twinkle})`;
          ctx.beginPath();
          ctx.arc(px, py, p.size * p.z, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ----------------------------------------------------
      // 3. Shader: Retro Synthwave Grid (Сетка Synthwave)
      // ----------------------------------------------------
      else if (shaderId === 'synthwave-grid') {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.6);
        skyGrad.addColorStop(0, '#0f051d');
        skyGrad.addColorStop(0.5, '#28063b');
        skyGrad.addColorStop(1, '#831843');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(-20, -20, width + 40, height * 0.6 + 20);

        // Glowing Synthwave Sun
        const horizonY = height * 0.55;
        const sunRadius = Math.min(width, height) * 0.22 * audioIntensity;
        const sunGrad = ctx.createLinearGradient(0, horizonY - sunRadius * 1.5, 0, horizonY);
        sunGrad.addColorStop(0, '#fde047');
        sunGrad.addColorStop(0.5, '#f43f5e');
        sunGrad.addColorStop(1, '#9333ea');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(width * 0.5, horizonY - sunRadius * 0.3, sunRadius, 0, Math.PI * 2);
        ctx.fill();

        // Horizontal Blinds lines across sun
        ctx.fillStyle = '#0f051d';
        for (let s = 0; s < 6; s++) {
          const sy = horizonY - sunRadius * 0.8 + s * 14;
          ctx.fillRect(width * 0.5 - sunRadius, sy, sunRadius * 2, 2.5 + s * 0.8);
        }

        // Perspective Floor Grid
        const floorGrad = ctx.createLinearGradient(0, horizonY, 0, height);
        floorGrad.addColorStop(0, '#090312');
        floorGrad.addColorStop(1, '#1e0533');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(-20, horizonY, width + 40, height - horizonY + 40);

        // Grid Horizontal Lines
        const gridSpeed = (time * 60) % 35;
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
        ctx.lineWidth = 1.2;

        for (let i = 0; i < 14; i++) {
          const progress = Math.pow((i + gridSpeed / 35) / 14, 2.2);
          const y = horizonY + progress * (height - horizonY);
          ctx.beginPath();
          ctx.moveTo(-20, y);
          ctx.lineTo(width + 20, y);
          ctx.stroke();
        }

        // Perspective Vertical Vanishing Lines
        const vCount = 18;
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
        for (let v = 0; v <= vCount; v++) {
          const topX = width * 0.5;
          const bottomX = (v / vCount - 0.5) * width * 2.8 + width * 0.5;
          ctx.beginPath();
          ctx.moveTo(topX, horizonY);
          ctx.lineTo(bottomX, height + 20);
          ctx.stroke();
        }
      }

      // ----------------------------------------------------
      // 4. Shader: Starlight Hyperspace Drift (Звездный дрейф)
      // ----------------------------------------------------
      else if (shaderId === 'starlight-drift') {
        ctx.fillStyle = '#020617';
        ctx.fillRect(-20, -20, width + 40, height + 40);

        // Central Nebula Glow
        const nebGrad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.5,
          0,
          width * 0.5,
          height * 0.5,
          Math.min(width, height) * 0.6 * audioIntensity,
        );
        nebGrad.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        nebGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.12)');
        nebGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = nebGrad;
        ctx.fillRect(-20, -20, width + 40, height + 40);

        // Particle Star Stream
        const cx = width * mouseRef.current.x;
        const cy = height * mouseRef.current.y;

        for (const p of particles) {
          p.x += p.vx * 2;
          p.y += p.vy * 2;
          if (p.x < 0) p.x = 1;
          if (p.x > 1) p.x = 0;
          if (p.y < 0) p.y = 1;
          if (p.y > 1) p.y = 0;

          const px = p.x * width;
          const py = p.y * height;

          // Mouse attraction
          const dx = cx - px;
          const dy = cy - py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            p.x += (dx / dist) * 0.001;
            p.y += (dy / dist) * 0.001;
          }

          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(px, py, p.size * (1 + (audioIntensity - 1) * 2), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ----------------------------------------------------
      // 5. Shader: Cyber Matrix Hologram (Кибер-матрица)
      // ----------------------------------------------------
      else {
        ctx.fillStyle = '#021810';
        ctx.fillRect(-20, -20, width + 40, height + 40);

        const cols = 16;
        const rows = 24;
        const cellW = width / cols;
        const cellH = height / rows;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const px = c * cellW + cellW * 0.5;
            const py = r * cellH + cellH * 0.5;

            const distFromMouse = Math.hypot(
              px - width * mouseRef.current.x,
              py - height * mouseRef.current.y,
            );
            const wave = Math.sin(r * 0.4 + c * 0.3 + time * 2) * 0.5 + 0.5;
            const cursorBoost = Math.max(0, 1 - distFromMouse / 180);

            const alpha = Math.min(1, (wave * 0.35 + cursorBoost * 0.5) * audioIntensity);

            ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(px - cellW * 0.4, py - cellH * 0.4, cellW * 0.8, cellH * 0.8);
          }
        }
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      observer.disconnect();
    };
  }, [shaderId, audioReactive, parallax3d, isAudioPlaying, audioVolume]);

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => handlePointerMove(e.nativeEvent)}
      onTouchMove={(e) => handlePointerMove(e.nativeEvent)}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={style}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
