import React, { useEffect, useRef } from 'react';
import type { DrawingOverlay } from '../model/types';

interface StoryDrawingOverlayViewProps {
  overlay: DrawingOverlay;
}

export const StoryDrawingOverlayView: React.FC<StoryDrawingOverlayViewProps> = ({ overlay }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const renderDrawing = () => {
      const rect = parent.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;

      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (!overlay.strokes || overlay.strokes.length === 0) return;

      for (const stroke of overlay.strokes) {
        if (!stroke.points || stroke.points.length < 2) continue;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = stroke.size;

        if (stroke.tool === 'marker') {
          ctx.strokeStyle = stroke.color;
          ctx.globalAlpha = 0.5;
          ctx.globalCompositeOperation = 'source-over';
        } else if (stroke.tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = '#000000';
          ctx.globalAlpha = 1;
        } else {
          ctx.strokeStyle = stroke.color;
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }

        ctx.beginPath();
        const startX = (stroke.points[0].x / 100) * rect.width;
        const startY = (stroke.points[0].y / 100) * rect.height;
        ctx.moveTo(startX, startY);

        for (let i = 1; i < stroke.points.length; i++) {
          const ptX = (stroke.points[i].x / 100) * rect.width;
          const ptY = (stroke.points[i].y / 100) * rect.height;
          ctx.lineTo(ptX, ptY);
        }

        ctx.stroke();
        ctx.restore();
      }
    };

    renderDrawing();

    const resizeObserver = new ResizeObserver(() => {
      renderDrawing();
    });
    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [overlay]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};
