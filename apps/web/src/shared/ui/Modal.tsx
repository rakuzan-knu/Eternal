import { shouldReduceMotion } from '@/shared/model/useVisualEffects';
import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useId,
  useState,
  useCallback,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { resolveOverlayLayer } from '@/shared/lib/overlayLayer';

interface ModalProps {
  onClose: () => void;
  /** Return false to keep the dialog open before its exit animation starts. */
  onBeforeClose?: () => boolean;
  children: (requestClose: () => void) => React.ReactNode;
  className?: string;
  zIndex?: string;
  exitDurationMs?: number;
  closeOnInputEscape?: boolean;
  dismissible?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

const ModalDepth = createContext(0);
const modalStack: { element: HTMLDivElement; depth: number }[] = [];
let previousBodyOverflow = '';
const focusableSelector =
  'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
const focusableElementsIn = (surface: HTMLElement) =>
  Array.from(surface.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
    if (element.tabIndex < 0 || element.closest('[hidden], [inert], [aria-hidden="true"]'))
      return false;
    for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    return true;
  });
const topModal = () =>
  modalStack.reduce<(typeof modalStack)[number] | undefined>(
    (top, modal) => (!top || modal.depth >= top.depth ? modal : top),
    undefined,
  );

export default function Modal({
  onClose,
  onBeforeClose,
  children,
  className = '',
  zIndex,
  exitDurationMs = 180,
  closeOnInputEscape = false,
  dismissible = true,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: ModalProps) {
  const depth = useContext(ModalDepth);
  const id = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  // Capture before commit: React autoFocus may focus a child before layout effects run.
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  const [baseLayer] = useState(() => resolveOverlayLayer(opener, '--eternal-layer-modal', 300));
  const closingRef = useRef(false);
  const [hasChildDialog, setHasChildDialog] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestClose = useCallback(() => {
    if (closingRef.current || !dismissible) return;
    if (onBeforeClose && !onBeforeClose()) return;
    closingRef.current = true;
    setIsClosing(true);
    const reduced = shouldReduceMotion();
    timerRef.current = setTimeout(onClose, reduced ? 0 : exitDurationMs);
  }, [onClose, onBeforeClose, exitDurationMs, dismissible]);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    // Existing callers may supply their own dialog. Keep a single semantic dialog.
    const childDialog = content.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]');
    const dialog = childDialog ?? content;
    setHasChildDialog(Boolean(childDialog));
    const originalAttributes = [
      'aria-modal',
      'aria-label',
      'aria-labelledby',
      'aria-describedby',
      'tabindex',
    ].map((name) => [name, dialog.getAttribute(name)] as const);
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('tabindex', '-1');
    const heading = dialog.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6');
    const generatedHeadingId = heading && !heading.id ? `${id}-title` : undefined;
    if (heading && generatedHeadingId) heading.id = generatedHeadingId;
    if (ariaLabel) dialog.setAttribute('aria-label', ariaLabel);
    if (ariaLabel && !ariaLabelledBy) dialog.removeAttribute('aria-labelledby');
    if (ariaLabelledBy) dialog.setAttribute('aria-labelledby', ariaLabelledBy);
    else if (
      !ariaLabel &&
      !dialog.hasAttribute('aria-label') &&
      !dialog.hasAttribute('aria-labelledby')
    ) {
      if (heading) dialog.setAttribute('aria-labelledby', heading.id);
      else dialog.setAttribute('aria-label', 'Dialog');
    }
    if (ariaDescribedBy) dialog.setAttribute('aria-describedby', ariaDescribedBy);
    return () => {
      for (const [name, originalValue] of originalAttributes) {
        if (originalValue === null) dialog.removeAttribute(name);
        else dialog.setAttribute(name, originalValue);
      }
      if (heading && generatedHeadingId && heading.id === generatedHeadingId)
        heading.removeAttribute('id');
    };
  }, [id, ariaLabel, ariaLabelledBy, ariaDescribedBy]);

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    if (modalStack.length === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    const entry = { element, depth };
    modalStack.push(entry);
    if (topModal() === entry && !element.contains(document.activeElement)) {
      const focusable = focusableElementsIn(element);
      const initialFocus =
        focusable.find((candidate) => candidate.hasAttribute('autofocus')) ?? focusable[0];
      (initialFocus ?? element).focus();
    }
    return () => {
      const wasTop = topModal() === entry;
      modalStack.splice(modalStack.indexOf(entry), 1);
      if (modalStack.length === 0) document.body.style.overflow = previousBodyOverflow;
      if (wasTop && opener?.isConnected) opener.focus();
    };
  }, [depth, opener]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const ownedPortals = () =>
      Array.from(document.querySelectorAll<HTMLElement>('[data-modal-owner]')).filter(
        (element) => element.dataset.modalOwner === id,
      );
    const isInside = (target: Node) =>
      content.contains(target) || ownedPortals().some((portal) => portal.contains(target));
    const focusableElements = () => [content, ...ownedPortals()].flatMap(focusableElementsIn);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (topModal()?.element !== content || e.defaultPrevented) return;
      if (e.key === 'Escape') {
        const target = e.target as HTMLElement | null;
        if (
          !closeOnInputEscape &&
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
        )
          return;
        e.preventDefault();
        requestClose();
      }
      if (e.key === 'Tab') {
        const elements = focusableElements();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (!first) {
          e.preventDefault();
          content.focus();
        } else if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === content ||
            !isInside(document.activeElement ?? document.body))
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || !isInside(document.activeElement ?? document.body))
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const handleFocus = (e: FocusEvent) => {
      // A new portaled dialog can receive React autoFocus before its layout effect registers it.
      const targetModal =
        e.target instanceof HTMLElement ? e.target.closest<HTMLElement>('[data-modal-id]') : null;
      if (targetModal && !modalStack.some((entry) => entry.element === targetModal)) return;
      if (topModal()?.element === content && e.target instanceof Node && !isInside(e.target)) {
        (focusableElements()[0] ?? content).focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocus);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocus);
    };
  }, [requestClose, id, closeOnInputEscape]);

  return createPortal(
    <div
      data-modal-open="true"
      data-submodal-open="true"
      data-phase={isClosing ? 'closing' : 'open'}
      onClick={requestClose}
      style={
        {
          zIndex: zIndex ? undefined : baseLayer + depth,
          '--overlay-exit-duration': `${exitDurationMs}ms`,
        } as React.CSSProperties
      }
      className={`modal-motion-overlay fixed inset-0 flex items-center justify-center bg-black/60 ${zIndex ?? ''}`}
    >
      <div
        ref={contentRef}
        data-modal-id={id}
        role={hasChildDialog ? undefined : 'dialog'}
        aria-modal={hasChildDialog ? undefined : true}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`modal-motion-surface ${className}`}
      >
        <ModalDepth.Provider value={depth + 1}>{children(requestClose)}</ModalDepth.Provider>
      </div>
    </div>,
    document.body,
  );
}
