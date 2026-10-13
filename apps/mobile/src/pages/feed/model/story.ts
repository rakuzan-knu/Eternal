import type { ImagePickerAsset } from 'expo-image-picker';
import type { StoryViewResponse, UserStoriesGroup } from '@social-network/shared-contracts';

export function storyMediaType(asset: ImagePickerAsset): 'IMAGE' | 'VIDEO' | 'VOICE' {
  if (asset.mimeType?.toLowerCase().startsWith('audio/')) return 'VOICE';
  return asset.type === 'video' || asset.mimeType?.toLowerCase().startsWith('video/')
    ? 'VIDEO'
    : 'IMAGE';
}

export function validateStoryAsset(asset: ImagePickerAsset): string | null {
  const video = storyMediaType(asset) === 'VIDEO';
  const audio = storyMediaType(asset) === 'VOICE';
  const mime = asset.mimeType?.toLowerCase();
  if (mime && !mime.startsWith(audio ? 'audio/' : video ? 'video/' : 'image/'))
    return 'Choose a photo, video or audio file.';
  const maxMB = audio ? 25 : video ? 100 : 10;
  const size = Math.max(asset.fileSize ?? 0, asset.file?.size ?? 0);
  return size > maxMB * 1024 * 1024
    ? `Choose a ${audio ? 'audio file' : video ? 'video' : 'photo'} smaller than ${maxMB} MB.`
    : null;
}

export function addPublishedStory(
  groups: UserStoriesGroup[] | undefined,
  story: StoryViewResponse,
): UserStoriesGroup[] {
  const own = groups?.find((group) => group.user.id === story.authorId);
  const stories = [...(own?.stories.filter((item) => item.id !== story.id) ?? []), story].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  return [
    {
      user: story.author,
      stories,
      hasUnviewed: stories.some((item) => !item.hasViewed),
      hasCloseFriendsStory: stories.some((item) => item.privacy === 'CLOSE_FRIENDS'),
      latestStoryTimestamp: stories[stories.length - 1].createdAt,
    },
    ...(groups?.filter((group) => group.user.id !== story.authorId) ?? []),
  ];
}

export function updateStory(
  groups: UserStoriesGroup[] | undefined,
  id: string,
  update: (story: StoryViewResponse) => StoryViewResponse,
): UserStoriesGroup[] | undefined {
  return groups?.map((group) => {
    const stories = group.stories.map((story) => (story.id === id ? update(story) : story));
    return { ...group, stories, hasUnviewed: stories.some((story) => !story.hasViewed) };
  });
}

export function removeStory(
  groups: UserStoriesGroup[] | undefined,
  id: string,
): UserStoriesGroup[] | undefined {
  return groups
    ?.map((group) => {
      const stories = group.stories.filter((story) => story.id !== id);
      return {
        ...group,
        stories,
        hasUnviewed: stories.some((story) => !story.hasViewed),
        hasCloseFriendsStory: stories.some((story) => story.privacy === 'CLOSE_FRIENDS'),
        latestStoryTimestamp: stories.at(-1)?.createdAt || group.latestStoryTimestamp,
      };
    })
    .filter((group) => group.stories.length > 0);
}
