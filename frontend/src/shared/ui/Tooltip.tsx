import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  label: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
  className?: string;
}

const EXIT_DURATION_MS = 120;

export default function Tooltip({
  label,
  position = 'right',
  children,
  className = '',
}: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [isEntered, setIsEntered] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 10;
    switch (position) {
      case 'right':
        setCoords({ top: rect.top + rect.height / 2, left: rect.right + gap });
        break;
      case 'left':
        setCoords({ top: rect.top + rect.height / 2, left: rect.left - gap });
        break;
      case 'top':
        setCoords({ top: rect.top - gap, left: rect.left + rect.width / 2 });
        break;
      case 'bottom':
        setCoords({ top: rect.bottom + gap, left: rect.left + rect.width / 2 });
        break;
    }
  }, [position]);

  const show = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    updatePosition();
    setShouldRender(true);
  };

  const hide = () => {
    setIsEntered(false);
    hideTimeout.current = setTimeout(() => setShouldRender(false), EXIT_DURATION_MS);
  };

  useEffect(() => {
    if (!shouldRender) return;
    const id = requestAnimationFrame(() => setIsEntered(true));

    const handleReposition = () => updatePosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [shouldRender, updatePosition]);

  useEffect(
    () => () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    },
    [],
  );

  const originTransform: Record<string, string> = {
    right: 'translate(0, -50%)',
    left: 'translate(-100%, -50%)',
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
  };

  return (
    <div
      ref={triggerRef}
      className={`inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}

      {shouldRender &&
        createPortal(
          <span
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform: originTransform[position],
            }}
            className={`pointer-events-none whitespace-nowrap rounded-lg bg-[#0d0d0f] border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg z-[9999] transition-all duration-150 ${
              isEntered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            {label}
          </span>,
          document.body,
        )}
    </div>
  );
}
