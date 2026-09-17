import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Wifi,
  X,
  Maximize2,
  Minimize2,
  Layers,
  Volume2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { LiveConnectionStats } from '../../lib/webrtc/statsCollector';
import { useCallStore } from '../../model/callStore';

interface StatsHUDProps {
  stats: LiveConnectionStats | null;
  onClose: () => void;
}

export const StatsHUD: React.FC<StatsHUDProps> = ({ stats, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const e2eeStatus = useCallStore((s) => s.e2eeStatus);

  // Render rolling canvas graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stats) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= height; y += height / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const { bitrateIn, bitrateOut, jitter } = stats.history;
    const count = Math.max(bitrateIn.length, bitrateOut.length, jitter.length, 1);
    const step = width / Math.max(count - 1, 1);

    // Max values for auto-scaling
    const maxBitrate = Math.max(...bitrateIn, ...bitrateOut, 500); // min 500 kbps scale

    // 1. Draw Bitrate In (Cyan fill & stroke)
    if (bitrateIn.length > 1) {
      ctx.beginPath();
      ctx.moveTo(0, height);
      bitrateIn.forEach((val, idx) => {
        const x = idx * step;
        const y = height - (val / maxBitrate) * (height - 10);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      // Gradient fill
      const gradIn = ctx.createLinearGradient(0, 0, 0, height);
      gradIn.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
      gradIn.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
      ctx.lineTo((bitrateIn.length - 1) * step, height);
      ctx.closePath();
      ctx.fillStyle = gradIn;
      ctx.fill();

      // Stroke
      ctx.beginPath();
      bitrateIn.forEach((val, idx) => {
        const x = idx * step;
        const y = height - (val / maxBitrate) * (height - 10);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 2. Draw Bitrate Out (Violet stroke)
    if (bitrateOut.length > 1) {
      ctx.beginPath();
      bitrateOut.forEach((val, idx) => {
        const x = idx * step;
        const y = height - (val / maxBitrate) * (height - 10);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Draw Jitter / Ping (Emerald line)
    if (jitter.length > 1) {
      const maxJitter = Math.max(...jitter, 50);
      ctx.beginPath();
      jitter.forEach((val, idx) => {
        const x = idx * step;
        const y = height - (val / maxJitter) * (height * 0.45); // lower half
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [stats]);

  if (!stats) return null;

  return (
    <div
      role="region"
      aria-label="WebRTC Live Stream Stats HUD"
      className="absolute top-16 right-4 z-50 w-80 sm:w-96 bg-neutral-950/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-neutral-200 font-sans transition-all duration-200"
    >
      {/* HUD Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10 select-none">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wide uppercase text-neutral-300">
            WebRTC Live Stream HUD
          </span>
          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono border border-cyan-500/30">
            Ctrl+Shift+D
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-white/10 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
            aria-label={isExpanded ? 'Collapse HUD' : 'Expand HUD'}
          >
            {isExpanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-rose-400 rounded hover:bg-white/10 transition-colors"
            title="Close"
            aria-label="Close HUD"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Content */}
      {isExpanded && (
        <div className="p-3.5 space-y-3">
          {/* Real-time Canvas Graph */}
          <div className="relative rounded-lg bg-black/40 border border-white/5 p-2 overflow-hidden">
            <div className="flex items-center justify-between text-[11px] mb-1 font-mono text-neutral-400">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                In: {stats.bitrateInKbps} kbps
              </span>
              <span className="flex items-center gap-1.5 text-purple-400">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                Out: {stats.bitrateOutKbps} kbps
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Jitter: {stats.jitterMs}ms
              </span>
            </div>
            <canvas ref={canvasRef} width={350} height={90} className="w-full h-20 block" />
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-neutral-900/70 border border-white/5 rounded-lg p-2 flex flex-col gap-0.5">
              <span className="text-[10px] text-neutral-400 uppercase font-medium">Ping / RTT</span>
              <span className="font-mono text-sm font-semibold text-emerald-400">
                {stats.rttMs} ms
              </span>
            </div>

            <div className="bg-neutral-900/70 border border-white/5 rounded-lg p-2 flex flex-col gap-0.5">
              <span className="text-[10px] text-neutral-400 uppercase font-medium">
                Packet Loss
              </span>
              <span
                className={`font-mono text-sm font-semibold ${
                  stats.packetLossPercent > 5
                    ? 'text-rose-400'
                    : stats.packetLossPercent > 1
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                }`}
              >
                {stats.packetLossPercent}%
              </span>
            </div>

            <div className="bg-neutral-900/70 border border-white/5 rounded-lg p-2 flex flex-col gap-0.5">
              <span className="text-[10px] text-neutral-400 uppercase font-medium">
                Resolution / FPS
              </span>
              <span className="font-mono text-xs font-semibold text-neutral-200">
                {stats.resolution} @ {Math.max(stats.fpsIn, stats.fpsOut)} fps
              </span>
            </div>

            <div className="bg-neutral-900/70 border border-white/5 rounded-lg p-2 flex flex-col gap-0.5">
              <span className="text-[10px] text-neutral-400 uppercase font-medium">
                Audio Delay
              </span>
              <span className="font-mono text-xs font-semibold text-neutral-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                {stats.audioBufferDelayMs} ms
              </span>
            </div>
          </div>

          {/* Codec & Protocol Badges */}
          <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Video Codec:
              </span>
              <span className="font-mono font-medium text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/20">
                {stats.videoCodec || 'AV1 / VP9'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                Audio Codec:
              </span>
              <span className="font-mono font-medium text-neutral-300 bg-neutral-900 px-2 py-0.5 rounded border border-white/5">
                {stats.audioCodec}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-amber-400" />
                Connection Route:
              </span>
              <span
                className={`font-mono font-medium px-2 py-0.5 rounded border text-[11px] ${
                  stats.connectionType.includes('TURN')
                    ? 'text-amber-300 bg-amber-950/50 border-amber-500/20'
                    : 'text-emerald-300 bg-emerald-950/50 border-emerald-500/20'
                }`}
              >
                {stats.connectionType}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400">
              <span className="flex items-center gap-1 text-neutral-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                E2EE:
              </span>
              <span
                className={`font-mono font-medium ${
                  e2eeStatus === 'verified'
                    ? 'text-emerald-400'
                    : e2eeStatus === 'unverified'
                      ? 'text-amber-300'
                      : 'text-gray-500'
                }`}
              >
                {e2eeStatus === 'verified'
                  ? 'verified'
                  : e2eeStatus === 'unverified'
                    ? 'unverified'
                    : 'off'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
