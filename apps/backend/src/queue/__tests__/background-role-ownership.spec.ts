import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@common/prisma';
import { RedisService } from '../../redis/redis.service';
import { REELS_S3_CLIENT } from '../../reels/s3-provider';
import { MessengerGateway } from '../../messenger/gateway/messenger.gateway';
import { CallsCDCService } from '../../messenger/calls/calls-cdc.service';
import { AutoDeleteService } from '../../messenger/auto-delete/auto-delete.service';
import { AUTO_DELETE_S3_CLIENT } from '../../messenger/auto-delete/s3-provider';
import { PresenceEngineService } from '../../messenger/presence/presence-engine.service';
import { SteamPresenceService } from '../../integrations/steam-presence.service';
import { SpotifyPresenceService } from '../../integrations/spotify-presence.service';
import { SpotifyService } from '../../integrations/spotify.service';
import { OutboxPublisherService } from '../../common/outbox/outbox-publisher.service';
import { OUTBOX_REPOSITORY } from '../../common/outbox/outbox.constants';
import { MediaPreviewProcessor } from '../processors/media-preview.processor';
import { SearchIndexingProcessor } from '../processors/search-indexing.processor';
import { MessagesProcessor } from '../processors/messages.processor';
import { NotificationsProcessor } from '../processors/notifications.processor';
import { VideoTranscodeProcessor } from '../processors/video-transcode.processor';

const workers = [
  MediaPreviewProcessor,
  SearchIndexingProcessor,
  MessagesProcessor,
  NotificationsProcessor,
  VideoTranscodeProcessor,
];

describe('Background process ownership with shared providers', () => {
  let moduleRef: TestingModule | undefined;
  let config: ConfigService;
  const userFindMany = vi.fn().mockResolvedValue([]);
  const acquireLock = vi.fn().mockResolvedValue(null);
  const getOnlineUserIds = vi.fn().mockReturnValue([]);
  const getClient = vi.fn();
  const claimPendingEvents = vi.fn().mockResolvedValue([]);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    vi.stubEnv('ENABLE_OUTBOX_POLLER_IN_TEST', 'true');
    config = new ConfigService();
    vi.spyOn(config, 'get').mockReturnValue(undefined);
  });

  afterEach(async () => {
    await moduleRef?.close();
    moduleRef = undefined;
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  async function createSharedProviders(role: string): Promise<TestingModule> {
    vi.stubEnv('SERVICE_ROLE', role);
    moduleRef = await Test.createTestingModule({
      providers: [
        ...workers,
        CallsCDCService,
        AutoDeleteService,
        PresenceEngineService,
        SteamPresenceService,
        SpotifyPresenceService,
        OutboxPublisherService,
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: { user: { findMany: userFindMany } } },
        { provide: RedisService, useValue: { acquireLock, getClient } },
        { provide: MessengerGateway, useValue: { getOnlineUserIds } },
        { provide: EventEmitter2, useValue: { emit: vi.fn() } },
        { provide: SpotifyService, useValue: {} },
        { provide: REELS_S3_CLIENT, useValue: {} },
        { provide: AUTO_DELETE_S3_CLIENT, useValue: {} },
        { provide: OUTBOX_REPOSITORY, useValue: { claimPendingEvents } },
      ],
    }).compile();
    return moduleRef;
  }

  it.each([
    { role: 'core', expected: [MediaPreviewProcessor.name, SearchIndexingProcessor.name] },
    { role: 'messenger', expected: [MessagesProcessor.name, NotificationsProcessor.name] },
    { role: 'reels', expected: [VideoTranscodeProcessor.name] },
    { role: 'music', expected: [] },
    { role: 'all', expected: workers.map((worker) => worker.name) },
  ])(
    'starts only the workers owned by $role before reading Redis configuration',
    async ({ role, expected }) => {
      const shared = await createSharedProviders(role);
      const get = vi.mocked(config.get);
      const started: string[] = [];
      for (const worker of workers) {
        get.mockClear();
        shared.get<{ onModuleInit(): void }>(worker).onModuleInit();
        if (get.mock.calls.some(([key]) => key === 'REDIS_URL')) started.push(worker.name);
      }
      expect(started).toEqual(expected);
    },
  );

  it.each(['core', 'reels', 'music'])(
    '%s keeps shared messenger providers passive, including direct cron and polling calls',
    async (role) => {
      const shared = await createSharedProviders(role);
      await shared.init();
      vi.mocked(config.get).mockClear();

      await shared.get(CallsCDCService).initCDCListener();
      await shared.get(AutoDeleteService).sweep();
      await shared.get(SteamPresenceService).pollOnlineSteamUsers();
      await shared.get(SpotifyPresenceService).pollOnlineSpotifyUsers();
      await expect(shared.get(OutboxPublisherService).processOutboxBatch()).resolves.toBe(0);
      const presence = shared.get(PresenceEngineService);
      presence.recordUserOnline('user-1', 'socket-1');
      await presence.flushHeartbeats();
      presence.flushPresenceBatch();
      await vi.advanceTimersByTimeAsync(60_000);

      expect(vi.getTimerCount()).toBe(0);
      expect(config.get).not.toHaveBeenCalled();
      expect(userFindMany).not.toHaveBeenCalled();
      expect(acquireLock).not.toHaveBeenCalled();
      expect(claimPendingEvents).not.toHaveBeenCalled();
      expect(getOnlineUserIds).not.toHaveBeenCalled();
      expect(getClient).not.toHaveBeenCalled();
    },
  );

  it.each(['messenger', 'all'])(
    '%s keeps the messenger timers and clears initial polls and intervals on shutdown',
    async (role) => {
      const shared = await createSharedProviders(role);
      expect(vi.getTimerCount()).toBe(2); // Presence heartbeat and broadcast timers.
      await shared.init();
      expect(vi.getTimerCount()).toBe(7); // Plus two integration polls and one outbox timer.
      await shared.get(AutoDeleteService).sweep();
      expect(userFindMany).toHaveBeenCalledTimes(1);
      await expect(shared.get(OutboxPublisherService).processOutboxBatch()).resolves.toBe(0);
      expect(acquireLock).toHaveBeenCalledTimes(1);

      await shared.close();
      moduleRef = undefined;
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(getOnlineUserIds).not.toHaveBeenCalled();
      expect(claimPendingEvents).not.toHaveBeenCalled();
    },
  );
});
