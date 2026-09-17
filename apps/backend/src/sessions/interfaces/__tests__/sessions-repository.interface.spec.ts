import {
  SESSIONS_REPOSITORY,
  type ISessionsRepository,
  type CreateSessionData,
} from '../sessions-repository.interface';
import type { Session } from '@prisma/client';

describe('sessions-repository.interface', () => {
  it('defines SESSIONS_REPOSITORY symbol token', () => {
    expect(typeof SESSIONS_REPOSITORY).toBe('symbol');
    expect(SESSIONS_REPOSITORY.toString()).toBe('Symbol(SESSIONS_REPOSITORY)');
  });

  it('implements ISessionsRepository interface methods', async () => {
    const sessionData: CreateSessionData = {
      userId: 'usr-1',
      jti: 'jti-1',
      deviceName: 'Firefox',
      userAgent: 'Mozilla/5.0',
      ip: '127.0.0.1',
      city: 'Paris',
      country: 'FR',
    };

    const mockSession: Session = {
      id: 'sess-1',
      userId: 'usr-1',
      jti: 'jti-1',
      deviceName: 'Firefox',
      userAgent: 'Mozilla/5.0',
      ip: '127.0.0.1',
      city: 'Paris',
      country: 'FR',
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };

    const mockRepo: ISessionsRepository = {
      create: jest.fn().mockResolvedValue(mockSession),
      findByJti: jest.fn().mockResolvedValue(mockSession),
      findById: jest.fn().mockResolvedValue(mockSession),
      listForUser: jest.fn().mockResolvedValue([mockSession]),
      touchByJti: jest.fn().mockResolvedValue(undefined),
      deleteByJti: jest.fn().mockResolvedValue(undefined),
      deleteById: jest.fn().mockResolvedValue(undefined),
      deleteOtherJtis: jest.fn().mockResolvedValue(['jti-old-1']),
      findByUserAndAgent: jest.fn().mockResolvedValue(null),
      updateSession: jest.fn().mockResolvedValue(mockSession),
      touchWithMeta: jest.fn().mockResolvedValue(undefined),
    };

    expect(await mockRepo.create(sessionData)).toEqual(mockSession);
    expect(await mockRepo.deleteOtherJtis('usr-1', 'jti-1')).toEqual(['jti-old-1']);
  });
});
