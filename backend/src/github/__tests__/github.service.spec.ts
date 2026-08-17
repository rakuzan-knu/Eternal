import type { Request, Response } from 'express';
import { GithubService } from '../github.service';
import type { PrismaService } from '@common/prisma';
import type { RedisService } from '../../redis/redis.service';
import type { ConfigService } from '@nestjs/config';

describe('GithubService', () => {
  let service: GithubService;
  let mockPrisma: {
    user: {
      update: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    userBadge: {
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
    badge: {
      findUnique: jest.Mock;
    };
  };
  let mockRedis: {
    del: jest.Mock;
  };
  let mockConfig: {
    get: jest.Mock;
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      userBadge: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
      },
      badge: {
        findUnique: jest.fn(),
      },
    };

    mockRedis = {
      del: jest.fn().mockResolvedValue(1),
    };

    mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'GITHUB_CLIENT_ID') return 'gh-client-id';
        if (key === 'GITHUB_CLIENT_SECRET') return 'gh-secret';
        if (key === 'GITHUB_CALLBACK_URL') return 'http://localhost:5000/callback';
        if (key === 'GITHUB_WEBHOOK_SECRET') return 'wh-secret';
        return '';
      }),
    };

    service = new GithubService(
      mockPrisma as unknown as PrismaService,
      mockRedis as unknown as RedisService,
      mockConfig as unknown as ConfigService,
    );
  });

  describe('getAuthorizationUrl', () => {
    it('sets state cookie and redirects to GitHub authorize url', () => {
      const req = {
        query: {},
        headers: {},
        secure: false,
      } as unknown as Request;

      const cookieMock = jest.fn();
      const redirectMock = jest.fn();
      const res = {
        cookie: cookieMock,
        redirect: redirectMock,
      } as unknown as Response;

      service.getAuthorizationUrl(req, res);

      expect(cookieMock).toHaveBeenCalledWith(
        'github_oauth_state',
        expect.any(String),
        expect.objectContaining({ httpOnly: true }),
      );
      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/login/oauth/authorize'),
      );
    });
  });

  describe('unlinkGithub', () => {
    it('clears github credentials, removes contributor badges, and clears cache', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'usr-1' });

      await service.unlinkGithub('usr-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'usr-1' },
        data: { githubId: null, githubUsername: null, mergedPrsCount: 0 },
      });
      expect(mockPrisma.userBadge.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'usr-1',
          badgeId: {
            in: [
              'CONTRIBUTOR',
              'CONTRIBUTOR_BRONZE',
              'CONTRIBUTOR_SILVER',
              'CONTRIBUTOR_GOLD',
              'CONTRIBUTOR_PLATINUM',
              'CONTRIBUTOR_DIAMOND',
              'CONTRIBUTOR_RUBY',
              'CONTRIBUTOR_OPAL',
            ],
          },
        },
      });
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-1');
    });
  });

  describe('verifySignature', () => {
    it('returns false when signature or secret is missing/invalid', () => {
      expect(service.verifySignature('{}', undefined)).toBe(false);
      expect(service.verifySignature('{}', 'sha256=invalid-signature')).toBe(false);
    });
  });
});
