import { useEffect, useRef } from 'react';
import type { AvatarDecorationDto } from '@social-network/shared-contracts';
import { X } from 'lucide-react';
import { AvatarWithDecoration } from '@/shared/ui/AvatarDecoration';

export function ShopItemModal({
  item,
  avatarUrl,
  owned,
  active,
  pending,
  error,
  onClose,
  onEquip,
}: {
  item: AvatarDecorationDto;
  avatarUrl?: string | null | undefined;
  owned: boolean;
  active: boolean;
  pending: boolean;
  error: boolean;
  onClose: () => void;
  onEquip: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="decoration-name"
      className="m-auto w-[min(92vw,460px)] rounded-2xl border border-white/15 bg-[var(--app-bg-color,#171923)] text-[var(--app-text-primary,#fff)] p-0 backdrop:bg-black/70"
    >
      <div className="relative p-7">
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10"
        >
          <X size={20} />
        </button>
        <div className="h-72 flex items-center justify-center">
          <AvatarWithDecoration avatarUrl={avatarUrl} decoration={item} size="xl" status="online" />
        </div>
        <h2 id="decoration-name" className="text-2xl font-bold">
          {item.name}
        </h2>
        <p className="mt-3 text-sm opacity-70 leading-relaxed">{item.description}</p>
        <p className="mt-5 text-lg font-bold">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
            item.priceCents / 100,
          )}
        </p>
        <button
          type="button"
          disabled={!owned || pending}
          onClick={onEquip}
          className="w-full mt-5 py-3 rounded-xl font-semibold bg-[var(--app-accent-color,#8b5cf6)] text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending
            ? 'Сохраняем…'
            : owned
              ? active
                ? 'Снять рамку'
                : 'Применить рамку'
              : 'Продажи пока закрыты'}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-sm">
            Не удалось обновить коллекцию. Повтори после восстановления соединения.
          </p>
        )}
      </div>
    </dialog>
  );
}
