import { MessagesProcessor } from '../messages.processor';
import type { ConfigService } from '@nestjs/config';
import type { MessengerGateway } from '../../../messenger/gateway/messenger.gateway';
import type { Job } from 'bullmq';
import { MessageJobType } from '../../queue.constants';

jest.mock('bullmq', () => {
  return {
    Worker: jest.fn().mockImplementation(function () {
      return {
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('ioredis', () => {
  const MockRedis = jest.fn().mockImplementation(function () {
    return {
      on: jest.fn().mockReturnThis(),
      status: 'ready',
      quit: jest.fn().mockResolvedValue('OK'),
      disconnect: jest.fn(),
    };
  });
  return {
    default: MockRedis,
    Redis: MockRedis,
    __esModule: true,
  };
});

describe('MessagesProcessor', () => {
  let processor: MessagesProcessor;
  let mockConfigService: { get: jest.Mock };
  let mockGateway: { emitToUser: jest.Mock };
  let mockConvsRepo: { findParticipantIds: jest.Mock };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('redis://localhost:6379'),
    };
    mockGateway = {
      emitToUser: jest.fn(),
    };
    mockConvsRepo = {
      findParticipantIds: jest.fn().mockResolvedValue(['u-1', 'u-2', 'u-3', 'u-4']),
    };
    processor = new MessagesProcessor(
      mockConfigService as unknown as ConfigService,
      mockConvsRepo as never,
      mockGateway as unknown as MessengerGateway,
    );
  });

  afterEach(async () => {
    await processor.onModuleDestroy();
  });

  it('processes message fanout job', async () => {
    const job = {
      name: MessageJobType.FANOUT,
      data: {
        conversationId: 'c-1',
        senderId: 'u-1',
        messageId: 'm-1',
        recipientIds: ['u-2', 'u-3'],
        snippet: 'Hello',
      },
    } as unknown as Job;

    await expect(processor.processJob(job)).resolves.not.toThrow();
  });

  it('processes global entity fanout job with provided recipientIds and excludedUserId', async () => {
    const job = {
      name: MessageJobType.GLOBAL_ENTITY_FANOUT,
      data: {
        conversationId: 'c-1',
        event: 'conversation:updated',
        payload: { id: 'c-1', name: 'New Name' },
        excludedUserId: 'u-1',
        recipientIds: ['u-1', 'u-2', 'u-3'],
      },
    } as unknown as Job;

    await expect(processor.processJob(job)).resolves.not.toThrow();

    // u-1 was excluded, so emitToUser should only be called for u-2 and u-3
    expect(mockGateway.emitToUser).toHaveBeenCalledWith('u-2', 'conversation:updated', {
      id: 'c-1',
      name: 'New Name',
    });
    expect(mockGateway.emitToUser).toHaveBeenCalledWith('u-3', 'conversation:updated', {
      id: 'c-1',
      name: 'New Name',
    });
    expect(mockGateway.emitToUser).not.toHaveBeenCalledWith(
      'u-1',
      expect.anything(),
      expect.anything(),
    );
  });

  it('fetches participant IDs from repo when recipientIds is omitted in global entity fanout', async () => {
    const job = {
      name: MessageJobType.GLOBAL_ENTITY_FANOUT,
      data: {
        conversationId: 'c-1',
        event: 'message:pinned',
        payload: { conversationId: 'c-1', messageId: 'm-99' },
        excludedUserId: 'u-1',
      },
    } as unknown as Job;

    await expect(processor.processJob(job)).resolves.not.toThrow();

    expect(mockConvsRepo.findParticipantIds).toHaveBeenCalledWith('c-1');
    expect(mockGateway.emitToUser).toHaveBeenCalledWith('u-2', 'message:pinned', {
      conversationId: 'c-1',
      messageId: 'm-99',
    });
    expect(mockGateway.emitToUser).toHaveBeenCalledWith('u-3', 'message:pinned', {
      conversationId: 'c-1',
      messageId: 'm-99',
    });
    expect(mockGateway.emitToUser).toHaveBeenCalledWith('u-4', 'message:pinned', {
      conversationId: 'c-1',
      messageId: 'm-99',
    });
    expect(mockGateway.emitToUser).not.toHaveBeenCalledWith(
      'u-1',
      expect.anything(),
      expect.anything(),
    );
  });
  it('does not deliver a queued entity snapshot to revoked recipients', async () => {
    mockConvsRepo.findParticipantIds.mockResolvedValue(['u-2']);
    await processor.processJob({
      name: MessageJobType.GLOBAL_ENTITY_FANOUT,
      data: {
        conversationId: 'private',
        event: 'conversationUpdated',
        payload: { id: 'private' },
        recipientIds: ['u-2', 'revoked'],
      },
    } as Job);
    expect(mockGateway.emitToUser).toHaveBeenCalledTimes(1);
    expect(mockGateway.emitToUser).toHaveBeenCalledWith('u-2', 'conversationUpdated', {
      id: 'private',
    });
  });
  it('rechecks access at delivery after recipient selection', async () => {
    mockConvsRepo.findParticipantIds.mockResolvedValueOnce(['revoked']).mockResolvedValue([]);
    await processor.processJob({
      name: MessageJobType.GLOBAL_ENTITY_FANOUT,
      data: {
        conversationId: 'private',
        event: 'conversationUpdated',
        payload: { id: 'private' },
        recipientIds: ['revoked'],
      },
    } as Job);
    expect(mockConvsRepo.findParticipantIds).toHaveBeenCalledTimes(2);
    expect(mockGateway.emitToUser).not.toHaveBeenCalled();
  });
});
