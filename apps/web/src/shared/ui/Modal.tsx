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

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    timerRef.current = setTimeout(onClose, exitDurationMs);
  }, [isClosing, onClose, exitDurationMs]);

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
      onClick={requestClose}
      className={`fixed inset-0 ${zIndex} flex items-center justify-center transition-colors duration-200 ${
        isClosing ? 'bg-black/0' : 'bg-black/60 backdrop-blur-xs'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`transition-all duration-150 ease-in ${
          isClosing
            ? 'opacity-0 scale-95 translate-y-1'
            : 'opacity-100 scale-100 translate-y-0 animate-modalPop'
        } ${className}`}
      >
        {children(requestClose)}
      </div>
    </div>,
    document.body,
  );
}
