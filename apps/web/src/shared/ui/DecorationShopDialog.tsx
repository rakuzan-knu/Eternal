import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Native focus isolation, Escape, backdrop close and exact opener restoration. */
export function DecorationShopDialog({
  title,
  titleId,
  opener,
  onClose,
  children,
  closeLabel,
}: {
  title: string;
  titleId: string;
  opener: HTMLButtonElement | null;
  onClose: () => void;
  children: ReactNode;
  closeLabel: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => {
      node?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [opener]);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[min(94vw,760px)] max-h-[90dvh] overflow-y-auto rounded-2xl border border-white/15 bg-[var(--app-bg-color)] text-[var(--app-text-primary)] p-0 backdrop:bg-black/70"
    >
      <div className="p-6 sm:p-7">
        <div className="flex justify-between items-center gap-4 mb-6">
          <h2 id={titleId} className="text-2xl font-bold">
            {title}
          </h2>
          <button
            type="button"
            autoFocus
            aria-label={closeLabel}
            onClick={onClose}
            className="cursor-pointer rounded-full p-2 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--app-accent-color)]"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
