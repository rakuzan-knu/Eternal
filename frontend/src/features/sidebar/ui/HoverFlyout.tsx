import React, { useRef, useState } from 'react';

interface HoverFlyoutProps {
  trigger: (props: { toggle: () => void }) => React.ReactNode;
  children: React.ReactNode;
}

const CLOSE_DELAY = 150;

export function HoverFlyout({ trigger, children }: HoverFlyoutProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      {trigger({ toggle: () => setOpen((v) => !v) })}

      {open && (
        <div
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="absolute left-full top-0 ml-2 w-64 bg-[#16161a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-[60] animate-menuIn origin-top-left"
        >
          {children}
        </div>
      )}
    </div>
  );
}
