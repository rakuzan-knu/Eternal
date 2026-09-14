import React, { useState, useRef, useEffect } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, Trash2 } from 'lucide-react';

interface ShowcaseWidgetWrapperProps {
  widgetId: string;
  isOwner: boolean;
  onDelete?: () => void;
  children: React.ReactNode;
}

export const ShowcaseWidgetWrapper: React.FC<ShowcaseWidgetWrapperProps> = ({
  widgetId,
  isOwner,
  onDelete,
  children,
}) => {
  const dragControls = useDragControls();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHandleHovered(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHandleHovered(false);
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        handleRef.current &&
        !handleRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isMenuOpen]);

  if (!isOwner) {
    return <div className="relative w-full">{children}</div>;
  }

  return (
    <Reorder.Item
      value={widgetId}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={() => {
        setIsDragging(true);
        setIsMenuOpen(false);
      }}
      onDragEnd={() => setIsDragging(false)}
      whileDrag={{
        scale: 1.02,
        opacity: 0.88,
        zIndex: 50,
        boxShadow: '0 20px 48px -10px rgba(0, 0, 0, 0.7)',
      }}
      transition={{ duration: 0.15 }}
      className={`relative w-full group/widget ${
        isHandleHovered || isMenuOpen || isDragging ? 'z-30' : 'z-10'
      }`}
    >
      {/* 1. Left Drag Handle & Control Button */}
      <div className="absolute -left-3 sm:-left-4 top-4 z-40">
        <button
          ref={handleRef}
          type="button"
          onPointerDown={(e) => {
            // Drag initiation on pointer hold/drag
            dragControls.start(e);
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen((prev) => !prev);
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`p-1.5 rounded-lg bg-[#18191c] hover:bg-[#2b2d31] text-gray-400 hover:text-white border border-white/[0.12] shadow-xl cursor-grab active:cursor-grabbing transition-all duration-200 before:absolute before:-right-3.5 before:inset-y-0 before:w-4 before:content-[''] ${
            isHandleHovered || isMenuOpen || isDragging
              ? 'opacity-100 scale-105 pointer-events-auto'
              : 'opacity-0 pointer-events-none group-hover/widget:opacity-100 group-hover/widget:pointer-events-auto'
          }`}
          aria-label="Widget controls"
          title=""
        >
          <GripVertical size={14} className="text-gray-300" />
        </button>

        {/* 2. Tooltip on Hover (Matching Screenshot 1) */}
        {isHandleHovered && !isMenuOpen && !isDragging && (
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-16 z-50 pointer-events-none animate-fadeIn"
            style={{ minWidth: '220px' }}
          >
            <div className="relative flex flex-col items-center justify-center p-2 rounded-xl bg-[#111214] border border-white/[0.12] shadow-[0_12px_32px_rgba(0,0,0,0.8)] text-center">
              <span className="text-[11px] font-bold text-gray-100 leading-tight">
                Click and drag to rearrange
              </span>
              <span className="text-[10px] font-medium text-gray-400 leading-tight mt-0.5">
                Click to configure
              </span>
              {/* Tooltip Arrow */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#111214] border-r border-b border-white/[0.12] rotate-45" />
            </div>
          </div>
        )}

        {/* 3. Popover Menu on Click (Matching Screenshot 5) */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            className="absolute left-0 top-10 z-50 animate-scaleIn origin-top-left"
            style={{ minWidth: '180px' }}
          >
            <div className="p-1.5 rounded-xl bg-[#18191c] border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.7)]">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  onDelete?.();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-all cursor-pointer text-left"
              >
                <Trash2 size={14} className="text-rose-400" />
                <span>Remove widget</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Widget Content */}
      <div className="w-full transition-transform">{children}</div>
    </Reorder.Item>
  );
};
