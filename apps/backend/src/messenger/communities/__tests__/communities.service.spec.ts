import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UnreadProjectionService } from '../../unread/unread-projection.service';
import { CommunitiesRepository } from '../communities.repository';
import { CommunitiesService } from '../communities.service';

describe('CommunitiesService', () => {
  let service: CommunitiesService;
  const repository = {
    preview: jest.fn(),
    accept: jest.fn(),
    list: jest.fn(),
    channels: jest.fn(),
  };
  const unreadProjection = { getConversationCounts: jest.fn() };
  const summary = {
    id: 'community',
    name: 'Community',
    description: '',
    avatar: null,
    createdAt: new Date('2030-01-01'),
    _count: { members: 3 },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CommunitiesService,
        { provide: CommunitiesRepository, useValue: repository },
        { provide: UnreadProjectionService, useValue: unreadProjection },
      ],
    }).compile();
    service = module.get(CommunitiesService);
  });

  it('hydrates canonical unread counts in bounded batches while preserving preference fields', async () => {
    const data = Array.from({ length: 101 }, (_, index) => ({
      conversationId: `conversation-${index}`,
      myNotificationMode: 'NONE',
    }));
    repository.channels.mockResolvedValue({ communityId: 'community', role: 'MEMBER', data });
    unreadProjection.getConversationCounts.mockImplementation(
      (_userId: string, ids: string[]) => new Map(ids.map((id) => [id, 3])),
    );
    const result = await service.channels('community', 'user');
    expect(unreadProjection.getConversationCounts).toHaveBeenCalledTimes(2);
    expect(unreadProjection.getConversationCounts).toHaveBeenNthCalledWith(
      1,
      'user',
      data.slice(0, 100).map((channel) => channel.conversationId),
    );
    expect(unreadProjection.getConversationCounts).toHaveBeenNthCalledWith(2, 'user', [
      'conversation-100',
    ]);
    expect(result.data).toHaveLength(101);
    expect(result.data[100]).toMatchObject({ unreadCount: 3, myNotificationMode: 'NONE' });
  });

  it.each(['', 'a'.repeat(42), 'a'.repeat(44), '/'.repeat(43), ' '.repeat(43)])(
    'rejects malformed preview and accept tokens without accessing the repository: %j',
    async (token) => {
      await expect(service.preview(token)).rejects.toBeInstanceOf(NotFoundException);
      expect(() => service.accept(token, 'user')).toThrow(NotFoundException);
      expect(repository.preview).not.toHaveBeenCalled();
      expect(repository.accept).not.toHaveBeenCalled();
    },
  );

  it('passes a valid base64url token unchanged and serializes the preview dates', async () => {
    const token = `${'a'.repeat(41)}_-`;
    repository.preview.mockResolvedValue({ community: summary, expiresAt: new Date('2030-01-02') });
    await expect(service.preview(token)).resolves.toEqual({
      community: {
        id: 'community',
        name: 'Community',
        description: '',
        avatar: null,
        createdAt: '2030-01-01T00:00:00.000Z',
        memberCount: 3,
      },
      expiresAt: '2030-01-02T00:00:00.000Z',
    });
    expect(repository.preview).toHaveBeenCalledWith(token);
    repository.accept.mockResolvedValue({ joined: true, alreadyMember: true });
    await service.accept(token, 'user');
    expect(repository.accept).toHaveBeenCalledWith(token, 'user');
  });

  it('uses the last returned row as the next cursor and excludes the lookahead row', async () => {
    repository.list.mockResolvedValue([summary, { ...summary, id: 'lookahead' }]);
    const result = await service.list({ limit: 1 }, 'user');
    expect(result.nextCursor).toBe('community');
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ id: 'community', memberCount: 3 });
    expect(repository.list).toHaveBeenCalledWith({ limit: 1 }, 'user');
  });

  it('returns an empty page without a cursor', async () => {
    repository.list.mockResolvedValue([]);
    await expect(service.list({ limit: 12 })).resolves.toEqual({ data: [], nextCursor: null });
  });
});
