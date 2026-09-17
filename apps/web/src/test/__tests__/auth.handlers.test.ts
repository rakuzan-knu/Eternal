import { describe, it, expect } from 'vitest';
import { authHandlers } from '../mocks/handlers/auth.handlers';

describe('test/mocks/handlers/auth.handlers MSW integration', () => {
  it('exports an array of MSW HTTP request handlers', () => {
    expect(Array.isArray(authHandlers)).toBe(true);
    expect(authHandlers.length).toBeGreaterThanOrEqual(8);
  });

  describe('login endpoint (POST */auth/login)', () => {
    it('returns 200 and access/refresh tokens for valid credentials', async () => {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'Password123!' }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; username: string };
      };
      expect(data.accessToken).toBe('mock-access-token');
      expect(data.refreshToken).toBe('mock-refresh-token');
      expect(data.user.email).toBe('test@example.com');
    });

    it('returns 401 for invalid credentials', async () => {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'wrong@example.com', password: 'badpassword' }),
      });

      expect(res.status).toBe(401);
      const data = (await res.json()) as { message: string };
      expect(data.message).toBe('Invalid credentials');
    });
  });

  describe('check-username endpoint (GET */auth/check-username)', () => {
    it('returns isAvailable: false for taken usernames', async () => {
      const res1 = await fetch('http://localhost:3000/auth/check-username?username=taken');
      const data1 = (await res1.json()) as { isAvailable: boolean };
      expect(data1.isAvailable).toBe(false);

      const res2 = await fetch('http://localhost:3000/auth/check-username?username=existing');
      const data2 = (await res2.json()) as { isAvailable: boolean };
      expect(data2.isAvailable).toBe(false);
    });

    it('returns isAvailable: true for available usernames', async () => {
      const res = await fetch('http://localhost:3000/auth/check-username?username=brand_new_user');
      const data = (await res.json()) as { isAvailable: boolean };
      expect(data.isAvailable).toBe(true);
    });
  });

  describe('register endpoint (POST */auth/register)', () => {
    it('returns 201 with tokens and user for a new account', async () => {
      const res = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newbie@example.com',
          username: 'newbie',
          displayName: 'Newbie Dev',
        }),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as {
        accessToken: string;
        user: { email: string; username: string };
      };
      expect(data.accessToken).toBe('mock-access-token');
      expect(data.user.username).toBe('newbie');
    });

    it('returns 409 when email is already registered', async () => {
      const res = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com',
          username: 'taken_user',
        }),
      });

      expect(res.status).toBe(409);
      const data = (await res.json()) as { message: string };
      expect(data.message).toBe('Email is already registered');
    });
  });

  describe('auth session management (refresh, logout, find-account)', () => {
    it('handles refresh token generation (POST */auth/refresh)', async () => {
      const res = await fetch('http://localhost:3000/auth/refresh', { method: 'POST' });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { accessToken: string };
      expect(data.accessToken).toBe('new-mock-access-token');
    });

    it('handles logout (POST */auth/logout)', async () => {
      const res = await fetch('http://localhost:3000/auth/logout', { method: 'POST' });
      expect(res.status).toBe(204);
    });

    it('handles find-account (POST */auth/find-account)', async () => {
      const res = await fetch('http://localhost:3000/auth/find-account', { method: 'POST' });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { maskedEmail: string; maskedPhone: string };
      expect(data.maskedEmail).toBe('u***@example.com');
      expect(data.maskedPhone).toBe('+380 •• ••• •• 99');
    });
  });

  describe('users endpoints (GET */users/me, GET */users/:id)', () => {
    it('returns the current authenticated user profile (GET */users/me)', async () => {
      const res = await fetch('http://localhost:3000/users/me');
      expect(res.status).toBe(200);
      const data = (await res.json()) as { id: string; username: string; displayName: string };
      expect(data.id).toBe('user-1');
      expect(data.username).toBe('my_profile');
    });

    it('returns a user profile by ID (GET */users/:id)', async () => {
      const res = await fetch('http://localhost:3000/users/user-42');
      expect(res.status).toBe(200);
      const data = (await res.json()) as { id: string; username: string };
      expect(data.id).toBe('user-42');
    });
  });
});
