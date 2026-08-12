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
    const parentRect = canvas.parentElement!.getBoundingClientRect();
    const scale = canvasRect.width / canvas.width;
    setScreenPos({
      left: canvasRect.left - parentRect.left + draft.x * scale,
      top: canvasRect.top - parentRect.top + draft.y * scale,
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
