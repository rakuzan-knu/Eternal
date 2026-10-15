import { DecorationShopDialog } from '@/shared/ui/DecorationShopDialog';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Check } from 'lucide-react';
import type { ProfileFrameDto } from '@social-network/shared-contracts';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useProfileFrames } from '../model/useProfileFrames';
import { ProfileFramePreview } from './ProfileFramePreview';

const focus =
  'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--app-accent-color)]';
const price = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const familyOrder = { dragon: 0, rose: 1, blade: 2, crystal: 3, celestial: 4, cat: 5, racing: 6 };

export function ProfileFrameShopSection() {
  const { catalog, inventory, equip } = useProfileFrames();
  const { data: user } = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const search = params.get('frame-search') ?? '';
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [selected, select] = useState<ProfileFrameDto | null>(null);
  const owns = (id: string) => Boolean(inventory.data?.items.some((i) => i.profileFrame.id === id));
  const items = (catalog.data ?? [])
    .filter((item) =>
      `${item.name} ${item.slug}`.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => familyOrder[a.family] - familyOrder[b.family]);
  const setSearch = (value: string) =>
    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        if (value) next.set('frame-search', value);
        else next.delete('frame-search');
        return next;
      },
      { replace: true },
    );
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile Frames</h1>
          <p className="mt-2 text-sm opacity-70">Decorative frames around your profile card.</p>
          <p className="mt-2 text-sm opacity-60">$1.99 per item · Sales closed for now</p>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2">
          <Search size={17} aria-hidden="true" />
          <input
            ref={input}
            aria-label="Search profile frames"
            placeholder="Find frame"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none w-40 text-sm"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear frame search"
              className={focus + ' rounded p-1 hover:bg-white/10'}
              onClick={() => {
                setSearch('');
                input.current?.focus();
              }}
            >
              <X size={16} />
            </button>
          )}
        </label>
      </div>
      {catalog.isPending && <p role="status">Loading frames…</p>}
      {catalog.isError && (
        <div role="alert">
          <p>Failed to load frames.</p>
          <button className={focus + ' mt-3 underline'} onClick={() => void catalog.refetch()}>
            Retry
          </button>
        </div>
      )}
      {inventory.isError && (
        <div role="alert" className="mb-4 text-sm">
          <p>Failed to verify your collection.</p>
          <button className={focus + ' underline'} onClick={() => void inventory.refetch()}>
            Retry loading collection
          </button>
        </div>
      )}
      {!catalog.isPending && !catalog.isError && !items.length && (
        <p role="status">No frames found.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Open ${item.name} frame`}
            onClick={(event) => {
              opener.current = event.currentTarget;
              select(item);
              equip.reset();
            }}
            className={
              focus +
              ' rounded-2xl border border-white/15 bg-white/[.025] p-4 text-left hover:border-white/35 hover:bg-white/[.04] transition-colors'
            }
          >
            <div className="max-w-[180px] mx-auto">
              <ProfileFramePreview
                item={item}
                avatarUrl={user?.avatar}
                decoration={user?.activeDecoration}
                name={user?.displayName ?? user?.username}
              />
            </div>
            <div className="flex items-center justify-between gap-2 mt-5">
              <h2 className="font-bold text-lg">{item.name}</h2>
              {inventory.data?.activeProfileFrameId === item.id ? (
                <Check size={18} aria-label="Equipped" />
              ) : owns(item.id) ? (
                <span className="text-xs opacity-60">Owned</span>
              ) : null}
            </div>
            <p className="font-semibold mt-5">{price(item.priceCents)}</p>
          </button>
        ))}
      </div>
      {selected && (
        <ProfileFrameDialog
          opener={opener.current}
          item={selected}
          owned={owns(selected.id)}
          active={inventory.data?.activeProfileFrameId === selected.id}
          pending={equip.isPending}
          error={equip.isError}
          saved={equip.isSuccess}
          onClose={() => select(null)}
          onEquip={() =>
            equip.mutate(inventory.data?.activeProfileFrameId === selected.id ? null : selected.id)
          }
        />
      )}
    </>
  );
}

function ProfileFrameDialog({
  opener,
  item,
  owned,
  active,
  pending,
  error,
  saved,
  onClose,
  onEquip,
}: {
  opener: HTMLButtonElement | null;
  item: ProfileFrameDto;
  owned: boolean;
  active: boolean;
  pending: boolean;
  error: boolean;
  saved: boolean;
  onClose: () => void;
  onEquip: () => void;
}) {
  const { data: user } = useCurrentUser();
  return (
    <DecorationShopDialog
      title={item.name}
      titleId="profile-frame-title"
      opener={opener}
      onClose={onClose}
      closeLabel="Close frame"
    >
      <div className="grid gap-6 sm:grid-cols-[220px_minmax(0,1fr)] items-center">
        <div className="w-[180px] sm:w-full mx-auto">
          <ProfileFramePreview
            priority
            item={item}
            avatarUrl={user?.avatar}
            decoration={user?.activeDecoration}
            name={user?.displayName ?? user?.username}
          />
        </div>
        <div className="min-w-0">
          <p className="mt-5 text-lg font-bold">{price(item.priceCents)}</p>
          <button
            type="button"
            disabled={!owned || pending}
            aria-busy={pending}
            onClick={onEquip}
            className={
              focus +
              ' w-full mt-5 py-3 rounded-xl font-semibold bg-[var(--app-accent-color)] text-white disabled:opacity-40 disabled:cursor-not-allowed'
            }
          >
            {pending
              ? 'Saving…'
              : owned
                ? active
                  ? 'Unequip frame'
                  : 'Equip frame'
                : 'Sales closed for now'}
          </button>
          <div className="min-h-6 mt-3 text-sm">
            {error ? (
              <p role="alert">Failed to save. Please try again.</p>
            ) : saved ? (
              <p role="status">{active ? 'Frame equipped.' : 'Frame unequipped.'}</p>
            ) : null}
          </div>
        </div>
      </div>
    </DecorationShopDialog>
  );
}
