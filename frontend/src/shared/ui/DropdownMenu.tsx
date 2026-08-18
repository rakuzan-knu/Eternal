import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Check } from 'lucide-react';

export interface DropdownMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  badge?: number | string;
  hasSubmenu?: boolean;
  submenuItems?: DropdownMenuItem[];
  divider?: boolean;
  checked?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  onClose: () => void;
  align?: 'left' | 'right';
  className?: string;
}

const EXIT_DURATION_MS = 120;
const SUBMENU_CLOSE_DELAY_MS = 200;
const SUBMENU_MIN_WIDTH = 220;

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

  // Submenu state
  const [activeSubmenuKey, setActiveSubmenuKey] = useState<string | null>(null);
  const [submenuCoords, setSubmenuCoords] = useState<{
    top: number;
    left?: number;
    right?: number;
  } | null>(null);
  const submenuCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onClose, EXIT_DURATION_MS);
  }, [isClosing, onClose]);

  useLayoutEffect(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 8;
    const estimatedHeight = Math.min(items.length * 42 + 24, 380);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top: number;
    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      // Flip upwards!
      top = Math.max(10, rect.top - estimatedHeight - gap);
    } else {
      // Downwards, constrained within viewport
      top = Math.max(10, Math.min(rect.bottom + gap, window.innerHeight - estimatedHeight - 12));
    }

    const estimatedWidth = 240;
    const spaceRight = window.innerWidth - rect.left;
    const shouldAlignRight = align === 'right' || spaceRight < estimatedWidth + 20;

    setCoords(
      shouldAlignRight
        ? {
            top,
            right: Math.max(
              12,
              window.innerWidth - (align === 'right' ? rect.right : rect.left + rect.width),
            ),
          }
        : { top, left: Math.max(12, rect.left) },
    );
  }, [align, items.length]);

  useLayoutEffect(() => {
    if (menuRef.current && coords) {
      const menuHeight = menuRef.current.offsetHeight;
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) {
        const gap = 8;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
          const upwardTop = Math.max(10, rect.top - menuHeight - gap);
          if (Math.abs(upwardTop - coords.top) > 4) {
            setCoords((prev) => (prev ? { ...prev, top: upwardTop } : prev));
          }
        } else {
          const downwardTop = Math.max(
            10,
            Math.min(rect.bottom + gap, window.innerHeight - menuHeight - 12),
          );
          if (Math.abs(downwardTop - coords.top) > 4) {
            setCoords((prev) => (prev ? { ...prev, top: downwardTop } : prev));
          }
        }
      }
    }
  }, [mounted, items.length]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        requestClose();
      }
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

  const cancelSubmenuClose = useCallback(() => {
    if (submenuCloseTimerRef.current) {
      clearTimeout(submenuCloseTimerRef.current);
      submenuCloseTimerRef.current = null;
    }
  }, []);

  const scheduleSubmenuClose = useCallback(() => {
    cancelSubmenuClose();
    submenuCloseTimerRef.current = setTimeout(() => {
      setActiveSubmenuKey(null);
      setSubmenuCoords(null);
    }, SUBMENU_CLOSE_DELAY_MS);
  }, [cancelSubmenuClose]);

  const openSubmenu = useCallback(
    (itemKey: string) => {
      cancelSubmenuClose();
      const btn = itemRefs.current.get(itemKey);
      if (!btn) return;
      const rect = btn.getBoundingClientRect();

      // Check if enough space on the right, otherwise flip to left
      const spaceOnRight = window.innerWidth - rect.right;
      const shouldFlipToLeft = spaceOnRight < SUBMENU_MIN_WIDTH + 20;

      const subItemsCount = items.find((i) => i.key === itemKey)?.submenuItems?.length || 4;
      const subHeight = subItemsCount * 42 + 20;
      const top = Math.max(10, Math.min(rect.top - 4, window.innerHeight - subHeight - 12));

      if (shouldFlipToLeft) {
        setSubmenuCoords({
          top,
          right: Math.max(10, window.innerWidth - rect.left + 4),
        });
      } else {
        setSubmenuCoords({
          top,
          left: Math.max(10, rect.right + 4),
        });
      }
      setActiveSubmenuKey(itemKey);
    },
    [cancelSubmenuClose, items],
  );

  const activeItem = items.find((i) => i.key === activeSubmenuKey);
  const activeSubmenuItems = activeItem?.submenuItems;

  const isVisible = mounted && !isClosing;

  return (
    <>
      <span ref={anchorRef} className="absolute inset-0 pointer-events-none" aria-hidden />
      {coords &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: coords.top, left: coords.left, right: coords.right }}
            className={`z-[1000] min-w-[240px] rounded-2xl bg-[#16181f]/95 backdrop-blur-2xl border border-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.75)] py-1.5 origin-top transition-all duration-150 ${
              isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            } ${className}`}
          >
            {items.map((item) => {
              const hasSubmenu = Boolean(
                item.hasSubmenu || (item.submenuItems && item.submenuItems.length > 0),
              );
              const isSubmenuActive = activeSubmenuKey === item.key;

              return (
                <React.Fragment key={item.key}>
                  {item.divider && <div className="h-px bg-white/10 my-1.5 mx-2" />}
                  <button
                    ref={(el) => {
                      if (el) itemRefs.current.set(item.key, el);
                      else itemRefs.current.delete(item.key);
                    }}
                    onMouseEnter={() => {
                      if (hasSubmenu) {
                        openSubmenu(item.key);
                      } else {
                        scheduleSubmenuClose();
                      }
                    }}
                    onMouseLeave={() => {
                      if (hasSubmenu) {
                        scheduleSubmenuClose();
                      }
                    }}
                    onClick={() => {
                      if (hasSubmenu) {
                        openSubmenu(item.key);
                      } else {
                        item.onClick?.();
                        requestClose();
                      }
                    }}
                    className={`w-[calc(100%-8px)] mx-1 flex items-center gap-3 px-3 py-2 text-[13.5px] font-medium rounded-xl transition-all duration-100 active:scale-[0.98] ${
                      item.danger
                        ? 'text-red-400 hover:bg-red-500/15 hover:text-red-300'
                        : isSubmenuActive
                          ? 'bg-white/10 text-white'
                          : 'text-gray-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.icon && (
                      <span className="flex-shrink-0 w-[18px] h-[18px] flex items-center justify-center text-gray-400 group-hover:text-white">
                        {item.icon}
                      </span>
                    )}
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white text-black text-[11px] font-bold">
                        {item.badge}
                      </span>
                    )}
                    {item.checked && (
                      <span className="text-sky-400 flex-shrink-0">
                        <Check size={16} />
                      </span>
                    )}
                    {hasSubmenu && (
                      <ChevronRight
                        size={15}
                        className={`transition-transform duration-100 flex-shrink-0 ${
                          isSubmenuActive ? 'text-white translate-x-0.5' : 'text-gray-400'
                        }`}
                      />
                    )}
                  </button>
                </React.Fragment>
              );
            })}

            {/* Nested Submenu */}
            {activeSubmenuItems && activeSubmenuItems.length > 0 && submenuCoords && (
              <div
                style={{
                  position: 'fixed',
                  top: submenuCoords.top,
                  left: submenuCoords.left,
                  right: submenuCoords.right,
                }}
                onMouseEnter={cancelSubmenuClose}
                onMouseLeave={scheduleSubmenuClose}
                className="z-[1010] min-w-[210px] rounded-2xl bg-[#16181f]/95 backdrop-blur-2xl border border-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.8)] py-1.5 animate-fadeIn"
              >
                {activeSubmenuItems.map((subItem) => (
                  <React.Fragment key={subItem.key}>
                    {subItem.divider && <div className="h-px bg-white/10 my-1.5 mx-2" />}
                    <button
                      onClick={() => {
                        subItem.onClick?.();
                        requestClose();
                      }}
                      className={`w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-xl transition-all duration-100 active:scale-[0.98] ${
                        subItem.danger
                          ? 'text-red-400 hover:bg-red-500/15 hover:text-red-300'
                          : 'text-gray-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {subItem.icon && (
                        <span className="flex-shrink-0 w-[17px] h-[17px] flex items-center justify-center text-gray-400">
                          {subItem.icon}
                        </span>
                      )}
                      <span className="flex-1 text-left truncate">{subItem.label}</span>
                      {subItem.checked && (
                        <span className="text-sky-400 flex-shrink-0">
                          <Check size={15} />
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
