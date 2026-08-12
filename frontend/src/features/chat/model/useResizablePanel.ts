import React, { useEffect, useRef, useState } from 'react';

export function useResizablePanel(min: number, max: number, defaultWidth: number) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const dragStart = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { startX: e.clientX, startWidth: width };
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const delta = e.clientX - dragStart.current.startX;
      const next = Math.min(max, Math.max(min, dragStart.current.startWidth + delta));
      setWidth(next);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      dragStart.current = null;
    };

    document.body.style.cursor = 'e-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, min, max]);

  return { width, isResizing, isHandleHovered, setIsHandleHovered, handleResizeStart };
}
