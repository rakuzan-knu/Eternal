import { MESSAGES_REPOSITORY, type IMessagesRepository } from '../messages-repository.interface';

describe('messages-repository.interface', () => {
  it('defines MESSAGES_REPOSITORY token as MESSAGES_REPOSITORY', () => {
    expect(MESSAGES_REPOSITORY).toBe('MESSAGES_REPOSITORY');
  });

  it('implements IMessagesRepository interface methods', async () => {
    const mockRepo: IMessagesRepository = {
      create: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      findMany: jest.fn().mockResolvedValue([]),
      findAround: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      edit: jest.fn().mockResolvedValue({ id: 'msg-1', body: 'edited' }),
      deleteForAll: jest.fn().mockResolvedValue(undefined),
      deleteForMe: jest.fn().mockResolvedValue(undefined),
      markRead: jest.fn().mockResolvedValue(null),
      markAllRead: jest.fn().mockResolvedValue(undefined),
      addReaction: jest.fn().mockResolvedValue({ id: 'react-1' }),
      removeReaction: jest.fn().mockResolvedValue(undefined),
      getReactions: jest.fn().mockResolvedValue([]),
      search: jest.fn().mockResolvedValue([]),
      findLastMessage: jest.fn().mockResolvedValue(null),
      belongsToConversation: jest.fn().mockResolvedValue(true),
    };

    expect(await mockRepo.belongsToConversation('msg-1', 'conv-1')).toBe(true);
    expect(await mockRepo.getReactions('msg-1')).toEqual([]);
  });
});
