import { describe, it, expect } from 'vitest';
import { postsHandlers } from '../mocks/handlers/posts.handlers';

describe('test/mocks/handlers/posts.handlers MSW integration', () => {
  it('exports an array of MSW post request handlers', () => {
    expect(Array.isArray(postsHandlers)).toBe(true);
    expect(postsHandlers.length).toBeGreaterThanOrEqual(9);
  });

  describe('posts query and mutation handlers', () => {
    it('fetches global posts feed (GET */posts)', async () => {
      const res = await fetch('http://localhost:3000/posts');
      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        posts: Array<{ id: number; text: string }>;
        nextCursor: string | null;
      };
      expect(Array.isArray(data.posts)).toBe(true);
      expect(data.posts.length).toBeGreaterThan(0);
      expect(data.posts[0].text).toBe('Thats fire!');
    });

    it('creates a new post (POST */posts)', async () => {
      const res = await fetch('http://localhost:3000/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'New test post' }),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { id: number; text: string; author: string };
      expect(data.id).toBe(999);
      expect(data.text).toBe('New post');
      expect(data.author).toBe('Ayate');
    });

    it('fetches posts by specific user (GET */users/:userId/posts)', async () => {
      const res = await fetch('http://localhost:3000/users/user-1/posts');
      expect(res.status).toBe(200);
      const data = (await res.json()) as { posts: Array<{ id: number }> };
      expect(data.posts).toBeDefined();
    });

    it('fetches reposts by user (GET */users/:userId/reposts)', async () => {
      const res = await fetch('http://localhost:3000/users/other-user/reposts');
      expect(res.status).toBe(200);
      const data = (await res.json()) as { posts: Array<{ id: number; isReposted: boolean }> };
      expect(data.posts[0].isReposted).toBe(true);
    });

    it('handles liking and unliking a post', async () => {
      const likeRes = await fetch('http://localhost:3000/posts/1/like', { method: 'POST' });
      expect(likeRes.status).toBe(200);
      expect(await likeRes.json()).toEqual({ success: true });

      const unlikeRes = await fetch('http://localhost:3000/posts/1/like', { method: 'DELETE' });
      expect(unlikeRes.status).toBe(200);
      expect(await unlikeRes.json()).toEqual({ success: true });
    });

    it('handles reposting a post', async () => {
      const res = await fetch('http://localhost:3000/posts/1/repost', { method: 'POST' });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });

    it('handles voting on poll and fetching poll voters', async () => {
      const voteRes = await fetch('http://localhost:3000/posts/1/poll/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId: 'opt-1' }),
      });
      expect(voteRes.status).toBe(200);
      expect(await voteRes.json()).toEqual({ success: true });

      const votersRes = await fetch('http://localhost:3000/posts/1/poll/voters');
      expect(votersRes.status).toBe(200);
      expect(await votersRes.json()).toEqual([]);
    });
  });
});
