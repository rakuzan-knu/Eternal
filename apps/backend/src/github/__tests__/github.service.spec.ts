import type { Request, Response } from 'express';
import { GithubService } from '../github.service';
import type { RedisService } from '../../redis/redis.service';
import type { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

global.fetch = jest.fn();

describe('GithubService', () => {
  let service: GithubService;
  let mockGithubRepo: {
    findUserByGithubId: jest.Mock;
    findUserById: jest.Mock;
    findUserByGithubUsername: jest.Mock;
    updateUserGithub: jest.Mock;
    unlinkGithubAndBadges: jest.Mock;
    grantBadges: jest.Mock;
    updateShowcaseGithubAccount: jest.Mock;
  };
  let mockRedis: {
    del: jest.Mock;
    withLock?: jest.Mock;
  };
  let mockConfig: {
    get: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGithubRepo = {
      findUserByGithubId: jest.fn().mockResolvedValue({
        id: 'usr-1',
        username: 'johndoe',
        githubId: '12345',
        githubUsername: 'octocat',
      }),
      findUserById: jest.fn().mockResolvedValue({
        id: 'usr-1',
        username: 'johndoe',
        githubId: '12345',
        githubUsername: 'octocat',
      }),
      findUserByGithubUsername: jest.fn().mockResolvedValue({
        id: 'usr-1',
        username: 'johndoe',
        githubId: '12345',
        githubUsername: 'octocat',
      }),
      updateUserGithub: jest.fn().mockResolvedValue(undefined),
      unlinkGithubAndBadges: jest.fn().mockResolvedValue(undefined),
      grantBadges: jest.fn().mockResolvedValue(undefined),
      updateShowcaseGithubAccount: jest.fn().mockResolvedValue(undefined),
    };

    mockRedis = {
      del: jest.fn().mockResolvedValue(1),
      withLock: jest.fn((_k: string, action: () => unknown) => action()),
    };

    mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'GITHUB_CLIENT_ID') return 'gh-client-id';
        if (key === 'GITHUB_CLIENT_SECRET') return 'gh-secret';
        if (key === 'GITHUB_CALLBACK_URL') return 'http://localhost:5000/callback';
        if (key === 'GITHUB_WEBHOOK_SECRET') return 'wh-secret';
        if (key === 'GITHUB_SYSTEM_TOKEN') return 'sys-token';
        if (key === 'CORS_ORIGIN') return 'http://localhost:5173';
        return '';
      }),
    };

    service = new GithubService(
      mockGithubRepo,
      mockRedis as unknown as RedisService,
      mockConfig as unknown as ConfigService,
    );
  });

  describe('getAuthorizationUrl', () => {
    it('sets state cookie and redirects to GitHub authorize url', () => {
      const req = {
        query: { token: 'header.eyJzdWIiOiJ1c3ItMSJ9.signature' },
        headers: { 'x-forwarded-proto': 'https' },
        secure: true,
      } as unknown as Request;

      const cookieMock = jest.fn();
      const redirectMock = jest.fn();
      const res = {
        cookie: cookieMock,
        redirect: redirectMock,
      } as unknown as Response;

      service.getAuthorizationUrl(req, res);

      expect(cookieMock).toHaveBeenCalledWith('github_oauth_state', expect.any(String), {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 600000,
      });
      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/login/oauth/authorize'),
      );
    });
  });

  describe('handleOAuthCallback', () => {
    it('redirects with error on csrf state mismatch', async () => {
      const req = { cookies: { github_oauth_state: 'state-cookie' } } as unknown as Request;
      const res = {
        clearCookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      await service.handleOAuthCallback('code123', 'wrong-csrf', req, res);

      expect(res.clearCookie).toHaveBeenCalledWith('github_oauth_state');
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=csrf_state_mismatch'),
      );
    });

    it('exchanges code for token, links github to user, and syncs contributions', async () => {
      const req = { cookies: { github_oauth_state: 'valid-csrf' } } as unknown as Request;
      const res = {
        clearCookie: jest.fn(),
        redirect: jest.fn(),
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      // 1. token response
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue({ access_token: 'gh-token-abc' }),
        })
        // 2. user profile response
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 12345, login: 'octocat' }),
        })
        // 3. user profile refresh by id
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ login: 'octocat' }),
        })
        // 4. search issues PR count
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ total_count: 5 }),
        });

      await service.handleOAuthCallback('code123', 'valid-csrf:usr-1', req, res, 'usr-1');

      expect(mockGithubRepo.updateUserGithub).toHaveBeenCalledWith('usr-1', {
        githubId: '12345',
        githubUsername: 'octocat',
      });
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('github=connected'));
    });
  });

  describe('unlinkGithub', () => {
    it('clears github credentials, removes contributor badges, and clears cache', async () => {
      await service.unlinkGithub('usr-1');

      expect(mockGithubRepo.unlinkGithubAndBadges).toHaveBeenCalledWith('usr-1', expect.any(Array));
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-1');
    });
  });

  describe('syncUserGithubContributions', () => {
    it('returns empty result when user has no githubId', async () => {
      mockGithubRepo.findUserById.mockResolvedValueOnce({ id: 'usr-1', githubId: null });
      const res = await service.syncUserGithubContributions('usr-1');
      expect(res.mergedPrsCount).toBe(0);
    });

    it('queries search api and awards badges for tier thresholds', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ login: 'octocat' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ total_count: 12 }),
        });

      const res = await service.syncUserGithubContributions('usr-1');
      expect(res.mergedPrsCount).toBe(12);
      expect(mockGithubRepo.grantBadges).toHaveBeenCalledWith(
        'usr-1',
        expect.arrayContaining(['CONTRIBUTOR', 'CONTRIBUTOR_PLATINUM']),
      );
    });
  });

  describe('verifySignature & handleWebhookPayload', () => {
    it('verifies valid HMAC sha256 signature correctly', () => {
      const payload = '{"action":"closed"}';
      const hmac = crypto.createHmac('sha256', 'wh-secret');
      const validSig = `sha256=${hmac.update(payload).digest('hex')}`;

      expect(service.verifySignature(payload, validSig)).toBe(true);
      expect(service.verifySignature(payload, 'sha256=invalidsig')).toBe(false);
      expect(service.verifySignature(payload, undefined)).toBe(false);
    });

    it('handles closed and merged PR webhooks for linked user', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ login: 'octocat' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ total_count: 3 }),
        });

      const res = await service.handleWebhookPayload({
        action: 'closed',
        pull_request: {
          merged: true,
          user: { login: 'octocat' },
        },
      });

      expect(res.handled).toBe(true);
      expect(res.message).toContain('Synced PR count for user @johndoe');
    });

    it('ignores unmerged or other webhook actions', async () => {
      const res = await service.handleWebhookPayload({ action: 'opened' });
      expect(res.handled).toBe(false);
      expect(res.message).toBe('Event ignored (not a merged PR)');
    });
  });
});
