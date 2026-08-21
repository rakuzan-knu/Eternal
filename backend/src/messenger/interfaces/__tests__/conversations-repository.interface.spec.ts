import {
  CONVERSATIONS_REPOSITORY,
  type IConversationsRepository,
} from '../conversations-repository.interface';

describe('conversations-repository.interface', () => {
  it('defines CONVERSATIONS_REPOSITORY token as CONVERSATIONS_REPOSITORY', () => {
    expect(CONVERSATIONS_REPOSITORY).toBe('CONVERSATIONS_REPOSITORY');
  });

  it('implements IConversationsRepository interface methods', async () => {
    const mockRepo: IConversationsRepository = {
      findDirectBetween: jest.fn().mockResolvedValue(null),
      createDirect: jest.fn().mockResolvedValue({ id: 'conv-1' }),
      createGroup: jest.fn().mockResolvedValue({ id: 'grp-1' }),
      findAllForUser: jest.fn().mockResolvedValue([]),
      findOneForUser: jest.fn().mockResolvedValue(null),
      updateGroup: jest.fn().mockResolvedValue({ id: 'grp-1' }),
      findParticipant: jest.fn().mockResolvedValue(null),
      findParticipants: jest.fn().mockResolvedValue([]),
      findBlockedUsers: jest.fn().mockResolvedValue([]),
      findParticipantIds: jest.fn().mockResolvedValue(['usr-1', 'usr-2']),
      addParticipants: jest.fn().mockResolvedValue(undefined),
      removeParticipant: jest.fn().mockResolvedValue(undefined),
      updateParticipant: jest.fn().mockResolvedValue({}),
      touchUpdatedAt: jest.fn().mockResolvedValue(undefined),
      countUnread: jest.fn().mockResolvedValue(0),
      findPinnedMessages: jest.fn().mockResolvedValue(['msg-1']),
      pinMessage: jest.fn().mockResolvedValue(undefined),
      unpinMessage: jest.fn().mockResolvedValue(undefined),
    };

    expect(await mockRepo.findParticipantIds('conv-1')).toEqual(['usr-1', 'usr-2']);
    expect(await mockRepo.countUnread('conv-1', 'usr-1')).toBe(0);
    expect(await mockRepo.findPinnedMessages('conv-1')).toEqual(['msg-1']);
  });
});
