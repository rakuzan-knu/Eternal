import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Pencil, Highlighter, Eraser, Undo2, Redo2, Trash2, Check, X, Sliders } from 'lucide-react';
import type { DrawingStroke } from '../model/types';

interface StoryDrawingCanvasProps {
  initialStrokes?: DrawingStroke[];
  onSave: (strokes: DrawingStroke[]) => void;
  onCancel: () => void;
}

const DRAWING_COLORS = [
  '#ffffff',
  '#000000',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
];

export const StoryDrawingCanvas: React.FC<StoryDrawingCanvasProps> = ({
  initialStrokes = [],
  onSave,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<'pencil' | 'marker' | 'eraser'>('pencil');
  const [color, setColor] = useState<string>('#ffffff');
  const [size, setSize] = useState<number>(6);
  const [showSizeSlider, setShowSizeSlider] = useState<boolean>(false);

  const [strokes, setStrokes] = useState<DrawingStroke[]>(initialStrokes);
  const [redoStack, setRedoStack] = useState<DrawingStroke[]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);

  // Draw single stroke segment directly to 2D context for instant 60fps response
  const drawStrokeSegment = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      s: DrawingStroke,
      fromPt: { x: number; y: number },
      toPt: { x: number; y: number },
    ) => {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = s.size;

      if (s.tool === 'marker') {
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = 0.5;
        ctx.globalCompositeOperation = 'source-over';
      } else if (s.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = '#000000';
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.beginPath();
      ctx.moveTo((fromPt.x / 100) * width, (fromPt.y / 100) * height);
      ctx.lineTo((toPt.x / 100) * width, (toPt.y / 100) * height);
      ctx.stroke();
      ctx.restore();
    },
    [],
  );

  // Full redraw canvas from completed strokes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;

    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    for (const s of strokes) {
      if (!s.points || s.points.length < 2) continue;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = s.size;

      if (s.tool === 'marker') {
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = 0.5;
        ctx.globalCompositeOperation = 'source-over';
      } else if (s.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = '#000000';
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.beginPath();
      const startX = (s.points[0].x / 100) * rect.width;
      const startY = (s.points[0].y / 100) * rect.height;
      ctx.moveTo(startX, startY);

      for (let i = 1; i < s.points.length; i++) {
        const ptX = (s.points[i].x / 100) * rect.width;
        const ptY = (s.points[i].y / 100) * rect.height;
        ctx.lineTo(ptX, ptY);
      }

      ctx.stroke();
      ctx.restore();
    }
  }, [strokes]);

  useEffect(() => {
    redraw();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      redraw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [redraw]);

  // Handle pointer drawing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // pointer capture fallback
    }
    isDrawingRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const pctX = ((e.clientX - rect.left) / rect.width) * 100;
    const pctY = ((e.clientY - rect.top) / rect.height) * 100;

    const newStroke: DrawingStroke = {
      tool,
      color,
      size,
      points: [
        { x: pctX, y: pctY },
        { x: pctX, y: pctY },
      ],
    };

    currentStrokeRef.current = newStroke;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawStrokeSegment(
        ctx,
        rect.width,
        rect.height,
        newStroke,
        newStroke.points[0],
        newStroke.points[1],
      );
    }

    setRedoStack([]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pctX = ((e.clientX - rect.left) / rect.width) * 100;
    const pctY = ((e.clientY - rect.top) / rect.height) * 100;

    const stroke = currentStrokeRef.current;
    if (!stroke || stroke.points.length === 0) return;

    const prevPt = stroke.points[stroke.points.length - 1];
    const newPt = { x: pctX, y: pctY };
    stroke.points.push(newPt);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawStrokeSegment(ctx, rect.width, rect.height, stroke, prevPt, newPt);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (canvas) {
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {
        // pointer capture fallback
      }
    }

    isDrawingRef.current = false;
    const finishedStroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    if (finishedStroke && finishedStroke.points.length >= 2) {
      setStrokes((prev) => [...prev, finishedStroke]);
    }
  };

  // Safe global window pointer release to prevent stuck states
  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (isDrawingRef.current) {
        const canvas = canvasRef.current;
        if (canvas) {
          try {
            if (canvas.hasPointerCapture(e.pointerId)) {
              canvas.releasePointerCapture(e.pointerId);
            }
          } catch {}
        }
        isDrawingRef.current = false;
        const finishedStroke = currentStrokeRef.current;
        currentStrokeRef.current = null;
        if (finishedStroke && finishedStroke.points.length >= 2) {
          setStrokes((prev) => [...prev, finishedStroke]);
        }
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  // Undo & Redo
  const handleUndo = useCallback(() => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setStrokes((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, last]);
  }, [strokes]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setStrokes((prev) => [...prev, next]);
  }, [redoStack]);

  const handleClear = () => {
    if (strokes.length === 0) return;
    setRedoStack((prev) => [...prev, ...strokes]);
    setStrokes([]);
  };

  // Hotkeys Ctrl+Z, Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between select-none touch-none animate-fadeIn pointer-events-auto">
      {/* Top Floating Liquid Glass Toolbar */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Left Cancel / Close */}
        <button
          type="button"
          onClick={onCancel}
          className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xl border border-white/15 cursor-pointer shadow-lg active:scale-95 transition-all"
          title="Cancel"
        >
          <X size={20} />
        </button>

        {/* Center Tool Switchers */}
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-2xl border border-white/15 rounded-full p-1 shadow-2xl">
          {/* Pencil */}
          <button
            type="button"
            onClick={() => setTool('pencil')}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              tool === 'pencil' ? 'bg-white text-black shadow-md' : 'text-white/70 hover:text-white'
            }`}
            title="Pencil"
          >
            <Pencil size={18} />
          </button>

          {/* Marker */}
          <button
            type="button"
            onClick={() => setTool('marker')}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              tool === 'marker' ? 'bg-white text-black shadow-md' : 'text-white/70 hover:text-white'
            }`}
            title="Marker"
          >
            <Highlighter size={18} />
          </button>

          {/* Eraser */}
          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              tool === 'eraser' ? 'bg-white text-black shadow-md' : 'text-white/70 hover:text-white'
            }`}
            title="Eraser"
          >
            <Eraser size={18} />
          </button>

          <div className="w-[1px] h-5 bg-white/20 my-auto" />

          {/* Size Slider Toggle */}
          <button
            type="button"
            onClick={() => setShowSizeSlider((v) => !v)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              showSizeSlider ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'
            }`}
            title="Brush size"
          >
            <Sliders size={17} />
          </button>

          {/* Undo */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              strokes.length === 0
                ? 'text-white/25 cursor-not-allowed'
                : 'text-white/80 hover:text-white'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>

          {/* Redo */}
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              redoStack.length === 0
                ? 'text-white/25 cursor-not-allowed'
                : 'text-white/80 hover:text-white'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={18} />
          </button>

          {/* Clear All */}
          <button
            type="button"
            onClick={handleClear}
            disabled={strokes.length === 0}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              strokes.length === 0
                ? 'text-white/25 cursor-not-allowed'
                : 'text-red-400 hover:bg-red-500/20'
            }`}
            title="Clear all"
          >
            <Trash2 size={17} />
          </button>
        </div>

        {/* Right Done (Save) */}
        <button
          type="button"
          onClick={() => onSave(strokes)}
          className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center cursor-pointer shadow-lg active:scale-95 transition-all font-bold"
          title="Done"
        >
          <Check size={20} />
        </button>
      </div>

      {/* Floating Stroke Size Slider */}
      {showSizeSlider && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-black/80 backdrop-blur-2xl border border-white/15 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-2xl animate-fadeIn">
          <span className="text-xs font-semibold text-gray-300 w-12">
            {tool === 'eraser' ? 'Eraser' : 'Brush'}: {size}px
          </span>
          <input
            type="range"
            min={2}
            max={36}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-32 accent-purple-400 cursor-pointer"
          />
          <div
            style={{
              width: size,
              height: size,
              backgroundColor: tool === 'eraser' ? '#ffffff' : color,
            }}
            className="rounded-full shrink-0 border border-white/40"
          />
        </div>
      )}

      {/* Interactive Drawing Canvas Layer */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
        className="absolute inset-0 w-full h-full cursor-crosshair z-10"
      />

      {/* Bottom Color Palette Bar */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto py-3 px-4 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent scrollbar-none">
        {DRAWING_COLORS.map((c) => {
          const isSelected = color === c && tool !== 'eraser';
          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                if (tool === 'eraser') setTool('pencil');
              }}
              style={{ backgroundColor: c }}
              className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? 'scale-125 border-white shadow-[0_0_12px_rgba(255,255,255,0.8)]'
                  : 'border-white/30 hover:scale-110'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
