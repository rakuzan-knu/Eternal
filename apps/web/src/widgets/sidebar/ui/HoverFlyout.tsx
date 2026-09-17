import React, { useRef, useState } from 'react';

interface HoverFlyoutProps {
  trigger: (props: { toggle: () => void }) => React.ReactNode;
  children: React.ReactNode;
  align?: 'top' | 'bottom' | 'auto';
}

const CLOSE_DELAY = 150;

export function HoverFlyout({ trigger, children, align = 'auto' }: HoverFlyoutProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [placement, setPlacement] = useState<'top' | 'bottom'>(
    align === 'bottom' ? 'bottom' : 'top',
  );

  const checkPlacement = () => {
    if (align === 'bottom') {
      setPlacement('bottom');
      return;
    }
    if (align === 'top') {
      setPlacement('top');
      return;
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // If there's less than 280px below the element, open upwards
      if (window.innerHeight - rect.top < 280) {
        setPlacement('bottom');
      } else {
        setPlacement('top');
      }
    }
  };

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  const handleMouseEnter = () => {
    cancelClose();
    checkPlacement();
    setOpen(true);
  };

  const handleToggle = () => {
    checkPlacement();
    setOpen((v) => !v);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={scheduleClose}
    >
      {trigger({ toggle: handleToggle })}

      {open && (
        <div
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className={`absolute left-full ml-2 w-64 bg-[#16161a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-[60] animate-menuIn ${
            placement === 'bottom' ? 'bottom-0 origin-bottom-left' : 'top-0 origin-top-left'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
