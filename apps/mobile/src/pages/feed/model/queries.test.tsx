// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { PostResponseDto } from '@social-network/shared-contracts';
import { feedKeys, usePostActions, usePollVote } from './queries';
import type { FeedData } from './feed';

const http = vi.hoisted(() => ({ action: vi.fn(), vote: vi.fn(), session: vi.fn() }));
vi.mock('../api/feedApi', () => ({ feedApi: http }));
vi.mock('@/shared/api/client', () => ({ assertSession: http.session }));
vi.mock('@social-network/shared-stores', () => ({
  useAuthStore: { getState: () => ({ refreshToken: 'refresh' }) },
}));

it('updates home and saved after confirmation without touching other users or detail shapes', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const post = PostResponseDto.fromPrisma({
    id: 'p1',
    authorId: 'author',
    content: 'Hello',
    createdAt: new Date(),
    updatedAt: new Date(),
    isSaved: true,
  });
  const data: FeedData = {
    pages: [{ data: [post], meta: { nextCursor: null, hasNextPage: false } }],
    pageParams: [undefined],
  };
  const home = feedKeys.feed('alice', 'home');
  const saved = feedKeys.feed('alice', 'saved');
  const other = feedKeys.feed('bob', 'home');
  const detail = ['mobile', 'alice', 'posts', 'detail', 'p1'];
  for (const key of [home, saved, other]) client.setQueryData(key, data);
  client.setQueryData(detail, post);
  let mutation: ReturnType<typeof usePostActions> | undefined;
  function Harness() {
    mutation = usePostActions('alice', 'p1');
    return null;
  }
  const element = document.createElement('div');
  const root = createRoot(element);
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    ),
  );
  function currentMutation() {
    if (!mutation) throw new Error('Hook was not mounted');
    return mutation;
  }
  http.action.mockResolvedValue(undefined);
  try {
    await act(async () => {
      await currentMutation().mutateAsync({ action: 'like', active: true });
    });
    expect(client.getQueryData<FeedData>(home)?.pages[0]?.data[0]).toMatchObject({
      isLiked: true,
      likesCount: 1,
      isSaved: true,
    });
    expect(client.getQueryData<FeedData>(saved)?.pages[0]?.data[0]?.isLiked).toBe(true);
    expect(client.getQueryData(other)).toEqual(data);
    expect(client.getQueryData(detail)).toEqual(post);
    http.action.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      await expect(
        currentMutation().mutateAsync({ action: 'save', active: false }),
      ).rejects.toThrow('offline');
    });
    expect(client.getQueryData<FeedData>(saved)?.pages[0]?.data[0]?.isSaved).toBe(true);
  } finally {
    await act(async () => root.unmount());
    client.clear();
    vi.unstubAllGlobals();
  }
});

it('updates a poll in both notification detail and feed caches after voting, preserving other accounts', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const post = PostResponseDto.fromPrisma({
    id: 'poll-post',
    authorId: 'author',
    content: 'Choose',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const updated: PostResponseDto = {
    ...post,
    poll: {
      id: 'poll-1',
      title: 'Choose',
      isMultiple: false,
      totalVotes: 1,
      isActive: true,
      myVoteOptionId: 'option-1',
      options: [{ id: 'option-1', text: 'Coffee', votesCount: 1 }],
    },
  };
  const data: FeedData = {
    pages: [{ data: [post], meta: { nextCursor: null, hasNextPage: false } }],
    pageParams: [undefined],
  };
  for (const userId of ['alice', 'bob']) {
    client.setQueryData(feedKeys.feed(userId, 'home'), data);
    client.setQueryData(feedKeys.detail(userId, post.id), post);
  }
  let vote: ReturnType<typeof usePollVote> | undefined;
  function Harness() {
    vote = usePollVote('alice', post.id);
    return null;
  }
  const root = createRoot(document.createElement('div'));
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    ),
  );
  try {
    http.vote.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce(updated);
    await act(async () => {
      if (!vote) throw new Error('Hook not mounted');
      await expect(vote.mutateAsync('option-1')).rejects.toThrow('Unavailable');
    });
    expect(client.getQueryData(feedKeys.detail('alice', post.id))).toEqual(post);
    await act(async () => {
      if (!vote) throw new Error('Hook not mounted');
      await vote.mutateAsync('option-1');
    });
    expect(client.getQueryData(feedKeys.detail('alice', post.id))).toEqual(updated);
    expect(
      client.getQueryData<FeedData>(feedKeys.feed('alice', 'home'))?.pages[0]?.data[0],
    ).toEqual(updated);
    expect(client.getQueryData(feedKeys.detail('bob', post.id))).toEqual(post);
    expect(client.getQueryData(feedKeys.feed('bob', 'home'))).toEqual(data);
    expect(http.session).toHaveBeenCalledWith('alice', 'refresh');
  } finally {
    await act(async () => root.unmount());
    client.clear();
    vi.unstubAllGlobals();
  }
});
