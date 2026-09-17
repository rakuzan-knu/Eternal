import { MessagesController } from '../messages.controller';
import type { MessagesService } from '../messages.service';
import type { RequestUser } from '../../../auth/interfaces/jwt-payload.interface';

describe('MessagesController', () => {
  let controller: MessagesController;
  let mockMessagesService: {
    getMessages: jest.Mock;
    getActivityMap: jest.Mock;
    getAroundDate: jest.Mock;
    getAround: jest.Mock;
    batchDelete: jest.Mock;
    batchForward: jest.Mock;
    uploadAttachment: jest.Mock;
    search: jest.Mock;
    send: jest.Mock;
    edit: jest.Mock;
    delete: jest.Mock;
    forward: jest.Mock;
    addReaction: jest.Mock;
    removeReaction: jest.Mock;
    markRead: jest.Mock;
    pinMessage: jest.Mock;
    unpinMessage: jest.Mock;
  };

  const mockUser: RequestUser = {
    id: 'usr-1',
    email: 'user@test.com',
    username: 'user_1',
    sessionJti: 'jti-1',
  };

  beforeEach(() => {
    mockMessagesService = {
      getMessages: jest.fn().mockResolvedValue({ data: [], nextCursor: null }),
      getActivityMap: jest.fn().mockResolvedValue({ '2026-08-21': { messageCount: 5 } }),
      getAroundDate: jest.fn().mockResolvedValue({ data: [], nextCursor: null }),
      getAround: jest.fn().mockResolvedValue({ data: [], nextCursor: null }),
      batchDelete: jest.fn().mockResolvedValue({ deletedCount: 2 }),
      batchForward: jest.fn().mockResolvedValue({ forwardedCount: 2 }),
      uploadAttachment: jest.fn().mockResolvedValue({ url: 'https://cdn.com/f.png' }),
      search: jest.fn().mockResolvedValue([]),
      send: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      edit: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      delete: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
      forward: jest.fn().mockResolvedValue([]),
      addReaction: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      removeReaction: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      markRead: jest.fn().mockResolvedValue(true),
      pinMessage: jest.fn().mockResolvedValue(undefined),
      unpinMessage: jest.fn().mockResolvedValue(undefined),
    };

    controller = new MessagesController(mockMessagesService as unknown as MessagesService);
  });

  it('getActivity and getAroundDate and getAround delegate to MessagesService', async () => {
    await controller.getActivity(
      'conv-1',
      { year: 2026, month: 8, timezone: 'Europe/Moscow' },
      mockUser,
    );
    expect(mockMessagesService.getActivityMap).toHaveBeenCalledWith(
      'conv-1',
      2026,
      8,
      'Europe/Moscow',
      'usr-1',
    );

    await controller.getAroundDate(
      'conv-1',
      { date: '2026-08-21T10:00:00.000Z', limit: 50 },
      mockUser,
    );
    expect(mockMessagesService.getAroundDate).toHaveBeenCalledWith(
      'conv-1',
      '2026-08-21T10:00:00.000Z',
      'usr-1',
      50,
    );

    await controller.getAround('conv-1', 'msg-center', mockUser);
    expect(mockMessagesService.getAround).toHaveBeenCalledWith('conv-1', 'msg-center', 'usr-1');
  });

  it('batch operations delegate to MessagesService', async () => {
    await controller.batchDelete(
      'conv-1',
      { messageIds: ['msg-1', 'msg-2'], forAll: true },
      mockUser,
    );
    expect(mockMessagesService.batchDelete).toHaveBeenCalledWith('conv-1', 'usr-1', {
      messageIds: ['msg-1', 'msg-2'],
      forAll: true,
    });

    await controller.batchForward(
      'conv-1',
      { messageIds: ['msg-1'], conversationIds: ['conv-2'] },
      mockUser,
    );
    expect(mockMessagesService.batchForward).toHaveBeenCalledWith('conv-1', 'usr-1', {
      messageIds: ['msg-1'],
      conversationIds: ['conv-2'],
    });
  });

  it('getMessages and search delegate to MessagesService', async () => {
    await controller.getMessages('conv-1', { limit: 20 }, mockUser);
    expect(mockMessagesService.getMessages).toHaveBeenCalledWith('conv-1', 'usr-1', { limit: 20 });

    await controller.search('conv-1', { q: 'hello', limit: 20 }, mockUser);
    expect(mockMessagesService.search).toHaveBeenCalledWith('conv-1', 'usr-1', {
      q: 'hello',
      limit: 20,
    });
  });

  it('send and edit and delete and forward delegate to MessagesService', async () => {
    const sendDto = { conversationId: 'conv-1', text: 'Hello', messageType: 'TEXT' as const };
    await controller.send('conv-1', sendDto, mockUser);
    expect(mockMessagesService.send).toHaveBeenCalledWith('conv-1', 'usr-1', sendDto);

    const editDto = { messageId: 'msg-1', body: 'Edited' };
    await controller.edit('msg-1', editDto, mockUser);
    expect(mockMessagesService.edit).toHaveBeenCalledWith('msg-1', 'usr-1', editDto);

    await controller.delete('msg-1', { messageId: 'msg-1', forAll: true }, mockUser);
    expect(mockMessagesService.delete).toHaveBeenCalledWith('msg-1', 'usr-1', {
      messageId: 'msg-1',
      forAll: true,
    });

    await controller.forward(
      'msg-1',
      { messageId: 'msg-1', conversationIds: ['conv-2'] },
      mockUser,
    );
    expect(mockMessagesService.forward).toHaveBeenCalledWith('msg-1', 'usr-1', {
      messageId: 'msg-1',
      conversationIds: ['conv-2'],
    });
  });

  it('reactions, read status, and pin/unpin delegate to MessagesService', async () => {
    await controller.addReaction('msg-1', { messageId: 'msg-1', emoji: '🔥' }, mockUser);
    expect(mockMessagesService.addReaction).toHaveBeenCalledWith('msg-1', 'usr-1', {
      messageId: 'msg-1',
      emoji: '🔥',
    });

    await controller.removeReaction('msg-1', '🔥', mockUser);
    expect(mockMessagesService.removeReaction).toHaveBeenCalledWith('msg-1', 'usr-1', '🔥');

    await controller.markRead('conv-1', mockUser);
    expect(mockMessagesService.markRead).toHaveBeenCalledWith('conv-1', 'usr-1');

    await controller.pin('conv-1', 'msg-1', mockUser);
    expect(mockMessagesService.pinMessage).toHaveBeenCalledWith('conv-1', 'msg-1', 'usr-1');

    await controller.unpin('conv-1', 'msg-1', mockUser);
    expect(mockMessagesService.unpinMessage).toHaveBeenCalledWith('conv-1', 'msg-1', 'usr-1');
  });

  it('uploadAttachment delegates to MessagesService', async () => {
    const mockFile = {} as Express.Multer.File;
    await controller.uploadAttachment('conv-1', mockFile, mockUser);
    expect(mockMessagesService.uploadAttachment).toHaveBeenCalledWith('conv-1', 'usr-1', mockFile);
  });
});
