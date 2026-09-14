import { useState, useRef, useEffect, useCallback } from 'react';

interface UseMusicPanelResizerOptions {
  min: number;
  max: number;
  defaultWidth: number;
  direction: 'left' | 'right';
  storageKey?: string;
}

export function useMusicPanelResizer({
  min,
  max,
  defaultWidth,
  direction,
  storageKey,
}: UseMusicPanelResizerOptions) {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window !== 'undefined' && storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed >= min && parsed <= max) {
            return parsed;
          }
        }
      } catch {}
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const dragStart = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragStart.current = { startX: e.clientX, startWidth: width };
      setIsResizing(true);
    },
    [width],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const delta =
        direction === 'right'
          ? e.clientX - dragStart.current.startX
          : dragStart.current.startX - e.clientX;
      const next = Math.min(max, Math.max(min, Math.round(dragStart.current.startWidth + delta)));
      setWidth(next);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, String(next));
        } catch {}
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      dragStart.current = null;
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, min, max, direction, storageKey]);

  return {
    width,
    setWidth,
    isResizing,
    isHandleHovered,
    setIsHandleHovered,
    handleResizeStart,
  };
}
