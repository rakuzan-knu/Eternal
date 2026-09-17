import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface TextDraftOverlayProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  draft: { x: number; y: number; value: string };
  color: string;
  fontSize: number;
  onChange: (value: string) => void;
  onCommit: () => void;
}

export default function TextDraftOverlay({
  canvasRef,
  draft,
  color,
  fontSize,
  onChange,
  onCommit,
}: TextDraftOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [screenPos, setScreenPos] = useState({ left: 0, top: 0, scale: 1 });

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const parentRect = canvas.parentElement?.getBoundingClientRect();
    const scale = canvas.width ? (canvasRect.width || canvas.width) / canvas.width : 1;
    const parentLeft = Number.isFinite(parentRect?.left) ? parentRect!.left : 0;
    const parentTop = Number.isFinite(parentRect?.top) ? parentRect!.top : 0;
    const canvasLeft = Number.isFinite(canvasRect.left) ? canvasRect.left : 0;
    const canvasTop = Number.isFinite(canvasRect.top) ? canvasRect.top : 0;
    setScreenPos({
      left: canvasLeft - parentLeft + (draft.x || 0) * scale,
      top: canvasTop - parentTop + (draft.y || 0) * scale,
      scale,
    });
  }, [canvasRef, draft.x, draft.y]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <textarea
      ref={textareaRef}
      value={draft.value}
      placeholder="Type text..."
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onCommit();
        }
      }}
      style={{
        position: 'absolute',
        left: screenPos.left,
        top: screenPos.top,
        color,
        fontSize: fontSize * screenPos.scale,
        minWidth: 40,
      }}
      className="bg-transparent border border-dashed border-white/40 rounded px-1 outline-none resize-none leading-tight"
      rows={1}
    />
  );
}
