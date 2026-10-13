// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import type { StoryViewResponse, UserStoriesGroup } from '@social-network/shared-contracts';
import { StoryViewer } from './StoryViewer';
import { feedKeys } from '../model/queries';

const mocks = vi.hoisted(() => ({ post: vi.fn(), remove: vi.fn() }));
vi.mock('@/shared/api/client', () => ({
  getMobileApi: () => ({ post: mocks.post, delete: mocks.remove }),
}));
vi.mock('./FeedDock', () => ({ openWebSection: vi.fn() }));
vi.mock('./StoryFonts', () => ({ useStoryFonts: () => [true, null] }));
vi.mock('./StoryCanvas', () => ({
  StoryBackground: () => null,
  StoryLayer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StoryText: ({ overlay }: { overlay: { text: string } }) => <div>{overlay.text}</div>,
  StoryImage: () => null,
  MusicSticker: () => null,
}));
vi.mock('./StoryVideo', () => ({ StoryVideo: () => null }));
vi.mock('./StoryAudio', () => ({ StoryAudio: () => null }));
vi.mock('./StoryMusicEditor', () => ({ StoryMusicPlayer: () => null }));
vi.mock('./StoryDrawing', () => ({ StoryDrawing: () => null }));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock('./MediaGallery', () => ({ Video: () => null }));
vi.mock('lucide-react-native', () => ({
  ChevronLeft: () => null,
  ChevronRight: () => null,
  Eye: () => null,
  Send: () => null,
  Trash2: () => null,
}));
vi.mock('react-native', () => {
  const View = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    View,
    Text: View,
    ScrollView: View,
    Image: View,
    StyleSheet: { create: (styles: unknown) => styles },
    useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
    Pressable: ({
      children,
      onPress,
      disabled,
      accessibilityLabel,
    }: {
      children?: React.ReactNode;
      onPress: () => void;
      disabled: boolean;
      accessibilityLabel: string;
    }) => (
      <button aria-label={accessibilityLabel} disabled={disabled} onClick={onPress}>
        {children}
      </button>
    ),
    TextInput: ({
      value,
      onChangeText,
      editable,
      accessibilityLabel,
    }: {
      value: string;
      onChangeText: (value: string) => void;
      editable: boolean;
      accessibilityLabel: string;
    }) => (
      <textarea
        aria-label={accessibilityLabel}
        value={value}
        disabled={!editable}
        onInput={(event) => onChangeText(event.currentTarget.value)}
        onChange={() => {}}
      />
    ),
  };
});
vi.mock('./primitives', () => ({
  colors: {},
  common: {},
  Avatar: () => null,
  ErrorNotice: ({ message }: { message: string }) => <div role="alert">{message}</div>,
  IconButton: ({
    label,
    onPress,
    disabled,
  }: {
    label: string;
    onPress: () => void;
    disabled: boolean;
  }) => (
    <button aria-label={label} onClick={onPress} disabled={disabled}>
      {label}
    </button>
  ),
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/shared/ui', () => ({
  Button: ({
    title,
    onPress,
    disabled,
    loading,
  }: {
    title: string;
    onPress: () => void;
    disabled: boolean;
    loading: boolean;
  }) => (
    <button onClick={onPress} disabled={disabled || loading}>
      {title}
    </button>
  ),
}));
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
const story: StoryViewResponse = {
  id: 's1',
  authorId: 'author',
  author: { id: 'author', username: 'mia', displayName: 'Mia', avatar: null },
  mediaType: 'IMAGE',
  mediaUrl: 'photo.jpg',
  caption: 'Moment',
  privacy: 'ALL_FOLLOWERS',
  overlays: null,
  createdAt: '2026-10-05T12:00:00Z',
  expiresAt: '2026-10-06T12:00:00Z',
  viewsCount: 0,
  hasViewed: true,
  userReaction: null,
  reactionsCount: {},
  pollResult: null,
};
let dispose: (() => Promise<void>) | undefined;
afterEach(async () => {
  await dispose?.();
  vi.resetAllMocks();
});
async function setup(inputStory = story) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const key = feedKeys.stories('viewer');
  const group: UserStoriesGroup = {
    user: inputStory.author,
    stories: [inputStory],
    hasUnviewed: false,
    hasCloseFriendsStory: false,
    latestStoryTimestamp: story.createdAt,
  };
  client.setQueryData(key, [group]);
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  const close = vi.fn();
  function Wrapper() {
    const query = useQuery({ queryKey: key, queryFn: async () => [group], enabled: false });
    return (
      <StoryViewer
        group={query.data?.[0] || { ...group, stories: [] }}
        userId="viewer"
        isOnline
        onClose={close}
      />
    );
  }
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Wrapper />
      </QueryClientProvider>,
    ),
  );
  dispose = async () => {
    await act(async () => root.unmount());
    client.clear();
    element.remove();
  };
  const click = async (name: string) =>
    act(async () => {
      const button = Array.from(element.querySelectorAll('button')).find(
        (b) => b.textContent === name || b.getAttribute('aria-label') === name,
      );
      if (!button) throw new Error(`Missing ${name}`);
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  return { client, key, group, element, click, close };
}
it('keeps a confirmed reaction when an older Feed refresh finishes later', async () => {
  mocks.post.mockResolvedValue({
    data: { storyId: 's1', emoji: '🔥', createdAt: story.createdAt },
  });
  const viewer = await setup();
  let resolveGet: (data: UserStoriesGroup[]) => void = () => {};
  let aborted = false;
  const oldGet = viewer.client
    .fetchQuery({
      queryKey: viewer.key,
      queryFn: ({ signal }) => {
        signal.addEventListener('abort', () => {
          aborted = true;
        });
        return new Promise<UserStoriesGroup[]>((resolve) => {
          resolveGet = resolve;
        });
      },
    })
    .catch(() => {});
  await viewer.click('React 🔥');
  expect(aborted).toBe(true);
  await act(async () => {
    resolveGet([viewer.group]);
    await oldGet;
  });
  const cached = viewer.client.getQueryData<UserStoriesGroup[]>(viewer.key);
  expect(cached?.[0].stories[0].userReaction).toBe('🔥');
  expect(cached?.[0].stories[0].reactionsCount['🔥']).toBe(1);
});
it('changes a story poll choice using the server result', async () => {
  const result = {
    question: 'Enjoy this?',
    totalVotes: 1,
    userVotedIndex: 0,
    options: [
      { text: 'Yes', voteCount: 1, percentage: 100 },
      { text: 'No', voteCount: 0, percentage: 0 },
    ],
  };
  mocks.post.mockResolvedValue({ data: result });
  const viewer = await setup({
    ...story,
    overlays: [
      {
        id: 'poll',
        type: 'poll',
        question: 'Enjoy this?',
        options: [{ text: 'Yes' }, { text: 'No' }],
        xPercent: 50,
        yPercent: 50,
        scale: 1,
        rotation: 0,
        zIndex: 1,
      },
    ],
  });
  await viewer.click('Yes');
  expect(mocks.post).toHaveBeenCalledWith('/stories/s1/poll-vote', { optionIndex: 0 });
  expect(
    viewer.client.getQueryData<UserStoriesGroup[]>(viewer.key)?.[0].stories[0].pollResult,
  ).toEqual(result);
  mocks.post.mockResolvedValue({ data: { ...result, userVotedIndex: 1 } });
  await viewer.click('No, 0%');
  expect(mocks.post).toHaveBeenLastCalledWith('/stories/s1/poll-vote', { optionIndex: 1 });
});
it('requires in-app confirmation before deleting an own story and closes its empty group', async () => {
  mocks.remove.mockResolvedValue({ data: { success: true } });
  const viewer = await setup({
    ...story,
    authorId: 'viewer',
    author: { ...story.author, id: 'viewer' },
  });
  await viewer.click('Delete story');
  expect(mocks.remove).not.toHaveBeenCalled();
  await viewer.click('Keep story');
  await viewer.click('Delete story');
  await viewer.click('Delete story permanently');
  expect(mocks.remove).toHaveBeenCalledWith('/stories/s1');
  expect(viewer.client.getQueryData(viewer.key)).toEqual([]);
  expect(viewer.close).toHaveBeenCalledOnce();
});
it('keeps a failed reply draft and clears it after confirmed retry', async () => {
  mocks.post
    .mockRejectedValueOnce(new Error('Unavailable'))
    .mockResolvedValueOnce({ data: { conversationId: 'chat' } });
  const viewer = await setup();
  const input = viewer.element.querySelector<HTMLTextAreaElement>('[aria-label="Reply to story"]');
  if (!input) throw new Error('Missing reply');
  await act(async () => {
    input.value = 'Great moment!';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await viewer.click('Send story reply');
  expect(input.value).toBe('Great moment!');
  expect(viewer.element.querySelector('[role="alert"]')?.textContent).toContain('failed');
  await viewer.click('Send story reply');
  expect(input.value).toBe('');
  expect(mocks.post).toHaveBeenLastCalledWith('/stories/s1/reply', { text: 'Great moment!' });
});
