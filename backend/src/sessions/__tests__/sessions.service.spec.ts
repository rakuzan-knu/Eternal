import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SessionsService } from '../sessions.service';
import type { PrismaService } from '@common/prisma';

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
  };
  let mockPrisma: {
    session: {
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const sampleDate = new Date('2026-08-16T12:00:00.000Z');

  const sampleSession = {
    id: 'sess-1',
    userId: 'usr-1',
    jti: 'jti-current',
    deviceName: 'Chrome on macOS',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ip: '127.0.0.1',
    city: 'San Francisco',
    country: 'US',
    createdAt: sampleDate,
    lastActiveAt: sampleDate,
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
    };

    mockPrisma = {
      session: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    service = new SessionsService(mockSessionsRepo, mockPrisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates new session with parsed device name and geo info', async () => {
      mockPrisma.session.findFirst.mockResolvedValueOnce(null);

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
      mockPrisma.session.findFirst.mockResolvedValueOnce({
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

      expect(mockPrisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'existing-sess-id' },
        }),
      );
      expect(mockSessionsRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('touch, deleteByJti, revokeOthers', () => {
    it('touch updates lastActiveAt and ip info', async () => {
      await service.touch('jti-123', { ip: '127.0.0.1' });

      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { jti: 'jti-123' },
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
