import React, { useState, useEffect, useCallback, useRef } from 'react';

interface SidebarScrollbarProps {
  scrollRef: React.RefObject<HTMLElement | null>;
  isSidebarHovered: boolean;
}

export const SidebarScrollbar: React.FC<SidebarScrollbarProps> = ({
  scrollRef,
  isSidebarHovered,
}) => {
  const [canScroll, setCanScroll] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const scrollTargetRef = useRef<HTMLElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartScrollTopRef = useRef(0);
  const thumbHeightRef = useRef(0);

  useEffect(() => {
    scrollTargetRef.current = scrollRef.current;
  }, [scrollRef]);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { clientHeight, scrollHeight, scrollTop } = el;
    const scrollable = scrollHeight > clientHeight + 4;

    if (!scrollable) {
      if (canScroll) setCanScroll(false);
      return;
    }

    if (!canScroll) setCanScroll(true);

    const minThumb = 28;
    const computedHeight = Math.max(minThumb, (clientHeight / scrollHeight) * clientHeight);
    thumbHeightRef.current = computedHeight;

    const maxScroll = scrollHeight - clientHeight;
    const maxThumbTop = clientHeight - computedHeight;
    const computedTop = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;

    if (thumbRef.current) {
      thumbRef.current.style.height = `${computedHeight}px`;
      thumbRef.current.style.transform = `translate3d(0, ${computedTop}px, 0)`;
    }
  }, [scrollRef, canScroll]);

  useEffect(() => {
    update();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(el);
      // Also observe children to react if item list changes height
      Array.from(el.children).forEach((child) => ro?.observe(child));
    }

    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      if (ro) ro.disconnect();
    };
  }, [scrollRef, update]);

  // Handle clicking on the track to scroll
  const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === thumbRef.current) return;
    const el = scrollTargetRef.current;
    const track = trackRef.current;
    if (!el || !track) return;

    const rect = track.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeight = rect.height;
    const ratio = Math.max(0, Math.min(1, clickY / trackHeight));
    const targetScroll = ratio * (el.scrollHeight - el.clientHeight);

    el.scrollTo({ top: targetScroll, behavior: 'smooth' });
  };

  // Handle dragging the scrollbar thumb
  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = scrollTargetRef.current;
    if (!el) return;

    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartScrollTopRef.current = el.scrollTop;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const target = scrollTargetRef.current;
      if (!isDraggingRef.current || !target) return;
      const deltaY = moveEvent.clientY - dragStartYRef.current;
      const { clientHeight, scrollHeight } = target;
      const maxScroll = scrollHeight - clientHeight;
      const maxThumbTop = clientHeight - thumbHeightRef.current;
      if (maxThumbTop > 0) {
        const scrollDelta = (deltaY / maxThumbTop) * maxScroll;
        target.scrollTop = dragStartScrollTopRef.current + scrollDelta;
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!canScroll) return null;

  const isVisible = isSidebarHovered || isDragging;

  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      onMouseDown={handleTrackMouseDown}
      className={`absolute right-1 top-2 bottom-2 w-1.5 z-30 pointer-events-none transition-opacity duration-300 ease-in-out group-hover/sidebar:opacity-100 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        ref={thumbRef}
        onMouseDown={handleThumbMouseDown}
        className="w-1.5 rounded-full bg-black/25 hover:bg-black/45 active:bg-black/60 dark:bg-white/25 dark:hover:bg-white/45 dark:active:bg-white/60 pointer-events-auto cursor-pointer transition-colors duration-150 will-change-transform"
      />
    </div>
  );
};

export default SidebarScrollbar;
