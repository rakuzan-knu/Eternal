import { ConversationsController } from '../conversations.controller';
import type { ConversationsService } from '../conversations.service';
import type { MessagesService } from '../../messages/messages.service';
import type { RequestUser } from '../../../auth/interfaces/jwt-payload.interface';
import { MuteLevel, ReportCategory } from '@prisma/client';

describe('ConversationsController', () => {
  let controller: ConversationsController;
  let mockConversationsService: {
    getConversations: jest.Mock;
    getConversation: jest.Mock;
    deleteConversation: jest.Mock;
    createDirect: jest.Mock;
    createGroup: jest.Mock;
    setNickname: jest.Mock;
    setTheme: jest.Mock;
    proposeTheme: jest.Mock;
    respondThemeProposal: jest.Mock;
    unlinkSharedTheme: jest.Mock;
    muteConversation: jest.Mock;
    archiveConversation: jest.Mock;
    unarchiveConversation: jest.Mock;
    getBlockedUsers: jest.Mock;
    blockUser: jest.Mock;
    unblockUser: jest.Mock;
    reportUser: jest.Mock;
    clearHistory: jest.Mock;
  };
  let mockMessagesService: {
    uploadAttachment: jest.Mock;
  };

  const mockUser: RequestUser = {
    id: 'usr-1',
    email: 'user@test.com',
    username: 'user_1',
    sessionJti: 'jti-1',
  };

  beforeEach(() => {
    mockConversationsService = {
      getConversations: jest.fn().mockResolvedValue([]),
      getConversation: jest.fn().mockResolvedValue({ id: 'conv-1' }),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
      clearHistory: jest.fn().mockResolvedValue(undefined),
      createDirect: jest.fn().mockResolvedValue({ id: 'conv-1' }),
      createGroup: jest.fn().mockResolvedValue({ id: 'conv-group-1' }),
      setNickname: jest.fn().mockResolvedValue({}),
      setTheme: jest.fn().mockResolvedValue({}),
      proposeTheme: jest.fn().mockResolvedValue({}),
      respondThemeProposal: jest.fn().mockResolvedValue({}),
      unlinkSharedTheme: jest.fn().mockResolvedValue({}),
      muteConversation: jest.fn().mockResolvedValue({}),
      archiveConversation: jest.fn().mockResolvedValue({}),
      unarchiveConversation: jest.fn().mockResolvedValue({}),
      getBlockedUsers: jest.fn().mockResolvedValue([]),
      blockUser: jest.fn().mockResolvedValue(undefined),
      unblockUser: jest.fn().mockResolvedValue(undefined),
      reportUser: jest.fn().mockResolvedValue(undefined),
    };

    mockMessagesService = {
      uploadAttachment: jest.fn().mockResolvedValue({ url: 'https://cdn.com/a.png' }),
    };

    controller = new ConversationsController(
      mockConversationsService as unknown as ConversationsService,
      mockMessagesService as unknown as MessagesService,
    );
  });

  it('getAll and getOne delegate to ConversationsService', async () => {
    await controller.getAll(mockUser);
    expect(mockConversationsService.getConversations).toHaveBeenCalledWith('usr-1');

    await controller.getOne('conv-1', mockUser);
    expect(mockConversationsService.getConversation).toHaveBeenCalledWith('conv-1', 'usr-1');
  });

  it('createDirect and createGroup delegate to ConversationsService', async () => {
    await controller.createDirect({ participantId: 'usr-2' }, mockUser);
    expect(mockConversationsService.createDirect).toHaveBeenCalledWith('usr-1', {
      participantId: 'usr-2',
    });

    await controller.createGroup({ name: 'Group A', memberIds: ['usr-2'] }, mockUser);
    expect(mockConversationsService.createGroup).toHaveBeenCalledWith('usr-1', {
      name: 'Group A',
      memberIds: ['usr-2'],
    });
  });

  it('deleteConversation delegates to ConversationsService', async () => {
    await controller.deleteConversation('conv-1', mockUser);
    expect(mockConversationsService.deleteConversation).toHaveBeenCalledWith(
      'conv-1',
      'usr-1',
      false,
    );
  });

  it('clearHistory delegates to ConversationsService', async () => {
    await controller.clearHistory('conv-1', mockUser, 'true');
    expect(mockConversationsService.clearHistory).toHaveBeenCalledWith('conv-1', 'usr-1', true);
  });

  it('uploadAttachment delegates to MessagesService', async () => {
    const mockFile = {} as Express.Multer.File;
    await controller.uploadAttachment('conv-1', mockFile, mockUser);
    expect(mockMessagesService.uploadAttachment).toHaveBeenCalledWith('conv-1', 'usr-1', mockFile);
  });

  it('theme operations delegate to ConversationsService', async () => {
    await controller.setTheme('conv-1', { theme: 'cyberpunk' }, mockUser);
    expect(mockConversationsService.setTheme).toHaveBeenCalledWith('conv-1', 'usr-1', {
      theme: 'cyberpunk',
    });

    await controller.proposeTheme('conv-1', { theme: 'sunset' }, mockUser);
    expect(mockConversationsService.proposeTheme).toHaveBeenCalledWith('conv-1', 'usr-1', 'sunset');

    await controller.respondThemeProposal('conv-1', 'msg-prop-1', { action: 'ACCEPT' }, mockUser);
    expect(mockConversationsService.respondThemeProposal).toHaveBeenCalledWith(
      'conv-1',
      'msg-prop-1',
      'usr-1',
      'ACCEPT',
    );

    await controller.unlinkSharedTheme('conv-1', mockUser);
    expect(mockConversationsService.unlinkSharedTheme).toHaveBeenCalledWith('conv-1', 'usr-1');
  });

  it('mute, archive, unarchive, block, unblock, report delegate to ConversationsService', async () => {
    await controller.mute('conv-1', { muteLevel: MuteLevel.MESSAGES }, mockUser);
    expect(mockConversationsService.muteConversation).toHaveBeenCalledWith('conv-1', 'usr-1', {
      muteLevel: MuteLevel.MESSAGES,
    });

    await controller.archive('conv-1', mockUser);
    expect(mockConversationsService.archiveConversation).toHaveBeenCalledWith('conv-1', 'usr-1');

    await controller.unarchive('conv-1', mockUser);
    expect(mockConversationsService.unarchiveConversation).toHaveBeenCalledWith('conv-1', 'usr-1');

    await controller.getBlockedUsers(mockUser);
    expect(mockConversationsService.getBlockedUsers).toHaveBeenCalledWith('usr-1');

    await controller.block('usr-2', mockUser);
    expect(mockConversationsService.blockUser).toHaveBeenCalledWith('usr-1', 'usr-2');

    await controller.unblock('usr-2', mockUser);
    expect(mockConversationsService.unblockUser).toHaveBeenCalledWith('usr-1', 'usr-2');

    await controller.report(
      'usr-2',
      { category: ReportCategory.SPAM, details: 'Spamming' },
      mockUser,
    );
    expect(mockConversationsService.reportUser).toHaveBeenCalledWith('usr-1', 'usr-2', {
      category: ReportCategory.SPAM,
      details: 'Spamming',
    });
  });
});
