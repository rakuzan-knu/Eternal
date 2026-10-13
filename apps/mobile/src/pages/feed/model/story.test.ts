import { describe, expect, it } from 'vitest';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { StoryViewResponse } from '@social-network/shared-contracts';
import {
  addPublishedStory,
  removeStory,
  storyMediaType,
  updateStory,
  validateStoryAsset,
} from './story';

const photo: ImagePickerAsset = { uri: 'photo.jpg', type: 'image', width: 900, height: 1600 };
const story: StoryViewResponse = {
  id: 's1',
  authorId: 'a',
  mediaUrl: 'photo.jpg',
  mediaType: 'IMAGE',
  caption: null,
  overlays: null,
  privacy: 'ALL_FOLLOWERS',
  createdAt: '2026-10-05T12:00:00Z',
  expiresAt: '2026-10-06T12:00:00Z',
  viewsCount: 0,
  hasViewed: false,
  userReaction: null,
  reactionsCount: {},
  pollResult: null,
  author: { id: 'a', username: 'alex', displayName: 'Alex', avatar: null },
};
describe('story publishing and viewing', () => {
  it('enforces server image/video limits, using MIME when picker type is absent', () => {
    expect(validateStoryAsset({ ...photo, fileSize: 10 * 1024 * 1024 })).toBeNull();
    expect(validateStoryAsset({ ...photo, fileSize: 10 * 1024 * 1024 + 1 })).toContain('10 MB');
    expect(validateStoryAsset({ ...photo, type: 'video', fileSize: 50 * 1024 * 1024 })).toBeNull();
    expect(
      validateStoryAsset({
        ...photo,
        type: undefined,
        mimeType: 'video/quicktime',
        fileSize: 101 * 1024 * 1024,
      }),
    ).toContain('100 MB');
    expect(storyMediaType({ ...photo, type: undefined, mimeType: 'video/mp4' })).toBe('VIDEO');
    expect(validateStoryAsset({ ...photo, mimeType: 'application/pdf' })).toBe(
      'Choose a photo, video or audio file.',
    );
  });
  it('adds confirmed publication immediately, preserving existing and other creators stories', () => {
    const other = { ...story, id: 'other', authorId: 'b', author: { ...story.author, id: 'b' } };
    const groups = addPublishedStory(addPublishedStory(undefined, other), story);
    const next = addPublishedStory(groups, { ...story, id: 's2', privacy: 'CLOSE_FRIENDS' });
    expect(next[0].stories.map((item) => item.id)).toEqual(['s1', 's2']);
    expect(next[0].hasCloseFriendsStory).toBe(true);
    expect(next[1].stories[0].id).toBe('other');
    expect(addPublishedStory(next, story)[0].stories).toHaveLength(2);
  });
  it('updates views/reactions and removes an empty group after confirmed deletion', () => {
    const groups = addPublishedStory(undefined, story);
    expect(
      updateStory(groups, 's1', (item) => ({ ...item, hasViewed: true }))?.[0].hasUnviewed,
    ).toBe(false);
    expect(groups[0].hasUnviewed).toBe(true);
    expect(removeStory(groups, 's1')).toEqual([]);
    expect(removeStory(groups, 'unknown')).toEqual(groups);
  });
});
