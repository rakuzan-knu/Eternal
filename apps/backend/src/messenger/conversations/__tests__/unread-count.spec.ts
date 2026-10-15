import { ConversationsService } from '../conversations.service';

describe('lightweight unread badge', () => {
  it('uses the rollout-aware projection when it is available', async () => {
    const getUnreadCount = vi.fn().mockResolvedValue({ count: 23 });
    const service = Object.create(ConversationsService.prototype) as ConversationsService;
    Object.assign(service, { unreadProjection: { getUnreadCount } });
    expect(await service.getUnreadCount('viewer')).toEqual({ count: 23 });
    expect(getUnreadCount).toHaveBeenCalledWith('viewer');
  });

  it('returns an aggregate without loading conversation graphs', async () => {
    const query = vi.fn().mockResolvedValue([{ count: 7n }]);
    const service = Object.create(ConversationsService.prototype) as ConversationsService;
    Object.assign(service, { prisma: { $queryRaw: query } });
    expect(typeof service.getUnreadCount).toBe('function');
    expect(await service.getUnreadCount('user-with-unread')).toEqual({ count: 7 });
    const sql = query.mock.calls[0][0];
    expect(sql.values.every((value: unknown) => value === 'user-with-unread')).toBe(true);
    expect(sql.sql).toContain('"archivedAt" IS NULL');
    expect(sql.sql).toContain('"leftAt" IS NULL');
    expect(sql.sql).toContain('"MessageDeletion"');
    expect(sql.sql).toContain('"UserBlock"');
    expect(sql.sql).toContain('m."createdAt" >= p."joinedAt"');
    expect(sql.sql).toContain('m."createdAt" > p."lastReadAt"');
    expect(sql.sql).toContain('m."deletedAt" IS NULL');
    expect(sql.sql).toContain('m."deletedForAll" = false');
  });
});
