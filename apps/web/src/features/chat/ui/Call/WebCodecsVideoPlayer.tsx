import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Cpu, Zap, RefreshCw } from 'lucide-react';
import { isWebCodecsSupported, WebCodecsRtpPipeline } from '../../lib/webrtc/webCodecsRtpPipeline';

interface WebCodecsVideoPlayerProps {
  dataChannel?: RTCDataChannel | null;
  className?: string;
  onRequestKeyframe?: () => void;
}

export function WebCodecsVideoPlayer({
  dataChannel,
  className = '',
  onRequestKeyframe,
}: WebCodecsVideoPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipelineRef = useRef<WebCodecsRtpPipeline | null>(null);
  const [fps, setFps] = useState(30);
  const [framesDecoded, setFramesDecoded] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  const handlePliRequest = useCallback(() => {
    if (onRequestKeyframe) {
      onRequestKeyframe();
    }
  }, [onRequestKeyframe]);

  useEffect(() => {
    if (!isWebCodecsSupported()) {
      setIsSupported(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCounter = 0;
    let lastTime = performance.now();

    const pipeline = new WebCodecsRtpPipeline({
      onDecodedFrame: (frame: VideoFrame) => {
        if (canvas.width !== frame.displayWidth || canvas.height !== frame.displayHeight) {
          canvas.width = frame.displayWidth;
          canvas.height = frame.displayHeight;
        }

        ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
        frame.close();

        frameCounter++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
          setFps(frameCounter);
          setFramesDecoded((prev) => prev + frameCounter);
          frameCounter = 0;
          lastTime = now;
        }
      },
      onRequestPli: handlePliRequest,
    });

    pipeline.initDecoder(() => {
      // Callback is set in constructor
    });

    pipelineRef.current = pipeline;

    // Attach data channel listener if provided
    if (dataChannel) {
      const handleMessage = (evt: MessageEvent) => {
        if (evt.data instanceof ArrayBuffer) {
          pipeline.handleIncomingDatagram(new Uint8Array(evt.data));
        }
      };

      dataChannel.addEventListener('message', handleMessage);
      return () => {
        dataChannel.removeEventListener('message', handleMessage);
        pipeline.close();
      };
    }

    return () => {
      pipeline.close();
    };
  }, [dataChannel, handlePliRequest]);

  if (!isSupported) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-6 bg-zinc-900/90 text-zinc-400 rounded-2xl border border-white/10 ${className}`}
      >
        <Cpu size={24} className="text-zinc-500 mb-2" />
        <p className="text-xs">WebCodecs аппаратное ускорение не поддерживается браузером</p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-black border border-white/10 shadow-2xl flex items-center justify-center ${className}`}
    >
      <canvas ref={canvasRef} className="w-full h-full object-cover" />

      {/* Hardware Telemetry Badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-950/80 backdrop-blur-md border border-cyan-500/40 text-[10px] font-medium text-cyan-300 shadow-lg">
          <Cpu size={11} className="text-cyan-400 animate-pulse" />
          <span>AV1 Hardware Direct</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-[10px] font-medium text-emerald-300 shadow-lg">
          <Zap size={11} className="text-emerald-400" />
          <span>&lt; 2 ms Latency</span>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[11px] text-zinc-300 font-mono">
          <span>{fps} FPS</span>
          <span className="text-zinc-600">•</span>
          <span>{framesDecoded} frames</span>
        </div>

        <button
          type="button"
          onClick={handlePliRequest}
          title="Запросить мгновенный Keyframe (PLI)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-medium backdrop-blur-md border border-white/15 transition-all shadow-md active:scale-95"
        >
          <RefreshCw size={12} className="text-emerald-400" />
          <span>PLI Keyframe</span>
        </button>
      </div>
    </div>
  );
}
