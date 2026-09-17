import { describe, it, expect } from 'vitest';
import { profileHandlers } from '../mocks/handlers/profile.handlers';

describe('test/mocks/handlers/profile.handlers MSW integration', () => {
  it('exports an array of MSW profile request handlers', () => {
    expect(Array.isArray(profileHandlers)).toBe(true);
    expect(profileHandlers.length).toBeGreaterThanOrEqual(8);
  });

  describe('privacy and follow request endpoints', () => {
    it('fetches user privacy settings (GET */users/me/privacy)', async () => {
      const res = await fetch('http://localhost:3000/users/me/privacy');
      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        lastSeen: string;
        avatar: string;
        isPrivate: boolean;
        autoDeletePeriod: string;
      };
      expect(data.lastSeen).toBe('EVERYBODY');
      expect(data.isPrivate).toBe(false);
      expect(data.autoDeletePeriod).toBe('OFF');
    });

    it('fetches follow requests count and list (GET */users/me/follow-requests/count, GET */users/me/follow-requests)', async () => {
      const countRes = await fetch('http://localhost:3000/users/me/follow-requests/count');
      expect(countRes.status).toBe(200);
      expect(await countRes.json()).toEqual({ count: 0 });

      const listRes = await fetch('http://localhost:3000/users/me/follow-requests');
      expect(listRes.status).toBe(200);
      const listData = (await listRes.json()) as {
        data: unknown[];
        meta: { hasNextPage: boolean };
      };
      expect(listData.data).toEqual([]);
      expect(listData.meta.hasNextPage).toBe(false);
    });
  });

  describe('profile CRUD and lookup endpoints', () => {
    it('fetches user profile by username with custom displayName mapping', async () => {
      const res1 = await fetch('http://localhost:3000/users/by-username/kolya_dev');
      expect(res1.status).toBe(200);
      const data1 = (await res1.json()) as { username: string; displayName: string };
      expect(data1.username).toBe('kolya_dev');
      expect(data1.displayName).toBe('Kolya');

      const res2 = await fetch('http://localhost:3000/users/by-username/ayate');
      expect(res2.status).toBe(200);
      const data2 = (await res2.json()) as { username: string; displayName: string };
      expect(data2.username).toBe('ayate');
      expect(data2.displayName).toBe('Ayate');
    });

    it('updates user profile (PATCH */users/:id)', async () => {
      const res = await fetch('http://localhost:3000/users/user-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Updated Name' }),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { id: string; username: string };
      expect(data.id).toBe('user-1');
    });

    it('deletes user profile (DELETE */users/:id)', async () => {
      const res = await fetch('http://localhost:3000/users/user-1', {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });

    it('fetches GitHub PRs for contributor badges', async () => {
      const res = await fetch('https://api.github.com/repos/rakuzan-knu/social-network/pulls');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    });
  });
});
