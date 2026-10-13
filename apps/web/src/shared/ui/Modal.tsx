import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  onClose: () => void;
  children: (requestClose: () => void) => React.ReactNode;
  className?: string;
  zIndex?: string;
  exitDurationMs?: number;
  closeOnInputEscape?: boolean;
}

export default function Modal({
  onClose,
  children,
  className = '',
  zIndex = 'z-[100000]',
  exitDurationMs = 180,
  closeOnInputEscape = false,
}: ModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingRef = useRef(false);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    timerRef.current = setTimeout(onClose, reduced ? 0 : exitDurationMs);
  }, [onClose, exitDurationMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const target = e.target as HTMLElement | null;
        if (
          !closeOnInputEscape &&
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
        ) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [requestClose, closeOnInputEscape]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      data-modal-open="true"
      data-submodal-open="true"
      data-phase={isClosing ? 'closing' : 'open'}
      onClick={requestClose}
      style={{ '--overlay-exit-duration': `${exitDurationMs}ms` } as React.CSSProperties}
      className={`modal-motion-overlay fixed inset-0 ${zIndex} flex items-center justify-center bg-black/60`}
    >
      <div onClick={(e) => e.stopPropagation()} className={`modal-motion-surface ${className}`}>
        {children(requestClose)}
      </div>
    </div>,
    document.body,
  );
}
