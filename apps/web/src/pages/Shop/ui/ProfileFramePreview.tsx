import type { AvatarDecorationDto, ProfileFrameDto } from '@social-network/shared-contracts';
import Avatar from '@/shared/ui/Avatar';
import { ProfileFrameSurface } from '@/shared/ui/ProfileFrame';

export function ProfileFramePreview({
  item,
  avatarUrl,
  decoration,
  name = 'Your profile',
  priority = false,
}: {
  item: ProfileFrameDto;
  avatarUrl?: string | null;
  decoration?: AvatarDecorationDto | null;
  name?: string;
  priority?: boolean;
}) {
  return (
    <ProfileFrameSurface frame={item} radius={18} priority={priority}>
      <div className="relative aspect-[4/6] overflow-hidden rounded-[18px] border border-white/10 bg-[#101016] text-white">
        <div className="h-[27%] bg-gradient-to-br from-[#33304b] via-[#272337] to-[#17151f]" />
        <div className="absolute left-[10%] top-[20%]">
          <Avatar src={avatarUrl} size="md" decoration={decoration} />
        </div>
        <div className="absolute left-[10%] right-[10%] top-[42%] text-left">
          <p className="font-bold text-base truncate">{name}</p>
          <p className="mt-1 text-[11px] opacity-45 truncate">
            @{name.replace(/\s+/g, '').toLowerCase()}
          </p>
          <div className="mt-6 space-y-2.5" aria-hidden="true">
            <div className="h-1.5 w-[80%] rounded bg-white/10" />
            <div className="h-1.5 w-[64%] rounded bg-white/10" />
            <div className="h-1.5 w-[73%] rounded bg-white/10" />
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute bottom-[8%] left-[10%] right-[10%] h-7 rounded-lg border border-white/10 bg-white/5"
        />
      </div>
    </ProfileFrameSurface>
  );
}
