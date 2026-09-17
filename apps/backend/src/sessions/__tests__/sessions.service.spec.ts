import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SessionsService } from '../sessions.service';
import type { RedisService } from '../../redis/redis.service';

describe('SessionsService', () => {
  let service: SessionsService;
  let mockSessionsRepo: {
    create: jest.Mock;
    findByJti: jest.Mock;
    findById: jest.Mock;
    listForUser: jest.Mock;
    touchByJti: jest.Mock;
    deleteByJti: jest.Mock;
    deleteById: jest.Mock;
    deleteOtherJtis: jest.Mock;
    findByUserAndAgent: jest.Mock;
    updateSession: jest.Mock;
    touchWithMeta: jest.Mock;
  };

  const sampleSession = {
    id: 'sess-1',
    userId: 'usr-1',
    jti: 'jti-current',
    deviceName: 'Chrome on macOS',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ip: '127.0.0.1',
    city: 'Paris',
    country: 'FR',
    createdAt: new Date(),
    lastActiveAt: new Date(),
  };

  beforeEach(() => {
    mockSessionsRepo = {
      create: jest.fn().mockResolvedValue(sampleSession),
      findByJti: jest.fn(),
      findById: jest.fn(),
      listForUser: jest.fn().mockResolvedValue([]),
      touchByJti: jest.fn().mockResolvedValue(undefined),
      deleteByJti: jest.fn().mockResolvedValue(undefined),
      deleteById: jest.fn().mockResolvedValue(undefined),
      deleteOtherJtis: jest.fn().mockResolvedValue(['revoked-jti-1']),
      findByUserAndAgent: jest.fn().mockResolvedValue(null),
      updateSession: jest.fn().mockResolvedValue(sampleSession),
      touchWithMeta: jest.fn().mockResolvedValue(undefined),
    };

    const mockRedis = {
      withLock: jest.fn(<T>(_key: string, action: () => Promise<T> | T): Promise<T> | T =>
        action(),
      ),
    };

    service = new SessionsService(mockSessionsRepo, mockRedis as unknown as RedisService);
  });

  describe('create', () => {
    it('creates new session with parsed device name and geo info', async () => {
      mockSessionsRepo.findByUserAndAgent.mockResolvedValueOnce(null);

      await service.create('usr-1', 'jti-123', {
        userAgent: sampleSession.userAgent,
        ip: '::ffff:208.67.222.222',
      });

      expect(mockSessionsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'usr-1',
          jti: 'jti-123',
          deviceName: 'Chrome on macOS',
          ip: '208.67.222.222',
        }),
      );
    });

    it('updates existing session if active session from same userAgent is present', async () => {
      mockSessionsRepo.findByUserAndAgent.mockResolvedValueOnce({
        id: 'existing-sess-id',
        deviceName: 'Chrome on Mac OS',
        ip: '127.0.0.1',
        city: null,
        country: null,
      });

      await service.create('usr-1', 'jti-new', {
        userAgent: sampleSession.userAgent,
        ip: '127.0.0.1',
      });

      expect(mockSessionsRepo.updateSession).toHaveBeenCalledWith(
        'existing-sess-id',
        expect.objectContaining({
          jti: 'jti-new',
        }),
      );
      expect(mockSessionsRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('touch, deleteByJti, revokeOthers', () => {
    it('touch updates lastActiveAt and ip info', async () => {
      await service.touch('jti-123', { ip: '127.0.0.1' });

      expect(mockSessionsRepo.touchWithMeta).toHaveBeenCalledWith(
        'jti-123',
        expect.objectContaining({
          ip: '127.0.0.1',
        }),
      );
    });

    it('deleteByJti and revokeOthers delegate to repository', async () => {
      await service.deleteByJti('jti-1');
      expect(mockSessionsRepo.deleteByJti).toHaveBeenCalledWith('jti-1');

      const revoked = await service.revokeOthers('usr-1', 'jti-keep');
      expect(mockSessionsRepo.deleteOtherJtis).toHaveBeenCalledWith('usr-1', 'jti-keep');
      expect(revoked).toEqual(['revoked-jti-1']);
    });
  });

  describe('listForUser & revokeById', () => {
    it('listForUser maps sessions and marks current session', async () => {
      mockSessionsRepo.listForUser.mockResolvedValueOnce([
        sampleSession,
        { ...sampleSession, id: 'sess-2', jti: 'jti-other' },
      ]);

      const list = await service.listForUser('usr-1', 'jti-current');

      expect(list).toHaveLength(2);
      expect(list[0].isCurrent).toBe(true);
      expect(list[1].isCurrent).toBe(false);
    });

    it('revokeById throws NotFoundException if session does not exist', async () => {
      mockSessionsRepo.findById.mockResolvedValueOnce(null);

      await expect(service.revokeById('usr-1', 'missing-sess')).rejects.toThrow(NotFoundException);
    });

    it('revokeById throws ForbiddenException if session belongs to another user', async () => {
      mockSessionsRepo.findById.mockResolvedValueOnce({ ...sampleSession, userId: 'other-user' });

      await expect(service.revokeById('usr-1', 'sess-1')).rejects.toThrow(
        new ForbiddenException('Not your session'),
      );
    });

    it('revokeById deletes session and returns jti when user owns session', async () => {
      mockSessionsRepo.findById.mockResolvedValueOnce(sampleSession);

      const jti = await service.revokeById('usr-1', 'sess-1');

      expect(mockSessionsRepo.deleteById).toHaveBeenCalledWith('sess-1');
      expect(jti).toBe('jti-current');
    });
  });
});
