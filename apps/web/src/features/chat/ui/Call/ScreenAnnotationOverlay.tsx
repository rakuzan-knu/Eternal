import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Radio, Pencil, MoveUpRight, Trash2, X } from 'lucide-react';
import {
  ScreenAnnotationEngine,
  type AnnotationTool,
  ANNOTATION_COLORS,
} from '../../lib/webrtc/screenAnnotationEngine';

interface ScreenAnnotationOverlayProps {
  dataChannel?: RTCDataChannel | null;
  isActive: boolean;
  onClose: () => void;
}

export function ScreenAnnotationOverlay({
  dataChannel,
  isActive,
  onClose,
}: ScreenAnnotationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ScreenAnnotationEngine | null>(null);

  const [tool, setTool] = useState<AnnotationTool>('laser');
  const [selectedColor, setSelectedColor] = useState<string>(ANNOTATION_COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const arrowStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new ScreenAnnotationEngine(canvas);
    engineRef.current = engine;

    if (dataChannel) {
      engine.bindDataChannel(dataChannel);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && canvas) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(entry.contentRect.width * dpr);
        canvas.height = Math.round(entry.contentRect.height * dpr);
        canvas.style.width = `${entry.contentRect.width}px`;
        canvas.style.height = `${entry.contentRect.height}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, [dataChannel]);

  const getNormalizedCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive || !engineRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDrawing(true);

    const { x, y } = getNormalizedCoords(e);

    if (tool === 'laser') {
      engineRef.current.broadcastLaserPointer(x, y, selectedColor);
    } else if (tool === 'pen') {
      engineRef.current.startPenStroke(x, y, selectedColor, 3);
    } else if (tool === 'arrow') {
      arrowStartRef.current = { x, y };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive || !engineRef.current) return;

    const { x, y } = getNormalizedCoords(e);

    if (tool === 'laser') {
      // Laser moves on hover or drag
      engineRef.current.broadcastLaserPointer(x, y, selectedColor);
    } else if (tool === 'pen' && isDrawing) {
      engineRef.current.addPenPoint(x, y);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive || !engineRef.current) return;
    setIsDrawing(false);

    if (tool === 'pen') {
      engineRef.current.endPenStroke();
    } else if (tool === 'arrow' && arrowStartRef.current) {
      const { x, y } = getNormalizedCoords(e);
      engineRef.current.addArrow(
        arrowStartRef.current.x,
        arrowStartRef.current.y,
        x,
        y,
        selectedColor,
        4,
      );
      arrowStartRef.current = null;
    }
  };

  const handleClear = () => {
    engineRef.current?.clearAll();
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-30 ${
        isActive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
      }`}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full touch-none"
      />

      {/* Floating Glassmorphic Annotation Toolbar */}
      {isActive && (
        <aside
          aria-label="Screen Annotation Toolbar"
          className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-950/85 backdrop-blur-xl border border-white/10 shadow-2xl animate-fadeIn"
        >
          {/* Laser Pointer */}
          <button
            onClick={() => setTool('laser')}
            title="Laser pointer (temporary glow)"
            className={`p-2 rounded-xl transition-all ${
              tool === 'laser'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio size={16} />
          </button>

          {/* Pen */}
          <button
            onClick={() => setTool('pen')}
            title="Freehand pen"
            className={`p-2 rounded-xl transition-all ${
              tool === 'pen'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Pencil size={16} />
          </button>

          {/* Arrow */}
          <button
            onClick={() => setTool('arrow')}
            title="Arrow pointer"
            className={`p-2 rounded-xl transition-all ${
              tool === 'arrow'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MoveUpRight size={16} />
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Color Selector */}
          <div className="flex items-center gap-1 px-1">
            {ANNOTATION_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{ backgroundColor: color }}
                title={`Color: ${color}`}
                className={`w-5 h-5 rounded-full transition-transform ${
                  selectedColor === color
                    ? 'ring-2 ring-white scale-110 shadow-md'
                    : 'opacity-70 hover:opacity-100 hover:scale-105'
                }`}
              />
            ))}
          </div>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Clear */}
          <button
            onClick={handleClear}
            title="Clear all drawings"
            className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 size={16} />
          </button>

          {/* Close Toolbar */}
          <button
            onClick={onClose}
            title="Close drawing mode"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
          >
            <X size={16} />
          </button>
        </aside>
      )}
    </div>
  );
}
