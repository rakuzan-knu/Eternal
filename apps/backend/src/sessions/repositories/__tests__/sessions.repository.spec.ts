import type { PrismaService } from '@common/prisma';
import { SessionsRepository } from '../sessions.repository';

describe('SessionsRepository', () => {
  let repository: SessionsRepository;
  let mockPrisma: {
    session: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  const sampleDate = new Date('2026-08-16T12:00:00.000Z');

  const sampleSession = {
    id: 'sess-1',
    userId: 'usr-1',
    jti: 'jti-123',
    deviceName: 'Chrome on macOS',
    userAgent: 'Mozilla/5.0...',
    ip: '127.0.0.1',
    city: 'San Francisco',
    country: 'US',
    createdAt: sampleDate,
    lastActiveAt: sampleDate,
  };

  beforeEach(() => {
    mockPrisma = {
      session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    repository = new SessionsRepository(mockPrisma as unknown as PrismaService);
  });

  it('create inserts session row', async () => {
    mockPrisma.session.create.mockResolvedValueOnce(sampleSession);

    const created = await repository.create({
      userId: 'usr-1',
      jti: 'jti-123',
      deviceName: 'Chrome on macOS',
      userAgent: 'Mozilla/5.0...',
      ip: '127.0.0.1',
      city: 'San Francisco',
      country: 'US',
    });

    expect(mockPrisma.session.create).toHaveBeenCalledWith({
      data: {
        userId: 'usr-1',
        jti: 'jti-123',
        deviceName: 'Chrome on macOS',
        userAgent: 'Mozilla/5.0...',
        ip: '127.0.0.1',
        city: 'San Francisco',
        country: 'US',
      },
    });
    expect(created.id).toBe('sess-1');
  });

  it('findByJti and findById query by unique field', async () => {
    mockPrisma.session.findUnique.mockResolvedValueOnce(sampleSession);
    expect(await repository.findByJti('jti-123')).toEqual(sampleSession);

    mockPrisma.session.findUnique.mockResolvedValueOnce(sampleSession);
    expect(await repository.findById('sess-1')).toEqual(sampleSession);
  });

  it('listForUser queries sessions ordered by lastActiveAt desc', async () => {
    mockPrisma.session.findMany.mockResolvedValueOnce([sampleSession]);

    const sessions = await repository.listForUser('usr-1');

    expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
      where: { userId: 'usr-1' },
      orderBy: { lastActiveAt: 'desc' },
    });
    expect(sessions).toHaveLength(1);
  });

  it('touchByJti, deleteByJti, deleteById execute expected updates and deletes', async () => {
    await repository.touchByJti('jti-123');
    expect(mockPrisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { jti: 'jti-123' },
      }),
    );

    await repository.deleteByJti('jti-123');
    expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({ where: { jti: 'jti-123' } });

    await repository.deleteById('sess-1');
    expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({ where: { id: 'sess-1' } });
  });

  it('deleteOtherJtis deletes all other sessions and returns revoked JTIs', async () => {
    mockPrisma.session.findMany.mockResolvedValueOnce([
      { jti: 'jti-other-1' },
      { jti: 'jti-other-2' },
    ]);

    const revoked = await repository.deleteOtherJtis('usr-1', 'jti-keep');

    expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
      where: { userId: 'usr-1', jti: { not: 'jti-keep' } },
      select: { jti: true },
    });
    expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'usr-1', jti: { not: 'jti-keep' } },
    });
    expect(revoked).toEqual(['jti-other-1', 'jti-other-2']);
  });
});
