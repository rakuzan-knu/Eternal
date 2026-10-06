import type { AvatarDecorationDto } from '@social-network/shared-contracts';
import { AvatarWithDecoration } from '@/shared/ui/AvatarDecoration';

export function ShopItemCard({
  item,
  avatarUrl,
  owned,
  active,
  onClick,
}: {
  item: AvatarDecorationDto;
  avatarUrl?: string | null | undefined;
  owned: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={'Открыть ' + item.name}
      className="group text-left overflow-visible rounded-2xl border border-white/10 bg-black/15 hover:border-white/30 focus-visible:outline-2 focus-visible:outline-offset-4 transition-colors"
    >
      <div className="h-72 flex items-center justify-center rounded-t-2xl bg-black/15">
        <AvatarWithDecoration avatarUrl={avatarUrl} decoration={item} size="xl" />
      </div>
      <div className="px-5 pb-5 pt-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{item.name}</h2>
          <span className="text-xs opacity-70">
            {active ? 'На аватаре' : owned ? 'В коллекции' : 'Скоро'}
          </span>
        </div>
        <p className="text-sm opacity-70 mt-2 min-h-16">{item.description}</p>
        <p className="font-bold mt-3">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
            item.priceCents / 100,
          )}
        </p>
      </div>
    </button>
  );
}
