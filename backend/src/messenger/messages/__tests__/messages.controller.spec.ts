import { MessagesController } from '../messages.controller';
import type { MessagesService } from '../messages.service';
import type { RequestUser } from '../../../auth/interfaces/jwt-payload.interface';

describe('MessagesController', () => {
  let controller: MessagesController;
  let mockMessagesService: {
    getMessages: jest.Mock;
    uploadAttachment: jest.Mock;
    search: jest.Mock;
    send: jest.Mock;
    edit: jest.Mock;
    delete: jest.Mock;
    forward: jest.Mock;
    react: jest.Mock;
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
      uploadAttachment: jest.fn().mockResolvedValue({ url: 'https://cdn.com/f.png' }),
      search: jest.fn().mockResolvedValue([]),
      send: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      edit: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      delete: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
      forward: jest.fn().mockResolvedValue([]),
      react: jest.fn().mockResolvedValue({ id: 'msg-1' }),
    };

    controller = new MessagesController(mockMessagesService as unknown as MessagesService);
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

  it('send and edit delegate to MessagesService', async () => {
    const sendDto = { conversationId: 'conv-1', text: 'Hello', messageType: 'TEXT' as const };
    await controller.send('conv-1', sendDto, mockUser);
    expect(mockMessagesService.send).toHaveBeenCalledWith('conv-1', 'usr-1', sendDto);

    const editDto = { messageId: 'msg-1', body: 'Edited' };
    await controller.edit('msg-1', editDto, mockUser);
    expect(mockMessagesService.edit).toHaveBeenCalledWith('msg-1', 'usr-1', editDto);
  });

  it('uploadAttachment delegates to MessagesService', async () => {
    const mockFile = {} as Express.Multer.File;
    await controller.uploadAttachment('conv-1', mockFile, mockUser);
    expect(mockMessagesService.uploadAttachment).toHaveBeenCalledWith('conv-1', 'usr-1', mockFile);
  });
});
