import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ExpandedReactionPicker from './ExpandedReactionPicker';
import MessageReactionDock from './MessageReactionDock';

const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

const DOCK_WIDTH = 295;
const DOCK_HEIGHT = 46;
const PADDING = 12;

interface DockPosition {
  top: number;
  left: number;
  placementY: 'above' | 'below';
  transformOrigin: string;
}

function calculateDockPosition(
  anchor: HTMLElement | null,
  align: 'left' | 'right' = 'left',
): DockPosition {
  if (typeof window === 'undefined') {
    return { top: 0, left: 0, placementY: 'above', transformOrigin: 'bottom right' };
  }

  const vWidth = window.innerWidth || 1024;
  const vHeight = window.innerHeight || 768;

  let rect: DOMRect;
  if (anchor) {
    rect = anchor.getBoundingClientRect();
  } else {
    rect = new DOMRect(
      align === 'right' ? vWidth - DOCK_WIDTH - PADDING : PADDING,
      vHeight / 2,
      DOCK_WIDTH,
      36,
    );
  }

  const spaceAbove = rect.top - PADDING;
  let placementY: 'above' | 'below' = 'above';
  let top = 0;

  if (spaceAbove >= DOCK_HEIGHT + 6) {
    placementY = 'above';
    top = rect.top - DOCK_HEIGHT - 6;
  } else {
    placementY = 'below';
    top = rect.bottom + 6;
  }

  const targetLeft = align === 'right' ? rect.right - DOCK_WIDTH : rect.left;
  const left = Math.max(PADDING, Math.min(targetLeft, vWidth - DOCK_WIDTH - PADDING));

  const triggerCenterX = rect.left + rect.width / 2;
  const relX = Math.round(((triggerCenterX - left) / DOCK_WIDTH) * 100);
  const clampedX = Math.max(10, Math.min(90, relX));
  const transformOrigin = placementY === 'above' ? `${clampedX}% 100%` : `${clampedX}% 0%`;

  return { top, left, placementY, transformOrigin };
}

export interface MessageReactionPickerProps {
  onPick: (emoji: string, origin?: { x: number; y: number }) => void;
  onClose: () => void;
  align?: 'left' | 'right';
  anchorEl?: HTMLElement | null;
  initialExpanded?: boolean;
}

export default function MessageReactionPicker({
  onPick,
  onClose,
  align = 'left',
  anchorEl,
  initialExpanded = false,
}: MessageReactionPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpen, setIsOpen] = useState(isTestEnv);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (!isTestEnv) {
      const frame = requestAnimationFrame(() => {
        setIsOpen(true);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  const [pos, setPos] = useState<DockPosition>(() =>
    calculateDockPosition(anchorEl ?? null, align),
  );

  const updatePosition = useCallback(() => {
    if (isClosingRef.current) return;
    const next = calculateDockPosition(anchorEl ?? null, align);
    setPos((prev) => {
      if (
        prev.top === next.top &&
        prev.left === next.left &&
        prev.placementY === next.placementY &&
        prev.transformOrigin === next.transformOrigin
      ) {
        return prev;
      }
      return next;
    });
  }, [anchorEl, align]);

  useEffect(() => {
    updatePosition();
    const handleScroll = (e: Event) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) {
        return;
      }
      updatePosition();
    };

    window.addEventListener('resize', updatePosition, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [updatePosition]);

  const requestClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    const delay = isTestEnv ? 0 : 180;
    if (delay === 0) {
      onClose();
    } else {
      setTimeout(() => {
        onClose();
      }, delay);
    }
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        requestClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [requestClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [requestClose]);

  const handlePick = (emoji: string, origin?: { x: number; y: number }) => {
    if (isTestEnv) {
      onPick(emoji, origin);
      onClose();
    } else {
      isClosingRef.current = true;
      setIsClosing(true);
      setTimeout(() => {
        onPick(emoji, origin);
        onClose();
      }, 180);
    }
  };

  const isPortaled = Boolean(anchorEl && typeof document !== 'undefined');

  if (isExpanded) {
    return (
      <ExpandedReactionPicker
        anchorEl={anchorEl || containerRef.current}
        align={align}
        onPick={(emoji, origin) => handlePick(emoji, origin)}
        onClose={() => {
          setIsExpanded(false);
          requestClose();
        }}
      />
    );
  }

  const dockNode = (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Reaction Dock"
      style={
        isPortaled
          ? {
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              zIndex: 99998,
              transformOrigin: pos.transformOrigin,
              transform: isClosing
                ? `scale(0.85) translateY(${pos.placementY === 'above' ? '4px' : '-4px'}) translateZ(0)`
                : isOpen
                  ? 'scale(1) translateY(0) translateZ(0)'
                  : `scale(0.85) translateY(${pos.placementY === 'above' ? '6px' : '-6px'}) translateZ(0)`,
              opacity: isClosing ? 0 : isOpen ? 1 : 0,
              transition: isClosing
                ? 'transform 180ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease-in'
                : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: isClosing || !isOpen ? 'none' : 'auto',
              contain: 'paint layout',
              willChange: isClosing ? 'transform, opacity' : 'auto',
            }
          : undefined
      }
      className={`${
        isPortaled
          ? ''
          : `absolute bottom-full mb-2 z-50 ${align === 'right' ? 'right-0' : 'left-0'}`
      }`}
    >
      <MessageReactionDock
        className={!isPortaled ? 'animate-popIn' : ''}
        onPick={handlePick}
        onExpand={() => setIsExpanded(true)}
      />
    </div>
  );

  if (isPortaled) {
    return createPortal(dockNode, document.body);
  }

  return dockNode;
}
