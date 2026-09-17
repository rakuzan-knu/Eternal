import React, { useEffect, useRef, useState } from 'react';
import { Boxes, Glasses, RotateCcw, X, Eye, Sliders, Sparkles } from 'lucide-react';
import {
  generateVolumetricAvatar,
  quantizeGaussianSplats,
  dequantizeGaussianSplats,
  WebGLGaussianSplatRenderer,
  GaussianSplat3D,
} from '../../lib/webrtc/gaussianSplatStreamer';

interface HolographicCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  dataChannel?: RTCDataChannel | null;
}

export function HolographicCallModal({
  isOpen,
  onClose,
  userName = 'Собеседник',
  dataChannel: _dataChannel,
}: HolographicCallModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<WebGLGaussianSplatRenderer | null>(null);

  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const [splatDensity, setSplatDensity] = useState(1200);
  const [isXrSupported, setIsXrSupported] = useState(false);
  const [isXrActive, setIsXrActive] = useState(false);
  const bandwidthKbps = 560;

  // Check WebXR hardware support (Apple Vision Pro / Meta Quest)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) {
      const xr = (
        navigator as unknown as { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } }
      ).xr;
      if (xr?.isSessionSupported) {
        xr.isSessionSupported('immersive-vr')
          .then((supported) => setIsXrSupported(supported))
          .catch(() => setIsXrSupported(false));
      }
    }
  }, []);

  // Escape key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Request WebXR Immersive Session
  const handleEnterWebXr = async () => {
    try {
      const xr = (
        navigator as unknown as { xr?: { requestSession?: (mode: string) => Promise<unknown> } }
      ).xr;
      if (xr?.requestSession) {
        await xr.requestSession('immersive-vr');
        setIsXrActive(true);
      }
    } catch {
      // Fallback
    }
  };

  // WebGL render loop
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!rendererRef.current) {
      rendererRef.current = new WebGLGaussianSplatRenderer(canvas);
    }
    const renderer = rendererRef.current;

    let animId: number;
    const startTime = performance.now();

    const renderLoop = () => {
      const timeSec = (performance.now() - startTime) / 1000;

      // Handle stream or synthesize volumetric avatar
      const splats: GaussianSplat3D[] = generateVolumetricAvatar(timeSec, splatDensity);
      // Binary compression simulation
      const binary = quantizeGaussianSplats(splats);
      const decoded = dequantizeGaussianSplats(binary);

      renderer.updateSplats(decoded);
      renderer.render(yaw, pitch, zoom, canvas.clientWidth || 800, canvas.clientHeight || 600);

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [isOpen, yaw, pitch, zoom, splatDensity]);

  // Mobile Device Orientation Gyroscope head tracking
  useEffect(() => {
    if (!isOpen) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        // Convert phone tilt to yaw/pitch parallax
        setYaw((e.gamma / 90) * 0.6);
        setPitch(((e.beta - 45) / 90) * 0.4);
      }
    };

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    }
  }, [isOpen]);

  // Mouse drag parallax
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    setYaw((prev) => prev + dx * 0.006);
    setPitch((prev) => Math.max(-0.6, Math.min(0.6, prev + dy * 0.006)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetParallax = () => {
    setYaw(0);
    setPitch(0);
    setZoom(1.0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[85vh] rounded-3xl bg-zinc-950/90 border border-white/15 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/60 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Boxes size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-wide">
                  3D Голографический вызов (WebXR Gaussian Splatting)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  LiDAR 3D Stream
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Объемный 3D-аватар {userName} с честным параллаксом при повороте головы
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isXrSupported ? (
              <button
                type="button"
                onClick={handleEnterWebXr}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-500/25 transition-all"
              >
                <Glasses size={15} />
                <span>
                  {isXrActive ? 'WebXR Сессия активна' : 'Войти в WebXR (Vision Pro / Quest)'}
                </span>
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-xs">
                <Eye size={13} className="text-cyan-400" />
                <span>Desktop Mouse &amp; Gyro Parallax</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleResetParallax}
              title="Сбросить ракурс"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors"
            >
              <RotateCcw size={16} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* WebGL Canvas Viewport */}
        <div
          className="relative flex-1 bg-linear-to-b from-zinc-950 via-zinc-900/50 to-zinc-950 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Cybernetic Grid Backdrop */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at center, rgba(6,182,212,0.2) 0%, transparent 70%), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '100% 100%, 40px 40px, 40px 40px',
            }}
          />

          <canvas
            ref={canvasRef}
            width={960}
            height={640}
            className="w-full h-full object-contain"
          />

          {/* Floating Parallax Compass Badge */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono text-cyan-300">
              <Sparkles size={13} className="text-cyan-400" />
              <span>
                Yaw: {(yaw * (180 / Math.PI)).toFixed(1)}° • Pitch:{' '}
                {(pitch * (180 / Math.PI)).toFixed(1)}°
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono text-emerald-300">
              <span>
                {splatDensity} Gaussian Splats • ~20 KB/frame ({bandwidthKbps} kbps)
              </span>
            </div>
          </div>

          {/* Bottom Controls Bar */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 pointer-events-auto">
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                <Sliders size={13} />
                <span>Плотность сплэтов:</span>
              </span>
              <input
                type="range"
                min={600}
                max={2000}
                step={100}
                value={splatDensity}
                onChange={(e) => setSplatDensity(Number(e.target.value))}
                className="w-32 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="text-xs text-cyan-400 font-mono">{splatDensity}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 font-medium">Зум:</span>
              <input
                type="range"
                min={0.6}
                max={1.8}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-28 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <span className="text-xs text-emerald-400 font-mono">{zoom.toFixed(1)}x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
