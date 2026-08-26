import React, { useEffect, useRef } from 'react';
import { reactionBurstEngine } from '../lib/reactionBurstEngine';

export default function ReactionBurstCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    reactionBurstEngine.attachCanvas(canvas);

    const handleResize = () => {
      reactionBurstEngine.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      reactionBurstEngine.detachCanvas();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[99999] select-none"
      aria-hidden="true"
    />
  );
}
