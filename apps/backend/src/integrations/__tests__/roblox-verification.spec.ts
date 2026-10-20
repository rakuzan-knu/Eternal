import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '@common/prisma';
import { RedisService } from '../../redis/redis.service';
import { IntegrationsService } from '../integrations.service';

describe('Roblox ownership verification', () => {
  const userId = 'initiating-user';
  const phrase = 'amber cedar cloud coral forest harbor meadow willow apple birch';
  const robloxUser = { id: 1234, name: 'RobloxOwner', displayName: 'Roblox Owner' };
  const records = new Map<string, string>();
  const fetchMock = vi.fn<typeof fetch>();
  const findUnique = vi.fn();
  const upsert = vi.fn();
  const redis = {
    get: vi.fn(async (key: string) => records.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, _ttl: number) => {
      records.set(key, value);
    }),
    del: vi.fn(async (key: string) => {
      records.delete(key);
    }),
  };
  let service: IntegrationsService;
  let about: string;

  function storeSession(code: unknown) {
    records.set(
      `roblox:verify:${userId}`,
      JSON.stringify({
        robloxId: robloxUser.id,
        username: robloxUser.name,
        displayName: robloxUser.displayName,
        avatarBustUrl: 'https://images.example/avatar.png',
        code,
      }),
    );
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    records.clear();
    about = '';
    vi.stubEnv('ROBLOX_API_KEY', '');
    findUnique.mockResolvedValue({ connectedAccounts: { github: { username: 'retained' } } });
    upsert.mockResolvedValue({});
    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url === 'https://users.roblox.com/v1/usernames/users') {
        return Response.json({ data: [robloxUser] });
      }
      if (url === `https://users.roblox.com/v1/users/${robloxUser.id}`) {
        return Response.json({ ...robloxUser, description: about });
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const module = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        { provide: PrismaService, useValue: { profileShowcase: { findUnique, upsert } } },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();
    service = module.get(IntegrationsService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('stores a ten-word challenge bound to the initiating user for fifteen minutes', async () => {
    const result = await service.generateRobloxVerificationCode(userId, robloxUser.name);

    expect(result.verificationCode).toMatch(/^[a-z]+(?: [a-z]+){9}$/);
    expect(redis.set).toHaveBeenCalledWith(`roblox:verify:${userId}`, expect.any(String), 900);
    expect(JSON.parse(records.get(`roblox:verify:${userId}`)!)).toMatchObject({
      robloxId: robloxUser.id,
      username: robloxUser.name,
      code: result.verificationCode,
    });
    expect(records.has('roblox:verify:other-user')).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('verifies the server-stored phrase case-insensitively and preserves accounts and cache invalidation', async () => {
    storeSession(phrase);
    about = `My profile. ${phrase.toUpperCase()} Welcome!`;

    const result = await service.verifyRobloxOwnership(
      userId,
      'caller-substituted-name',
      'wrong-code',
    );

    expect(result).toMatchObject({
      success: true,
      data: { robloxId: robloxUser.id, username: robloxUser.name, verified: true },
    });
    expect(upsert).toHaveBeenCalledOnce();
    expect(upsert.mock.calls[0]?.[0]).toMatchObject({
      where: { userId },
      update: {
        connectedAccounts: {
          github: { username: 'retained' },
          roblox: { verified: true, robloxId: robloxUser.id },
        },
      },
    });
    expect(redis.del).toHaveBeenCalledWith(`showcase:user:${userId}`);
    expect(redis.del).toHaveBeenCalledWith(`roblox:verify:${userId}`);
    expect(records.has(`roblox:verify:${userId}`)).toBe(false);
  });

  it.each([
    ['filtered', '###################', /filtered.*Generate a new phrase/],
    ['partially filtered', phrase.replace('forest', '######'), /filtered.*Generate a new phrase/],
    ['missing', 'Welcome to my profile', /was not found/],
    ['empty profile', '', /was not found/],
    ['caller-substituted proof', 'caller-chosen-code', /was not found/],
  ])(
    'rejects %s proof without saving or invalidating the session',
    async (_label, description, message) => {
      storeSession(phrase);
      about = description;

      await expect(
        service.verifyRobloxOwnership(userId, 'caller-substituted-name', 'caller-chosen-code'),
      ).rejects.toThrow(message);
      expect(findUnique).not.toHaveBeenCalled();
      expect(upsert).not.toHaveBeenCalled();
      expect(redis.del).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, '', '   ', null, 1234])(
    'rejects an invalid stored challenge %s before matching an empty string',
    async (code) => {
      storeSession(code);
      about = phrase;

      await expect(service.verifyRobloxOwnership(userId, robloxUser.name, phrase)).rejects.toThrow(
        'Invalid verification session',
      );
      expect(fetchMock).not.toHaveBeenCalled();
      expect(upsert).not.toHaveBeenCalled();
    },
  );

  it.each(['expired', 'other-user'])(
    'rejects an %s session without fetching Roblox or saving',
    async (scenario) => {
      storeSession(phrase);
      const verifyingUser = scenario === 'other-user' ? 'other-user' : userId;
      if (scenario === 'expired') records.delete(`roblox:verify:${userId}`);

      await expect(
        service.verifyRobloxOwnership(verifyingUser, robloxUser.name, phrase),
      ).rejects.toThrow('Verification session expired');
      expect(redis.get).toHaveBeenCalledWith(`roblox:verify:${verifyingUser}`);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(upsert).not.toHaveBeenCalled();
    },
  );

  it('accepts an already-issued legacy challenge until its session expires', async () => {
    storeSession('eternal-verify-6367');
    about = 'Profile owner ETERNAL-VERIFY-6367';

    await expect(
      service.verifyRobloxOwnership(userId, robloxUser.name, 'eternal-verify-6367'),
    ).resolves.toMatchObject({ success: true });
    expect(upsert).toHaveBeenCalledOnce();
  });
});
