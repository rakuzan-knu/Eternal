import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  label: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
  className?: string;
}

const EXIT_DURATION_MS = 120;
const VIEWPORT_PADDING = 10;

export default function Tooltip({
  label,
  position = 'right',
  children,
  className = '',
}: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [isEntered, setIsEntered] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;
    const triggerRect = triggerEl.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;

    // Use measured dimensions if element exists, or reliable fallback
    const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 160;
    const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 32;

    const gap = 8;
    const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const winHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

    let targetLeft = 0;
    let targetTop = 0;

    switch (position) {
      case 'right': {
        targetLeft = triggerRect.right + gap;
        targetTop = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;

        // If overflows right edge, try flipping to left if there's space
        if (targetLeft + tooltipWidth > winWidth - VIEWPORT_PADDING) {
          if (triggerRect.left - gap - tooltipWidth >= VIEWPORT_PADDING) {
            targetLeft = triggerRect.left - gap - tooltipWidth;
          } else {
            targetLeft = winWidth - tooltipWidth - VIEWPORT_PADDING;
          }
        }
        break;
      }
      case 'left': {
        targetLeft = triggerRect.left - gap - tooltipWidth;
        targetTop = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;

        // If overflows left edge, try flipping to right if there's space
        if (targetLeft < VIEWPORT_PADDING) {
          if (triggerRect.right + gap + tooltipWidth <= winWidth - VIEWPORT_PADDING) {
            targetLeft = triggerRect.right + gap;
          } else {
            targetLeft = VIEWPORT_PADDING;
          }
        }
        break;
      }
      case 'top': {
        targetLeft = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
        targetTop = triggerRect.top - gap - tooltipHeight;

        // If overflows top, flip to bottom if there's space
        if (targetTop < VIEWPORT_PADDING) {
          if (triggerRect.bottom + gap + tooltipHeight <= winHeight - VIEWPORT_PADDING) {
            targetTop = triggerRect.bottom + gap;
          } else {
            targetTop = VIEWPORT_PADDING;
          }
        }
        break;
      }
      case 'bottom':
      default: {
        targetLeft = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
        targetTop = triggerRect.bottom + gap;

        // If overflows bottom, flip to top if there's space
        if (targetTop + tooltipHeight > winHeight - VIEWPORT_PADDING) {
          if (triggerRect.top - gap - tooltipHeight >= VIEWPORT_PADDING) {
            targetTop = triggerRect.top - gap - tooltipHeight;
          } else {
            targetTop = winHeight - tooltipHeight - VIEWPORT_PADDING;
          }
        }
        break;
      }
    }

    // Always clamp horizontally and vertically to remain inside screen margins
    targetLeft = Math.max(
      VIEWPORT_PADDING,
      Math.min(winWidth - tooltipWidth - VIEWPORT_PADDING, targetLeft),
    );
    targetTop = Math.max(
      VIEWPORT_PADDING,
      Math.min(winHeight - tooltipHeight - VIEWPORT_PADDING, targetTop),
    );

    setCoords({ top: Math.round(targetTop), left: Math.round(targetLeft) });
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

  // Re-measure immediately before browser paint once tooltip is mounted
  useLayoutEffect(() => {
    if (!shouldRender) return;
    updatePosition();
  }, [shouldRender, updatePosition, label]);

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
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
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
