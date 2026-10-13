import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ConfigService } from '@nestjs/config';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PlatformAdminGuard } from '../../../auth/guards/platform-admin.guard';
import { AuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { publicIntegrationData } from '../public-integration-data';
import { issueOAuthState, consumeOAuthState } from '../oauth-state';
import { storyAccess } from '../../../stories/story-access';
import { fetchPinned } from '../../../opengraph/pinned-http-fetch';
import { isPrivateIPv6 } from '../../../opengraph/opengraph.service';
import { ShowcaseRepository } from '../../../showcase/repositories/showcase.repository';
import { CallsService } from '../../../messenger/calls/calls.service';
import { MessagesRepository } from '../../../messenger/repositories/messages.repository';
import { PrekeysService } from '../../../messenger/crypto/prekeys.service';
import { HealthController } from '../../../health/health.controller';
import { FeatureFlagsController } from '../../../feature-flags/feature-flags.controller';
import { PostsController } from '../../../posts/posts.controller';
import { ReelsController } from '../../../reels/reels.controller';
import { MessengerGateway } from '../../../messenger/gateway/messenger.gateway';
import { MessagesService } from '../../../messenger/messages/messages.service';
import {
  RedisSelfHealingService,
  DEFAULT_NON_CRITICAL_CACHE_PATTERNS,
} from '../../../redis/redis-self-healing.service';
import { Permission } from '@common/contracts';
import RedisMock from 'ioredis-mock';

describe('security boundaries', () => {
  it('preserves stored credentials when public integration settings round-trip through the repository', async () => {
    const stored = {
      spotify: {
        username: 'alice',
        accessToken: 'secret',
        refreshToken: 'refresh',
        preferences: { showActivity: true },
      },
      _personalInfo: { birthDate: 'private' },
    };
    const upsert = jest.fn().mockResolvedValue({ id: 'showcase' });
    const tx = {
      profileShowcase: {
        findUnique: jest.fn().mockResolvedValue({ connectedAccounts: stored }),
        upsert,
      },
    };
    const repository = new ShowcaseRepository({
      $transaction: (action: (value: typeof tx) => Promise<void>) => action(tx),
    } as any);
    await repository.updateShowcase('alice', {
      connectedAccounts: {
        ...publicIntegrationData(stored),
        github: { username: 'octocat' },
        spotify: {
          username: 'alice',
          accessToken: 'forged',
          refresh_token: 'forged',
          preferences: { showActivity: false },
        },
      },
    });
    const result = upsert.mock.calls[0][0].update.connectedAccounts;
    expect(result.spotify).toEqual({
      username: 'alice',
      accessToken: 'secret',
      refreshToken: 'refresh',
      preferences: { showActivity: false },
    });
    expect(result.github).toEqual({ username: 'octocat' });
    expect(result._personalInfo).toEqual(stored._personalInfo);
    expect(publicIntegrationData(result).spotify).not.toHaveProperty('accessToken');
    expect(stored.spotify.preferences.showActivity).toBe(true);
  });

  it('rejects every call state mutation by removed conversation members before writes', async () => {
    const service = Object.create(CallsService.prototype);
    const call = {
      id: 'call',
      conversationId: 'conv',
      status: 'CONNECTED',
      participants: [
        { userId: 'alice', leftAt: null },
        { userId: 'bob', leftAt: null },
      ],
    };
    const updateCallStatus = jest.fn();
    const updateParticipantState = jest.fn();
    const assertMember = jest.fn().mockRejectedValue(new Error('Not an active member'));
    Object.assign(service, {
      callsRepo: {
        findCallById: jest.fn().mockResolvedValue(call),
        updateCallStatus,
        updateParticipantState,
      },
      convsService: { assertMember },
    });
    for (const mutate of [
      () => service.acceptCall('alice', 'call'),
      () => service.rejectCall('alice', 'call'),
      () => service.endCall('alice', 'call'),
      () => service.toggleMedia('alice', 'call', 'mute', true),
      () => service.checkCallActive('call', 'alice'),
    ]) {
      await expect(mutate()).rejects.toThrow('Not an active member');
    }
    expect(assertMember).toHaveBeenCalledTimes(5);
    expect(updateParticipantState).not.toHaveBeenCalled();
    expect(updateCallStatus).not.toHaveBeenCalled();
    assertMember.mockResolvedValue(undefined);
    updateParticipantState.mockResolvedValue(call);
    await expect(service.toggleMedia('alice', 'call', 'mute', true)).resolves.toEqual(call);
    expect(updateParticipantState).toHaveBeenCalledWith('call', 'alice', { muteState: true });
    call.status = 'ENDED';
    call.participants[0].leftAt = new Date() as any;
    updateParticipantState.mockClear();
    await expect(service.endCall('alice', 'call')).resolves.toEqual(
      expect.objectContaining({ call }),
    );
    expect(updateParticipantState).not.toHaveBeenCalled();
  });

  it('executes the OAuth Lua script against Redis semantics for every supported provider', async () => {
    const client = new RedisMock();
    const redis = { getClient: () => client } as any;
    try {
      for (const provider of ['github', 'spotify', 'youtube', 'twitch', 'steam']) {
        const state = await issueOAuthState(redis, provider, 'alice');
        expect(await client.ttl(`oauth-state:${state}`)).toBeGreaterThan(0);
        await expect(consumeOAuthState(redis, provider, state, 'mallory')).rejects.toThrow();
        expect((await consumeOAuthState(redis, provider, state, 'alice')).userId).toBe('alice');
        await expect(consumeOAuthState(redis, provider, state, 'alice')).rejects.toThrow();
        const expired = await issueOAuthState(redis, provider, 'alice');
        await client.del(`oauth-state:${expired}`);
        await expect(consumeOAuthState(redis, provider, expired, 'alice')).rejects.toThrow();
      }
    } finally {
      client.disconnect();
    }
  });

  it('executes distributed prekey quotas atomically under concurrent requests', async () => {
    const client = new RedisMock();
    const repo = { consumePrekeyBundle: jest.fn().mockResolvedValue({ userId: 'target' }) } as any;
    const visibility = {
      loadContext: jest.fn().mockResolvedValue({}),
      resolve: jest.fn().mockReturnValue(true),
    } as any;
    const service = new PrekeysService(repo, visibility, { getClient: () => client } as any);
    try {
      const results = await Promise.allSettled(
        Array.from({ length: 50 }, () => service.getPrekeyBundle('target', 'alice')),
      );
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(2);
      expect(repo.consumePrekeyBundle).toHaveBeenCalledTimes(2);
      for (let index = 0; index < 28; index++)
        await service.getPrekeyBundle(`target-${index}`, 'alice');
      await expect(service.getPrekeyBundle('another-target', 'alice')).rejects.toThrow('limit');
      expect(repo.consumePrekeyBundle).toHaveBeenCalledTimes(30);
    } finally {
      client.disconnect();
    }
  });

  it('rejects departed members and changed roles even with warm authorization and idempotency caches', async () => {
    const service = Object.create(MessagesService.prototype);
    const findParticipant = jest.fn().mockResolvedValue({ role: 'MEMBER', leftAt: new Date() });
    const cached = jest.fn().mockResolvedValue(JSON.stringify({ id: 'old-secret-message' }));
    Object.assign(service, {
      convsRepo: { findParticipant },
      fastPath: { checkFastPath: () => true, computeMask: () => 0, setPermissions: jest.fn() },
      redisService: { get: cached },
      prisma: { conversation: { findUnique: jest.fn().mockResolvedValue({ type: 'GROUP' }) } },
    });
    await expect(
      service.send('conv', 'alice', { text: 'hello', clientMessageId: 'replay' }),
    ).rejects.toThrow('active member');
    expect(cached).not.toHaveBeenCalled();
    findParticipant.mockResolvedValue({
      role: 'MEMBER',
      leftAt: null,
      permissions: Permission.IS_BANNED,
    });
    await expect(
      service.send('conv', 'alice', { text: 'hello', clientMessageId: 'replay' }),
    ).rejects.toThrow('banned');
    expect(cached).not.toHaveBeenCalled();
    findParticipant.mockResolvedValue({
      role: 'MEMBER',
      leftAt: null,
      permissions: Permission.CAN_SEND_TEXT,
    });
    await expect(
      service.assertCanSend('conv', 'alice', { text: 'hello' }),
    ).resolves.toBeUndefined();
    await expect(service.assertCanSend('conv', 'alice', { attachments: [{}] })).rejects.toThrow(
      'media',
    );
  });

  it('rejects eviction patterns outside the cache allowlist and preserves security state prefixes', async () => {
    const service = Object.create(RedisSelfHealingService.prototype);
    const unlink = jest.fn().mockResolvedValue(0);
    Object.assign(service, {
      getRedisMemoryInfo: jest.fn().mockResolvedValue({
        usedMemoryBytes: 0,
        memoryUsagePercent: 0,
        memoryRatio: 0,
        thresholdRatio: 0.9,
      }),
      unlinkPatternInBatches: unlink,
      logger: { warn: jest.fn(), log: jest.fn() },
    });
    for (const pattern of ['*', 'trl:*', 'oauth-state:*', 'cache:*', '*auth*']) {
      await expect(service.evictNonCriticalCaches('test', [pattern])).rejects.toThrow('predefined');
    }
    expect(unlink).not.toHaveBeenCalled();
    await expect(
      service.evictNonCriticalCaches('test', [DEFAULT_NON_CRITICAL_CACHE_PATTERNS[0]]),
    ).resolves.toMatchObject({ triggered: true });
    expect(unlink).toHaveBeenCalledWith(DEFAULT_NON_CRITICAL_CACHE_PATTERNS[0]);
  });

  it('emits story content and viewer identities only to authorized user rooms', async () => {
    const gateway = Object.create(MessengerGateway.prototype);
    const roomEmit = jest.fn();
    const globalEmit = jest.fn();
    const userEmit = jest.fn();
    Object.assign(gateway, {
      server: { emit: globalEmit, to: () => ({ emit: roomEmit }) },
      emitToUser: userEmit,
      prisma: {
        follow: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { followerId: 'close' },
              { followerId: 'outsider' },
              { followerId: 'blocked' },
            ]),
        },
        closeFriend: {
          findMany: jest.fn().mockResolvedValue([{ friendId: 'close' }, { friendId: 'blocked' }]),
        },
        userBlock: {
          findMany: jest.fn().mockResolvedValue([{ blockerId: 'author', blockedId: 'blocked' }]),
        },
      },
    });
    await gateway.handleStoryCreated({
      authorId: 'author',
      story: { privacy: 'CLOSE_FRIENDS', mediaUrl: 'private' },
    });
    expect(userEmit.mock.calls.map((call: unknown[]) => call[0])).toEqual(['author', 'close']);
    expect(userEmit).toHaveBeenCalledWith('close', 'story:new', { authorId: 'author' });
    gateway.handleStoryViewed({ authorId: 'author', storyId: 'story', viewerId: 'secret-viewer' });
    expect(userEmit).toHaveBeenCalledWith(
      'author',
      'story:viewed',
      expect.objectContaining({ viewerId: 'secret-viewer' }),
    );
    expect(roomEmit).not.toHaveBeenCalled();
    expect(globalEmit).not.toHaveBeenCalled();
  });
  it('removes nested and alternate credential spellings without mutating stored integrations', () => {
    const original = {
      spotify: {
        accessToken: 'secret',
        refresh_token: 'secret',
        items: [{ client_secret: 'secret', title: 'Track' }],
      },
      _personalInfo: { birthDate: 'private' },
      github: { username: 'octocat' },
    };
    expect(publicIntegrationData(original)).toEqual({
      spotify: { items: [{ title: 'Track' }] },
      github: { username: 'octocat' },
    });
    expect(original.spotify.accessToken).toBe('secret');
  });

  it('binds one-use OAuth state to provider and verified user and rejects legacy user-id state', async () => {
    const records = new Map<string, string>();
    const redis = {
      getClient: () => ({
        set: jest.fn(async (key: string, value: string) => {
          records.set(key, value);
          return 'OK';
        }),
        get: jest.fn(async (key: string) => records.get(key) ?? null),
        eval: jest.fn(async (_script: string, _count: number, key: string, expected: string) => {
          if (records.get(key) !== expected) return 0;
          records.delete(key);
          return 1;
        }),
      }),
    } as any;
    const state = await issueOAuthState(redis, 'youtube', 'alice');
    expect(state).toMatch(/^youtube:[a-f0-9]{64}$/);
    expect(state).not.toContain('alice');
    await expect(consumeOAuthState(redis, 'youtube', 'youtube:alice', 'alice')).rejects.toThrow();
    await expect(consumeOAuthState(redis, 'twitch', state, 'alice')).rejects.toThrow();
    await expect(consumeOAuthState(redis, 'youtube', state, 'bob')).rejects.toThrow();
    await expect(
      consumeOAuthState(redis, 'youtube', state, undefined, 'wrong-cookie'),
    ).rejects.toThrow();
    expect((await consumeOAuthState(redis, 'youtube', state, undefined, state)).userId).toBe(
      'alice',
    );
    await expect(consumeOAuthState(redis, 'youtube', state, 'alice')).rejects.toThrow();
  });

  it('fails OAuth starts closed when shared state storage is unavailable', async () => {
    const redis = {
      getClient: () => ({ set: jest.fn().mockRejectedValue(new Error('Redis unavailable')) }),
    } as any;
    await expect(issueOAuthState(redis, 'github', 'alice')).rejects.toThrow('Redis unavailable');
  });

  it('denies platform administration by default and permits only configured verified accounts', () => {
    const context = (id: string) =>
      ({ switchToHttp: () => ({ getRequest: () => ({ user: { id } }) }) }) as any;
    const guard = new PlatformAdminGuard(
      new ConfigService({ PLATFORM_ADMIN_USER_IDS: 'alice,bob' }),
    );
    expect(guard.canActivate(context('alice'))).toBe(true);
    expect(() => guard.canActivate(context('mallory'))).toThrow();
    expect(() =>
      new PlatformAdminGuard(new ConfigService({})).canActivate(context('alice')),
    ).toThrow();
    for (const [controller, methods] of [
      [HealthController, ['triggerSelfHealPost', 'triggerSelfHealGet', 'getRedisMemoryInfo']],
      [FeatureFlagsController, ['listAdmin', 'createFlag', 'updateFlag', 'deleteFlag']],
    ] as const) {
      for (const method of methods)
        expect(Reflect.getMetadata(GUARDS_METADATA, (controller.prototype as any)[method])).toEqual(
          [AuthGuard, PlatformAdminGuard],
        );
    }
    for (const [controller, methods] of [
      [PostsController, ['createPost', 'uploadChunk']],
      [ReelsController, ['createReel', 'toggleLike', 'addComment', 'notInterested', 'reportReel']],
    ] as const) {
      for (const method of methods) {
        const handler = (controller.prototype as any)[method];
        expect(typeof handler).toBe('function');
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([AuthGuard]);
      }
    }
  });

  it('checks private, pending-follow, close-friend, block and expiry audiences with bounded queries', async () => {
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'private', isPrivate: true },
          { id: 'public', isPrivate: false },
        ]),
      },
      userBlock: { findMany: jest.fn().mockResolvedValue([]) },
      follow: { findMany: jest.fn().mockResolvedValue([]) },
      closeFriend: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const active = { expiresAt: new Date(Date.now() + 60000), privacy: 'ALL_FOLLOWERS' as const };
    const stories = [
      { ...active, authorId: 'private' },
      { ...active, authorId: 'public' },
      { ...active, authorId: 'public', privacy: 'CLOSE_FRIENDS' as const },
      { ...active, authorId: 'alice' },
      { ...active, authorId: 'public', expiresAt: new Date(0) },
    ];
    expect(await storyAccess(prisma, stories, 'alice')).toEqual([false, true, false, true, false]);
    prisma.follow.findMany.mockResolvedValue([{ followingId: 'private' }]);
    prisma.closeFriend.findMany.mockResolvedValue([{ userId: 'public' }]);
    expect(await storyAccess(prisma, stories, 'alice')).toEqual([true, true, true, true, false]);
    prisma.userBlock.findMany.mockResolvedValue([{ blockerId: 'public', blockedId: 'alice' }]);
    expect(await storyAccess(prisma, stories, 'alice')).toEqual([true, false, false, true, false]);
    expect(prisma.follow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'ACCEPTED' }) }),
    );
    expect(await storyAccess(prisma, stories)).toEqual([false, true, false, false, false]);
  });

  it('does not consume prekeys for blocked users or exhausted quotas, and allows a legitimate handshake', async () => {
    const repo = { consumePrekeyBundle: jest.fn().mockResolvedValue({ userId: 'target' }) } as any;
    const visibility = {
      loadContext: jest.fn().mockResolvedValue({}),
      resolve: jest.fn().mockReturnValue(false),
    } as any;
    const evalQuota = jest.fn().mockResolvedValue(0);
    const service = new PrekeysService(repo, visibility, {
      getClient: () => ({ eval: evalQuota }),
    } as any);
    await expect(service.getPrekeyBundle('target', 'alice')).rejects.toThrow();
    expect(repo.consumePrekeyBundle).not.toHaveBeenCalled();
    visibility.resolve.mockReturnValue(true);
    await expect(service.getPrekeyBundle('target', 'alice')).rejects.toThrow('limit');
    expect(repo.consumePrekeyBundle).not.toHaveBeenCalled();
    evalQuota.mockResolvedValue(1);
    expect(await service.getPrekeyBundle('target', 'alice')).toEqual({ userId: 'target' });
  });

  it('scopes source-message lookup to active membership and visible messages', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const repo = new MessagesRepository({ message: { findFirst } } as any);
    expect(await repo.findOne('secret-message', 'mallory')).toBeNull();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'secret-message',
          deletedForAll: false,
          deletedFor: { none: { userId: 'mallory' } },
          conversation: { participants: { some: { userId: 'mallory', leftAt: null } } },
        },
      }),
    );
  });

  it('rejects call decline by outsiders and departed participants before any status update', async () => {
    const repo = {
      findCallById: jest.fn().mockResolvedValue({
        status: 'RINGING',
        participants: [
          { userId: 'alice', leftAt: null },
          { userId: 'bob', leftAt: new Date() },
        ],
      }),
      updateCallStatus: jest.fn(),
    };
    const service = Object.create(CallsService.prototype) as CallsService;
    Object.assign(service, { callsRepo: repo });
    await expect(service.rejectCall('mallory', 'call')).rejects.toThrow();
    await expect(service.rejectCall('bob', 'call')).rejects.toThrow();
    expect(repo.updateCallStatus).not.toHaveBeenCalled();
  });

  it('rejects forged call signaling and voice room actions before emit or enqueue', async () => {
    const gateway = Object.create(MessengerGateway.prototype);
    const emit = jest.fn();
    const next = jest.fn();
    Object.assign(gateway, {
      callsService: {
        getCallById: jest.fn().mockResolvedValue({
          conversationId: 'conv',
          status: 'CONNECTED',
          participants: [{ userId: 'alice', leftAt: null }],
        }),
      },
      convsService: { assertMember: jest.fn().mockResolvedValue(undefined) },
      emitToUser: emit,
      candidateSubject$: { next },
    });
    const client = { userId: 'alice', rooms: new Set(), join: jest.fn(), to: jest.fn() };
    for (const method of [
      'handleCallReconnectAnswer',
      'handleCallIceRestart',
      'handleCallIceRestartAnswer',
      'handleCallIceCandidate',
      'handleCallRelayRequest',
    ]) {
      await expect(
        gateway[method](client, { callId: 'call', targetUserId: 'mallory', candidate: {} }),
      ).rejects.toThrow();
    }
    expect(emit).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    gateway.convsService.assertMember.mockRejectedValue(new Error('Not a member'));
    for (const method of ['handleVoiceMeshJoin', 'handleSoundboardPlay', 'handleWatchTogetherSync'])
      await expect(
        gateway[method](client, { roomId: 'private', conversationId: 'private' }),
      ).rejects.toThrow();
    expect(client.join).not.toHaveBeenCalled();
    expect(client.to).not.toHaveBeenCalled();
  });

  it('pins transport connections, preserves Host, enforces byte limits and aborts a stalled body', async () => {
    const server = createServer((request, response) => {
      if (request.url === '/stall') {
        response.writeHead(200);
        response.write('x');
        return;
      }
      response.end(request.url === '/large' ? 'x'.repeat(100) : request.headers.host);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    const addresses = [{ address: '127.0.0.1', family: 4 }];
    try {
      const response = await fetchPinned(
        `http://unresolvable.invalid:${port}/`,
        {},
        addresses,
        1024,
      );
      expect(await response.text()).toBe(`unresolvable.invalid:${port}`);
      await expect(
        fetchPinned(`http://unresolvable.invalid:${port}/large`, {}, addresses, 20),
      ).rejects.toThrow('limit');
      await expect(
        fetchPinned(
          `http://unresolvable.invalid:${port}/stall`,
          { signal: AbortSignal.timeout(100) },
          addresses,
          1024,
        ),
      ).rejects.toThrow();
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    for (const address of [
      '::ffff:7f00:1',
      '0:0:0:0:0:ffff:7f00:1',
      '0:0:0:0:0:0:0:1',
      'fd00::1',
      '2001:db8::1',
    ])
      expect(isPrivateIPv6(address)).toBe(true);
    expect(isPrivateIPv6('2606:4700:4700::1111')).toBe(false);
  });
});
