import type { InfiniteData } from '@tanstack/react-query';
import type { ReelResponseDto } from '@social-network/shared-contracts';
import type { Page } from '../../feed/model/feed';

export type ReelsData = InfiniteData<Page<ReelResponseDto>>;

export function uniqueReels(data: ReelsData | undefined): ReelResponseDto[] {
  const seen = new Set<string>();
  return (data?.pages.flatMap((page) => page.data) ?? []).filter((reel) => {
    if (seen.has(reel.id)) return false;
    seen.add(reel.id);
    return true;
  });
}

export function updateReels(
  data: ReelsData | undefined,
  id: string,
  update: (reel: ReelResponseDto) => ReelResponseDto,
): ReelsData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.map((reel) => (reel.id === id ? update(reel) : reel)),
    })),
  };
}

export function toggleLike(reel: ReelResponseDto): ReelResponseDto {
  const liked = !reel.isLiked;
  return { ...reel, isLiked: liked, likesCount: Math.max(0, reel.likesCount + (liked ? 1 : -1)) };
}

export function reelSource(reel: Pick<ReelResponseDto, 'hlsUrl' | 'videoUrl'>) {
  return reel.hlsUrl || reel.videoUrl;
}
