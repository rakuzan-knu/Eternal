import type { AvatarDecorationDto, ProfileEffectDto } from '@social-network/shared-contracts';
import Avatar from '@/shared/ui/Avatar';
import { ProfileEffect } from '@/shared/ui/ProfileEffect';

export function ProfileEffectPreview({
  item,
  avatarUrl,
  decoration,
  name = 'Your profile',
  priority = false,
  compact = false,
}: {
  item: ProfileEffectDto;
  avatarUrl?: string | null;
  decoration?: AvatarDecorationDto | null;
  name?: string;
  priority?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="relative isolate aspect-[4/7] rounded-2xl overflow-hidden bg-gradient-to-b from-[#181526] via-[#111116] to-[#09090d] border border-white/10 text-white">
      <div className="absolute inset-x-0 top-0 h-[23%] bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-transparent" />
      <div
        data-profile-effect-avatar
        className="absolute left-[16%] top-[22%] -translate-x-1/2 -translate-y-1/2"
      >
        <Avatar src={avatarUrl} size={compact ? 'md' : 'lg'} decoration={decoration} />
      </div>
      <div className="absolute inset-x-[7%] top-[33%] text-left">
        <p className="font-bold text-lg truncate">{name}</p>
        <p className="mt-1 text-xs text-white/45">@{name.replace(/\s+/g, '').toLowerCase()}</p>
        <div className="mt-7 space-y-2.5" aria-hidden="true">
          <div className="h-2 w-[68%] rounded bg-white/10" />
          <div className="h-2 w-[47%] rounded bg-white/10" />
          <div className="h-2 w-[56%] rounded bg-white/10" />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute bottom-[9%] left-[7%] right-[7%] h-8 rounded-lg border border-white/15 bg-white/5"
      />
      <ProfileEffect effect={item} preview priority={priority} />
    </div>
  );
}
