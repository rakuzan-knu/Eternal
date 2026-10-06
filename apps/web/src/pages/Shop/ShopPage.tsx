import { ProfileFrameShopSection } from './ui/ProfileFrameShopSection';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AvatarDecorationDto } from '@social-network/shared-contracts';
import { Search, Store } from 'lucide-react';
import MessengerSidebar from '@/widgets/sidebar/ui/RailwaySidebar';
import { useUIStore } from '@/shared/model/useUIStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { SEOHead } from '@/shared/seo';
import { useDecorations } from './model/useDecorations';
import { ShopItemCard } from './ui/ShopItemCard';
import { ShopItemModal } from './ui/ShopItemModal';
import { ProfileEffectShopSection } from './ui/ProfileEffectShopSection';
import { NameplateShopSection } from './ui/NameplateShopSection';

export default function ShopPage() {
  const expanded = useUIStore((s) => s.isSidebarExpanded);
  const [params, setParams] = useSearchParams();
  const category = ['nameplates', 'profile-effects', 'profile-frames'].includes(
    params.get('category') ?? '',
  )
    ? params.get('category')!
    : 'avatars';
  const isNameplates = category === 'nameplates';
  const isFrames = category === 'profile-frames';
  const isEffects = category === 'profile-effects';
  const { data: user } = useCurrentUser();
  const { catalog, inventory, equip } = useDecorations();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AvatarDecorationDto | null>(null);
  const items = (catalog.data ?? []).filter((item) =>
    (item.name + ' ' + item.slug + ' ' + item.description)
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  const owns = (id: string) => Boolean(inventory.data?.items.some((i) => i.decoration.id === id));
  return (
    <div className="fixed inset-0 flex overflow-hidden text-[var(--app-text-primary)] bg-[var(--app-bg-color)]">
      <SEOHead
        title={
          isFrames
            ? 'Рамки профиля • Eternal'
            : isEffects
              ? 'Эффекты профиля • Eternal'
              : isNameplates
                ? 'Nameplates • Eternal'
                : 'Avatar Decorations • Eternal'
        }
        description={
          isFrames
            ? 'Декоративные рамки вокруг карточки профиля Eternal.'
            : isEffects
              ? 'Объёмные анимированные эффекты для профилей Eternal.'
              : isNameplates
                ? 'Анимированные Nameplates для списков пользователей Eternal.'
                : 'Анимированные украшения аватара Eternal.'
        }
      />
      <MessengerSidebar />
      <main
        className={'flex-1 min-w-0 flex flex-col h-full ' + (expanded ? 'ml-[200px]' : 'ml-16')}
      >
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 sm:px-10 py-5">
          <div className="flex items-center gap-3">
            <Store size={22} />
            <span className="font-bold">Eternal Shop</span>
            <span className="text-sm opacity-60">
              {isFrames
                ? 'Рамки профиля'
                : isEffects
                  ? 'Эффекты профиля'
                  : isNameplates
                    ? 'Nameplates'
                    : 'Avatar Decorations'}
            </span>
          </div>
          {category === 'avatars' && (
            <label className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2">
              <Search size={17} />
              <input
                aria-label="Поиск рамок"
                placeholder="Найти рамку"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent outline-none w-40 sm:w-52 text-sm"
              />
            </label>
          )}
        </header>
        <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-10 pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Категории магазина">
              {[
                ['avatars', 'Рамки аватара'],
                ['nameplates', 'Nameplates'],
                ['profile-effects', 'Эффекты профиля'],
                ['profile-frames', 'Рамки профиля'],
              ].map(([itemCategory, label]) => (
                <button
                  key={itemCategory}
                  type="button"
                  aria-pressed={category === itemCategory}
                  onClick={() => {
                    setSelected(null);
                    setParams((old) => {
                      const next = new URLSearchParams(old);
                      next.set('category', itemCategory!);
                      return next;
                    });
                  }}
                  className={
                    'cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--app-accent-color)] ' +
                    (category === itemCategory
                      ? 'border-[var(--app-accent-color)] bg-[var(--app-accent-color)] text-white'
                      : 'border-white/15 hover:bg-white/10')
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            {isFrames ? (
              <ProfileFrameShopSection />
            ) : isEffects ? (
              <ProfileEffectShopSection />
            ) : isNameplates ? (
              <NameplateShopSection />
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-3xl font-bold tracking-tight">Украшения аватара</h1>
                  <p className="mt-2 text-sm opacity-60">
                    Коллекция украшений · $1.99 за рамку · Продажи пока закрыты
                  </p>
                </div>
                {catalog.isPending && <p role="status">Загружаем коллекцию…</p>}
                {catalog.isError && (
                  <div role="alert">
                    <p>Не удалось загрузить коллекцию.</p>
                    <button className="mt-3 underline" onClick={() => void catalog.refetch()}>
                      Повторить
                    </button>
                  </div>
                )}
                {!catalog.isPending && !catalog.isError && !items.length && (
                  <p>Рамки не найдены.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {items.map((item) => (
                    <ShopItemCard
                      key={item.id}
                      item={item}
                      avatarUrl={user?.avatar}
                      owned={owns(item.id)}
                      active={inventory.data?.activeDecorationId === item.id}
                      onClick={() => {
                        setSelected(item);
                        equip.reset();
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      {selected && (
        <ShopItemModal
          item={selected}
          avatarUrl={user?.avatar}
          owned={owns(selected.id)}
          active={inventory.data?.activeDecorationId === selected.id}
          pending={equip.isPending}
          error={equip.isError || inventory.isError}
          onClose={() => setSelected(null)}
          onEquip={() =>
            equip.mutate(inventory.data?.activeDecorationId === selected.id ? null : selected.id)
          }
        />
      )}
    </div>
  );
}
