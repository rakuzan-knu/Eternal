import type { AvatarDecorationDto, NameplateDto } from '@social-network/shared-contracts';
import { AvatarWithDecoration } from '@/shared/ui/AvatarDecoration';
import { Nameplate } from '@/shared/ui/Nameplate';

export function NameplatePreview({
  item,
  avatarUrl,
  decoration,
  name = 'Ваше имя',
}: {
  item: NameplateDto;
  avatarUrl?: string | null | undefined;
  decoration?: AvatarDecorationDto | null | undefined;
  name?: string | undefined;
}) {
  return (
    <div className="rounded-2xl bg-black/35 p-4 space-y-2" aria-label="Пример строки пользователя">
      {[0, 1, 2].map((row) =>
        row === 1 ? (
          <div key={row} className="nameplate-row rounded-xl flex items-center gap-3 h-14 px-3">
            <Nameplate nameplate={item} alwaysPlay={true} />
            <AvatarWithDecoration avatarUrl={avatarUrl} decoration={decoration} size="sm" />
            <span
              data-nameplate-label
              data-nameplate-text
              className="font-semibold text-sm truncate"
            >
              {name}
            </span>
          </div>
        ) : (
          <div key={row} aria-hidden="true" className="flex items-center gap-3 h-8 px-3 opacity-20">
            <span className="rounded-full bg-white/30 h-7 w-7 shrink-0" />
            <span className="rounded-full bg-white/25 h-2 w-28" />
          </div>
        ),
      )}
    </div>
  );
}
