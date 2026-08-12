import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flipPointX, rotatePoint90, Point } from '../../lib/imageEditorGeometry';
import { ToolMode, DrawTool, Stroke, Snapshot } from './types';

interface UseCanvasEditorParams {
  current: Snapshot | null;
  commit: (next: Snapshot) => void;
  toolMode: ToolMode;
  drawTool: DrawTool;
  color: string;
  size: number;
  pendingSticker: string | null;
  setPendingSticker: (value: string | null) => void;
  setTextDraft: (draft: { x: number; y: number; value: string } | null) => void;
}

export function useCanvasEditor({
  current,
  commit,
  toolMode,
  drawTool,
  color,
  size,
  pendingSticker,
  setPendingSticker,
  setTextDraft,
}: UseCanvasEditorParams) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const draggingStickerId = useRef<string | null>(null);
  const draggingTextId = useRef<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = baseImageRef.current;
    if (!canvas || !img || !current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = current.baseWidth;
    canvas.height = current.baseHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, current.baseWidth, current.baseHeight);

    const allStrokes = liveStroke ? [...current.strokes, liveStroke] : current.strokes;
    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.save();
      ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.globalAlpha = stroke.tool === 'marker' ? 0.55 : 1;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const point of stroke.points.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.restore();
    }

    for (const sticker of current.stickers) {
      const pos = dragPreview?.id === sticker.id ? dragPreview : sticker;
      ctx.save();
      ctx.font = `${sticker.fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sticker.emoji, pos.x, pos.y);
      ctx.restore();
    }

    for (const text of current.texts) {
      const pos = dragPreview?.id === text.id ? dragPreview : text;
      ctx.save();
      ctx.font = `${text.fontSize}px sans-serif`;
      ctx.fillStyle = text.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      text.text
        .split('\n')
        .forEach((line, i) => ctx.fillText(line, pos.x, pos.y + i * text.fontSize * 1.2));
      ctx.restore();
    }
  }, [current, liveStroke, dragPreview]);

  useEffect(() => {
    const baseImageSrc = current?.baseImageSrc;
    if (!baseImageSrc) return;
    const img = new Image();
    img.onload = () => {
      baseImageRef.current = img;
      redraw();
    };
    img.src = baseImageSrc;
  }, [current?.baseImageSrc, redraw]);

  useLayoutEffect(() => {
    redraw();
  }, [redraw]);

  const getImagePoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const getDisplayScale = () => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return canvas.width / rect.width;
  };

  const findStickerAt = (point: Point) =>
    current?.stickers.find((s) => Math.hypot(s.x - point.x, s.y - point.y) < s.fontSize * 0.7);

  const findTextAt = (point: Point) =>
    current?.texts.find(
      (t) =>
        point.x >= t.x - 4 &&
        point.x <= t.x + t.fontSize * 8 &&
        point.y >= t.y - 4 &&
        point.y <= t.y + t.fontSize * 1.4,
    );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!current) return;
    const point = getImagePoint(e);

    if (toolMode === 'draw') {
      isDrawingRef.current = true;
      const stroke: Stroke = {
        id: crypto.randomUUID(),
        tool: drawTool,
        color,
        size: size * getDisplayScale(),
        points: [point],
      };
      currentStrokeRef.current = stroke;
      setLiveStroke(stroke);
      return;
    }

    if (toolMode === 'sticker') {
      const hit = findStickerAt(point);
      if (hit) {
        draggingStickerId.current = hit.id;
      } else if (pendingSticker) {
        commit({
          ...current,
          stickers: [
            ...current.stickers,
            {
              id: crypto.randomUUID(),
              emoji: pendingSticker,
              x: point.x,
              y: point.y,
              fontSize: size * 4 * getDisplayScale(),
            },
          ],
        });
        setPendingSticker(null);
      }
      return;
    }

    if (toolMode === 'text') {
      const hit = findTextAt(point);
      if (hit) {
        draggingTextId.current = hit.id;
      } else {
        setTextDraft({ x: point.x, y: point.y, value: '' });
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!current) return;

    if (isDrawingRef.current && currentStrokeRef.current) {
      const point = getImagePoint(e);
      currentStrokeRef.current = {
        ...currentStrokeRef.current,
        points: [...currentStrokeRef.current.points, point],
      };
      setLiveStroke(currentStrokeRef.current);
      return;
    }

    if (draggingStickerId.current) {
      const point = getImagePoint(e);
      setDragPreview({ id: draggingStickerId.current, x: point.x, y: point.y });
      return;
    }

    if (draggingTextId.current) {
      const point = getImagePoint(e);
      setDragPreview({ id: draggingTextId.current, x: point.x, y: point.y });
    }
  };

  const handlePointerUp = () => {
    if (!current) return;

    if (isDrawingRef.current && currentStrokeRef.current) {
      isDrawingRef.current = false;
      const stroke = currentStrokeRef.current;
      currentStrokeRef.current = null;
      setLiveStroke(null);
      if (stroke.points.length > 1) commit({ ...current, strokes: [...current.strokes, stroke] });
      return;
    }

    if (draggingStickerId.current && dragPreview) {
      const id = draggingStickerId.current;
      commit({
        ...current,
        stickers: current.stickers.map((s) =>
          s.id === id ? { ...s, x: dragPreview.x, y: dragPreview.y } : s,
        ),
      });
      draggingStickerId.current = null;
      setDragPreview(null);
      return;
    }

    if (draggingTextId.current && dragPreview) {
      const id = draggingTextId.current;
      commit({
        ...current,
        texts: current.texts.map((t) =>
          t.id === id ? { ...t, x: dragPreview.x, y: dragPreview.y } : t,
        ),
      });
      draggingTextId.current = null;
      setDragPreview(null);
    }
  };

  const applyBaseTransform = (
    transform: (ctx: CanvasRenderingContext2D, newW: number, newH: number) => void,
    newW: number,
    newH: number,
    pointTransform: (p: Point) => Point,
  ) => {
    if (!current || !baseImageRef.current) return;
    const off = document.createElement('canvas');
    off.width = newW;
    off.height = newH;
    const ctx = off.getContext('2d')!;
    transform(ctx, newW, newH);
    ctx.drawImage(baseImageRef.current, 0, 0, current.baseWidth, current.baseHeight);

    commit({
      baseImageSrc: off.toDataURL(),
      baseWidth: newW,
      baseHeight: newH,
      strokes: current.strokes.map((s) => ({ ...s, points: s.points.map(pointTransform) })),
      stickers: current.stickers.map((s) => ({ ...s, ...pointTransform(s) })),
      texts: current.texts.map((t) => ({ ...t, ...pointTransform(t) })),
    });
  };

  const handleMirror = () => {
    if (!current) return;
    applyBaseTransform(
      (ctx, w) => {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      },
      current.baseWidth,
      current.baseHeight,
      (p) => flipPointX(p, current.baseWidth),
    );
  };

  const handleRotate = () => {
    if (!current) return;
    applyBaseTransform(
      (ctx, w) => {
        ctx.translate(w, 0);
        ctx.rotate(Math.PI / 2);
      },
      current.baseHeight,
      current.baseWidth,
      (p) => rotatePoint90(p, current.baseWidth, current.baseHeight),
    );
  };

  return {
    canvasRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleMirror,
    handleRotate,
  };
}
