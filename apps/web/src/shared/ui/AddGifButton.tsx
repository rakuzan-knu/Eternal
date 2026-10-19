import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileImage, Search, X } from 'lucide-react';
import { isGifSearchConfigured, searchGifs, type GifResult } from '@/shared/api/giphy';
import { useDebounce } from '@/shared/lib/useDebounce';
import { resolveOverlayLayer } from '@/shared/lib/overlayLayer';
import SkeletonBone from './SkeletonBone';

interface AddGifButtonProps {
  isOpen: boolean;
  disabled?: boolean;
  title?: string;
  onToggle: () => void;
  onGifSelect: (gif: string) => void;
  usePortal?: boolean;
  className?: string;
  buttonClassName?: string;
}

export const AddGifButton: React.FC<AddGifButtonProps> = ({
  isOpen,
  disabled = false,
  title = 'Add GIF',
  onToggle,
  onGifSelect,
  usePortal = false,
  className = '',
  buttonClassName = '',
}) => {
  const [search, setSearch] = useState('');
  const query = useDebounce(search.trim(), 300);
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState({ offset: 0, nextOffset: 0, hasMore: false });
  const [retry, setRetry] = useState(0);
  const configured = isGifSearchConfigured();
  const requestRef = useRef<AbortController | null>(null);
  const loadedQueryRef = useRef('');

  useEffect(() => {
    if (!isOpen || disabled || !configured) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const changed = loadedQueryRef.current !== query;
    const offset = changed ? 0 : page.offset;
    loadedQueryRef.current = query;
    if (changed) {
      setGifs([]);
      setPage({ offset: 0, nextOffset: 0, hasMore: false });
      if (page.offset !== 0) return () => controller.abort();
    }
    setLoading(true);
    setError(false);
    searchGifs(query, offset, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setGifs((previous) =>
          offset === 0
            ? result.gifs
            : [
                ...previous,
                ...result.gifs.filter((gif) => !previous.some((item) => item.id === gif.id)),
              ],
        );
        setPage({ offset, nextOffset: result.nextOffset, hasMore: result.hasMore });
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [isOpen, disabled, configured, query, page.offset, retry]);

  const [direction, setDirection] = useState<'top' | 'bottom'>('top');
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setDirection(rect.top < 280 ? 'bottom' : 'top');
    }
    onToggle();
  };

  useEffect(() => {
    if (!isOpen || !usePortal || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.min(320, window.innerWidth - 24);
      const height = panelRef.current?.offsetHeight || 420;
      const gap = 8;

      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const opensTop = spaceBelow < height + gap && spaceAbove > spaceBelow;

      const preferredLeft = rect.left + rect.width / 2 - width / 2;
      const left = Math.min(window.innerWidth - width - 12, Math.max(12, preferredLeft));
      const top = opensTop
        ? Math.max(12, rect.top - height - gap)
        : Math.max(12, Math.min(window.innerHeight - height - 12, rect.bottom + gap));

      setPortalStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        maxHeight: 'calc(100dvh - 24px)',
        overflowY: 'auto',
        zIndex: resolveOverlayLayer(buttonRef.current, '--eternal-layer-menu', 1000, 10),
      });
    };

    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    if (panelRef.current) observer.observe(panelRef.current);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, usePortal]);

  // Outside click & Escape dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        onToggle();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onToggle();
      }
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onToggle]);

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="GIF picker"
      data-modal-owner={buttonRef.current?.closest<HTMLElement>('[data-modal-id]')?.dataset.modalId}
      className={`shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_40px_rgba(147,51,234,0.2)] bg-[#0e1017]/95 rounded-2xl overflow-hidden border border-white/15 animate-popIn p-3 w-[320px] max-w-[calc(100vw-24px)] backdrop-blur-3xl backdrop-saturate-150 ${
        usePortal
          ? 'z-[99999]'
          : `z-50 absolute right-0 ${direction === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'}`
      }`}
      style={usePortal ? (portalStyle ?? undefined) : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-1 mb-3">
        <span className="text-sm font-semibold text-white">
          {query ? 'Search GIFs' : 'Trending GIFs'}
        </span>
        <button
          type="button"
          aria-label="Close GIF picker"
          onClick={onToggle}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>
      <label className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 mb-3 text-gray-400">
        <Search size={16} />
        <input
          aria-label="Search GIFs"
          placeholder="Search GIFs"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-0 w-full bg-transparent text-sm text-white outline-none"
        />
      </label>
      <div className="max-h-64 min-h-40 overflow-y-auto custom-scrollbar" aria-busy={loading}>
        {!configured ? (
          <p className="px-3 py-8 text-center text-sm text-gray-400">
            GIF search is not available yet.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  aria-label={`Select ${gif.title}`}
                  className="rounded-xl overflow-hidden border border-white/10 hover:border-purple-400 focus-visible:outline-2 focus-visible:outline-purple-400"
                  onClick={() => {
                    onGifSelect(gif.url);
                  }}
                >
                  <img
                    src={gif.previewUrl}
                    alt=""
                    loading="lazy"
                    className="w-full h-24 object-cover"
                  />
                </button>
              ))}
              {loading &&
                Array.from({ length: 6 }, (_, index) => (
                  <SkeletonBone key={`loading-${index}`} className="h-24 w-full rounded-xl" />
                ))}
            </div>
            {loading && (
              <span role="status" className="sr-only">
                Loading GIFs...
              </span>
            )}
            {error ? (
              <div role="alert" className="p-4 text-center text-sm text-gray-300">
                <p>GIFs could not load.</p>
                <button
                  type="button"
                  onClick={() => setRetry((value) => value + 1)}
                  className="mt-2 rounded-lg px-3 py-2 bg-white/10 hover:bg-white/15"
                >
                  Retry GIFs
                </button>
              </div>
            ) : !loading && gifs.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                No GIFs found. Try another search.
              </p>
            ) : null}
            {!loading && !error && page.hasMore && (
              <button
                type="button"
                className="w-full mt-3 py-2 rounded-xl bg-white/5 text-sm text-gray-300 hover:bg-white/10"
                onClick={() =>
                  setPage((previous) => ({ ...previous, offset: previous.nextOffset }))
                }
              >
                Load more GIFs
              </button>
            )}
          </>
        )}
      </div>
      <a
        href="https://giphy.com/"
        target="_blank"
        rel="noreferrer"
        className="block pt-3 text-right text-[10px] font-semibold text-gray-400"
      >
        Powered By GIPHY
      </a>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        title={title}
        aria-haspopup="dialog"
        aria-expanded={isOpen && !disabled}
        className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
          disabled
            ? 'opacity-40 cursor-not-allowed text-gray-500'
            : isOpen
              ? 'bg-purple-500/20 text-purple-300'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
        } ${buttonClassName}`}
      >
        <FileImage size={18} />
      </button>

      {!disabled && isOpen && (usePortal ? createPortal(panel, document.body) : panel)}
    </div>
  );
};
