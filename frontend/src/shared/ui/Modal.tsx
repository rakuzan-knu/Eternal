import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  onClose: () => void;
  children: (requestClose: () => void) => React.ReactNode;
  className?: string;
  exitDurationMs?: number;
}

export default function Modal({
  onClose,
  children,
  className = '',
  exitDurationMs = 180,
}: ModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onClose, exitDurationMs);
  }, [isClosing, onClose, exitDurationMs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  return createPortal(
    <div
      onClick={requestClose}
      className={`fixed inset-0 z-[300] flex items-center justify-center transition-colors duration-200 ${
        isClosing ? 'bg-black/0' : 'bg-black/60'
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
