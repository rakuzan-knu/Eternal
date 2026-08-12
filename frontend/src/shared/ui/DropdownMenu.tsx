import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface DropdownMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  badge?: number;
  hasSubmenu?: boolean;
  divider?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  onClose: () => void;
  align?: 'left' | 'right';
  className?: string;
}

const EXIT_DURATION_MS = 120;

export default function DropdownMenu({
  items,
  onClose,
  align = 'left',
  className = '',
}: DropdownMenuProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onClose, EXIT_DURATION_MS);
  }, [isClosing, onClose]);

  useLayoutEffect(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 8;
    setCoords(
      align === 'right'
        ? { top: rect.bottom + gap, right: window.innerWidth - rect.right }
        : { top: rect.bottom + gap, left: rect.left },
    );
  }, [align]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) requestClose();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') requestClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [requestClose]);

  const isVisible = mounted && !isClosing;

  return (
    <>
      <span ref={anchorRef} className="absolute inset-0 pointer-events-none" aria-hidden />
      {coords &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: coords.top, left: coords.left, right: coords.right }}
            className={`z-[1000] min-w-[260px] rounded-2xl bg-[#1c1c20] border border-white/10 shadow-[0_12px_40px_0_rgba(0,0,0,0.6)] py-2 origin-top transition-all duration-150 ${
              isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            } ${className}`}
          >
            {items.map((item) => (
              <React.Fragment key={item.key}>
                {item.divider && <div className="h-px bg-white/10 my-2 mx-2" />}
                <button
                  onClick={() => {
                    item.onClick?.();
                    requestClose();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium transition-colors duration-100 active:scale-[0.98] ${
                    item.danger
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-gray-200 hover:bg-white/5'
                  }`}
                >
                  {item.icon && (
                    <span className="flex-shrink-0 w-[18px] h-[18px] flex items-center justify-center">
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white text-black text-[11px] font-bold">
                      {item.badge}
                    </span>
                  )}
                  {item.hasSubmenu && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-500"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  )}
                </button>
              </React.Fragment>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
