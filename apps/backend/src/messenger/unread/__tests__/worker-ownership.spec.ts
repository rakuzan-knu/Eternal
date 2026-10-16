import { afterEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@common/prisma';
import { UnreadReconciliationWorker } from '../unread-reconciliation.worker';
import { UnreadProjectionService } from '../unread-projection.service';
import { SoundboardService } from '../../soundboard/soundboard.service';
import { ConversationsService } from '../../conversations/conversations.service';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('new Messenger lifecycle ownership', () => {
  it.each(['core', 'messenger', 'reels', 'music', 'all'])(
    'only initializes Messenger work on its owner (%s)',
    async (role) => {
      vi.useFakeTimers();
      vi.stubEnv('SERVICE_ROLE', role);
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('UNREAD_PROJECTION_RECONCILE_ENABLED', 'true');
      const execute = vi.fn().mockResolvedValue(0);
      const module = await Test.createTestingModule({
        providers: [
          UnreadReconciliationWorker,
          SoundboardService,
          { provide: UnreadProjectionService, useValue: {} },
          { provide: PrismaService, useValue: { $executeRawUnsafe: execute } },
          { provide: ConversationsService, useValue: {} },
        ],
      }).compile();
      try {
        await module.init();
        const owns = role === 'messenger' || role === 'all';
        expect(vi.getTimerCount()).toBe(owns ? 1 : 0);
        expect(execute).toHaveBeenCalledTimes(owns ? 3 : 0);
      } finally {
        await module.close();
      }
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});
