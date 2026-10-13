import { Component, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DeferredFeatureProps {
  children: ReactNode;
  label: string;
  onClose: () => void;
  presentation?: 'modal' | 'panel';
}

function FeatureFallback({
  label,
  onClose,
  presentation = 'modal',
  failed = false,
}: Omit<DeferredFeatureProps, 'children'> & { failed?: boolean }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const button = buttonRef.current;
    const overflow = document.body.style.overflow;
    if (presentation === 'modal') document.body.style.overflow = 'hidden';
    button?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current();
      } else if (event.key === 'Tab' && presentation === 'modal') {
        // The fallback has one interactive control; keep keyboard focus inside.
        event.preventDefault();
        button?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (presentation === 'modal') document.body.style.overflow = overflow;
      if (
        previousFocus?.isConnected &&
        (document.activeElement === button || document.activeElement === document.body)
      )
        previousFocus.focus();
    };
  }, [presentation]);
  const content = (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5 text-white shadow-xl">
      <p role={failed ? 'alert' : 'status'} className="flex items-center gap-3 text-sm">
        {!failed && (
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/25 border-t-white motion-reduce:animate-none"
          />
        )}
        {failed ? `Couldn't open ${label}. Please check your connection.` : `Loading ${label}…`}
      </p>
      <button
        ref={buttonRef}
        type="button"
        onClick={onClose}
        className="mt-4 rounded-lg border border-white/20 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {failed ? 'Close' : 'Cancel'}
      </button>
    </div>
  );
  if (presentation === 'panel') return <div className="p-4">{content}</div>;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {content}
    </div>,
    document.body,
  );
}

class FeatureErrorBoundary extends Component<DeferredFeatureProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <FeatureFallback {...this.props} failed /> : this.props.children;
  }
}

/** Loading or failed optional chunks stay local; closing preserves the chat. */
export function DeferredFeatureBoundary(props: DeferredFeatureProps) {
  return (
    <FeatureErrorBoundary {...props}>
      <Suspense fallback={<FeatureFallback {...props} />}>{props.children}</Suspense>
    </FeatureErrorBoundary>
  );
}
