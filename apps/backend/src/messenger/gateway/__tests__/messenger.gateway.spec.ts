import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { Socket, Server } from 'socket.io';
import { MessageType } from '@prisma/client';
import { MessengerGateway, type AuthenticatedSocket } from '../messenger.gateway';
import type { MessagesService } from '../../messages/messages.service';
import type { ConversationsService } from '../../conversations/conversations.service';
import type { RedisService } from '../../../redis/redis.service';
import type { UsersService } from '../../../users/users.service';
import type { VisibilityResolver } from '../../../users/privacy/visibility.resolver';
import { WS_EVENTS } from '../../events/ws-events';

describe('MessengerGateway', () => {
  let gateway: MessengerGateway;
  let mockJwtService: {
    verifyAsync: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };
  let mockMessagesService: {
    send: jest.Mock;
    markRead: jest.Mock;
    edit: jest.Mock;
    delete: jest.Mock;
    forward: jest.Mock;
    addReaction: jest.Mock;
    removeReaction: jest.Mock;
    pinMessage: jest.Mock;
    unpinMessage: jest.Mock;
    messagesRepo: {
      findOne: jest.Mock;
    };
  };
  let mockConvsService: {
    getConversation: jest.Mock;
    assertMember: jest.Mock;
    touchUpdatedAt: jest.Mock;
    getParticipantIds: jest.Mock;
    getBlockRelationships: jest.Mock;
  };
  let mockRedisService: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    sadd: jest.Mock;
    srem: jest.Mock;
    scard: jest.Mock;
    incr: jest.Mock;
    zadd: jest.Mock;
    zremrangebyrank: jest.Mock;
    zrangebyscore: jest.Mock;
    expire: jest.Mock;
    exists: jest.Mock;
    getClient: jest.Mock;
  };
  let mockUsersService: {
    getFollowers: jest.Mock;
    touchLastSeen: jest.Mock;
  };
  let mockVisibility: {
    loadContext: jest.Mock;
    resolve: jest.Mock;
    resolvePresenceAudience: jest.Mock;
  };
  let mockServer: {
    to: jest.Mock;
    emit: jest.Mock;
  };
  let mockSocket: {
    id: string;
    handshake: {
      headers: Record<string, string>;
      auth?: Record<string, string>;
    };
    emit: jest.Mock;
    disconnect: jest.Mock;
    userId: string;
    join: jest.Mock;
    leave: jest.Mock;
  };

  const sampleMsg = {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'usr-1',
    body: 'Hello',
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockJwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'usr-1', type: 'access' }),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('jwt-secret'),
    };

    mockMessagesService = {
      send: jest.fn().mockResolvedValue(sampleMsg),
      markRead: jest.fn().mockResolvedValue(true),
      edit: jest.fn().mockResolvedValue({ ...sampleMsg, body: 'Edited' }),
      delete: jest.fn().mockResolvedValue({ messageId: 'msg-1', deletedForAll: true }),
      forward: jest.fn().mockResolvedValue([sampleMsg]),
      addReaction: jest.fn().mockResolvedValue(sampleMsg),
      removeReaction: jest.fn().mockResolvedValue(sampleMsg),
      pinMessage: jest.fn().mockResolvedValue(undefined),
      unpinMessage: jest.fn().mockResolvedValue(undefined),
      messagesRepo: {
        findOne: jest.fn().mockResolvedValue(sampleMsg),
      },
    };

    mockConvsService = {
      getConversation: jest.fn(),
      assertMember: jest.fn().mockResolvedValue(undefined),
      touchUpdatedAt: jest.fn().mockResolvedValue(undefined),
      getParticipantIds: jest.fn().mockResolvedValue(['usr-1', 'usr-2']),
      getBlockRelationships: jest.fn().mockResolvedValue({
        blockedByMe: new Set(),
        blockingMe: new Set(),
      }),
    };

    mockRedisService = {
      get: jest.fn().mockResolvedValue('0'),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      sadd: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      scard: jest.fn().mockResolvedValue(0),
      incr: jest.fn().mockResolvedValue(1),
      zadd: jest.fn().mockResolvedValue(1),
      zremrangebyrank: jest.fn().mockResolvedValue(0),
      zrangebyscore: jest.fn().mockResolvedValue([]),
      expire: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(0),
      getClient: jest.fn().mockReturnValue({
        multi: jest.fn().mockReturnValue({
          zremrangebyscore: jest.fn().mockReturnThis(),
          zadd: jest.fn().mockReturnThis(),
          zcard: jest.fn().mockReturnThis(),
          pexpire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([null, null, [null, 1], null]),
        }),
      }),
    };

    mockUsersService = {
      getFollowers: jest.fn(),
      touchLastSeen: jest.fn().mockResolvedValue(undefined),
    };

    mockVisibility = {
      loadContext: jest.fn().mockResolvedValue({}),
      resolve: jest.fn().mockReturnValue(true),
      resolvePresenceAudience: jest.fn().mockResolvedValue(new Set(['usr-2'])),
    };

    const emitFn = jest.fn();
    mockServer = {
      to: jest.fn().mockReturnValue({ emit: emitFn }),
      emit: emitFn,
    };

    mockSocket = {
      id: 'sock-1',
      handshake: {
        headers: { authorization: 'Bearer valid-jwt-token' },
      },
      emit: jest.fn(),
      disconnect: jest.fn(),
      userId: 'usr-1',
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
    };

    gateway = new MessengerGateway(
      mockJwtService as unknown as JwtService,
      mockConfigService as unknown as ConfigService,
      mockMessagesService as unknown as MessagesService,
      mockConvsService as unknown as ConversationsService,
      mockRedisService as unknown as RedisService,
      mockUsersService as unknown as UsersService,
      mockVisibility as unknown as VisibilityResolver,
    );

    Object.assign(gateway, { server: mockServer as unknown as Server });
  });

  describe('connection & heartbeat', () => {
    it('authenticates socket on connection and emits GATEWAY_READY and joins user room', async () => {
      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-jwt-token', {
        secret: 'jwt-secret',
      });
      expect(mockSocket.join).toHaveBeenCalledWith('user:usr-1');
      expect(mockRedisService.sadd).toHaveBeenCalledWith('user:sockets:usr-1', 'sock-1');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        WS_EVENTS.GATEWAY_READY,
        expect.objectContaining({ sessionId: 'sock-1' }),
      );
    });

    it('registers and clears socket timers cleanly', () => {
      const timer = setTimeout(() => {}, 10000);
      gateway.registerSocketTimer('sock-1', timer);
      expect(() => gateway.clearSocketTimers('sock-1')).not.toThrow();
    });

    it('extracts token from handshake.auth when headers are absent', async () => {
      const authSocket = {
        ...mockSocket,
        handshake: {
          headers: {},
          auth: { token: 'auth-token' },
        },
      };

      await gateway.handleConnection(authSocket as unknown as Socket);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('auth-token', {
        secret: 'jwt-secret',
      });
    });

    it('handles heartbeat', async () => {
      await gateway.handleHeartbeat(mockSocket as unknown as Socket & { userId: string });
      expect(mockRedisService.set).toHaveBeenCalledWith('user:presence:usr-1', 'online', 45);
    });

    it('disconnects socket when token verification fails', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('Invalid token'));

      await gateway.handleConnection(mockSocket as unknown as Socket);
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it('tracks socket disconnect and cleans up state and timers', async () => {
      const timer = setTimeout(() => {}, 10000);
      gateway.registerSocketTimer('sock-1', timer);
      await gateway.handleConnection(mockSocket as unknown as Socket);
      await gateway.handleDisconnect(mockSocket as unknown as Socket);

      expect(mockRedisService.srem).toHaveBeenCalledWith('user:sockets:usr-1', 'sock-1');
      expect(mockUsersService.touchLastSeen).toHaveBeenCalledWith('usr-1');
    });
  });

  describe('message events', () => {
    it('handleSendMessage sends and broadcasts message', async () => {
      const cb = jest.fn();
      await gateway.handleSendMessage(
        mockSocket as unknown as Socket & { userId: string },
        { conversationId: 'conv-1', text: 'Hello', messageType: MessageType.TEXT },
        cb,
      );
      expect(mockMessagesService.send).toHaveBeenCalled();
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok' }));
    });

    it('handleMarkRead, handleTypingStart, handleTypingStop', async () => {
      await gateway.handleMarkRead(mockSocket as unknown as Socket & { userId: string }, {
        conversationId: 'conv-1',
        messageId: 'msg-1',
      });
      expect(mockMessagesService.markRead).toHaveBeenCalled();

      await gateway.handleTypingStart(mockSocket as unknown as Socket & { userId: string }, {
        conversationId: 'conv-1',
      });
      await gateway.handleTypingStop(mockSocket as unknown as Socket & { userId: string }, {
        conversationId: 'conv-1',
      });
    });

    it('handleJoin and handleLeave', async () => {
      await gateway.handleJoin(mockSocket as unknown as Socket & { userId: string }, {
        conversationId: 'conv-1',
      });
      expect(mockSocket.join).toHaveBeenCalledWith('conv-1');

      await gateway.handleLeave(mockSocket as unknown as Socket & { userId: string }, {
        conversationId: 'conv-1',
      });
      expect(mockSocket.leave).toHaveBeenCalledWith('conv-1');
    });

    it('handleEditMessage & handleDeleteMessage', async () => {
      const cbEdit = jest.fn();
      await gateway.handleEditMessage(
        mockSocket as unknown as Socket & { userId: string },
        { messageId: 'msg-1', body: 'New' },
        cbEdit,
      );
      expect(mockMessagesService.edit).toHaveBeenCalled();
      expect(cbEdit).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok' }));

      const cbDel = jest.fn();
      await gateway.handleDeleteMessage(
        mockSocket as unknown as Socket & { userId: string },
        { messageId: 'msg-1', forAll: true },
        cbDel,
      );
      expect(mockMessagesService.delete).toHaveBeenCalled();
      expect(cbDel).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok' }));
    });

    it('handleForwardMessage, handleAddReaction, handleRemoveReaction', async () => {
      const cbFwd = jest.fn();
      await gateway.handleForwardMessage(
        mockSocket as unknown as Socket & { userId: string },
        { messageId: 'msg-1', conversationIds: ['conv-1'] },
        cbFwd,
      );
      expect(mockMessagesService.forward).toHaveBeenCalled();

      const cbReact = jest.fn();
      await gateway.handleAddReaction(
        mockSocket as unknown as Socket & { userId: string },
        { messageId: 'msg-1', emoji: '❤️' },
        cbReact,
      );
      expect(mockMessagesService.addReaction).toHaveBeenCalled();

      const cbRem = jest.fn();
      await gateway.handleRemoveReaction(
        mockSocket as unknown as Socket & { userId: string },
        { messageId: 'msg-1', emoji: '❤️' },
        cbRem,
      );
      expect(mockMessagesService.removeReaction).toHaveBeenCalled();
    });

    it('handles reactions and pin/unpin failure callbacks', async () => {
      mockMessagesService.addReaction.mockRejectedValueOnce(new Error('Add reaction error'));
      const cbAddFail = jest.fn();
      await gateway.handleAddReaction(
        mockSocket as unknown as Socket & { userId: string },
        { messageId: 'msg-1', emoji: '❤️' },
        cbAddFail,
      );
      expect(cbAddFail).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));

      mockMessagesService.removeReaction.mockRejectedValueOnce(new Error('Remove reaction error'));
      const cbRemFail = jest.fn();
      await gateway.handleRemoveReaction(
        mockSocket as unknown as Socket & { userId: string },
        { messageId: 'msg-1', emoji: '❤️' },
        cbRemFail,
      );
      expect(cbRemFail).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));

      mockMessagesService.pinMessage.mockRejectedValueOnce(new Error('Pin error'));
      const cbPinFail = jest.fn();
      await gateway.handlePinMessage(
        mockSocket as unknown as Socket & { userId: string },
        { conversationId: 'conv-1', messageId: 'msg-1' },
        cbPinFail,
      );
      expect(cbPinFail).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));

      mockMessagesService.unpinMessage.mockRejectedValueOnce(new Error('Unpin error'));
      const cbUnpinFail = jest.fn();
      await gateway.handleUnpinMessage(
        mockSocket as unknown as Socket & { userId: string },
        { conversationId: 'conv-1', messageId: 'msg-1' },
        cbUnpinFail,
      );
      expect(cbUnpinFail).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
    });

    it('handlePinMessage & handleUnpinMessage', async () => {
      const cbPin = jest.fn();
      await gateway.handlePinMessage(
        mockSocket as unknown as Socket & { userId: string },
        { conversationId: 'conv-1', messageId: 'msg-1' },
        cbPin,
      );
      expect(mockMessagesService.pinMessage).toHaveBeenCalled();

      const cbUnpin = jest.fn();
      await gateway.handleUnpinMessage(
        mockSocket as unknown as Socket & { userId: string },
        { conversationId: 'conv-1', messageId: 'msg-1' },
        cbUnpin,
      );
      expect(mockMessagesService.unpinMessage).toHaveBeenCalled();
    });
  });

  describe('showcase & story events and broadcasts', () => {
    it('showcase subscriptions and presence update event', () => {
      gateway.handleSubscribeShowcase(mockSocket as unknown as Socket, { targetUserId: 'u-1' });
      expect(mockSocket.join).toHaveBeenCalledWith('showcase:u-1');

      gateway.handleUnsubscribeShowcase(mockSocket as unknown as Socket, { targetUserId: 'u-1' });
      expect(mockSocket.leave).toHaveBeenCalledWith('showcase:u-1');

      gateway.handleShowcasePresenceUpdated({ userId: 'u-1', activityStatus: {} });
      expect(mockServer.to).toHaveBeenCalledWith('showcase:u-1');
    });

    it('story subscriptions and onEvent handlers', () => {
      gateway.handleSubscribeStory(mockSocket as unknown as Socket, { storyId: 's-1' });
      expect(mockSocket.join).toHaveBeenCalledWith('story:s-1');

      gateway.handleUnsubscribeStory(mockSocket as unknown as Socket, { storyId: 's-1' });
      expect(mockSocket.leave).toHaveBeenCalledWith('story:s-1');

      gateway.handleStoryCreated({ authorId: 'a-1', story: {} });
      expect(mockServer.emit).toHaveBeenCalledWith('story:new', expect.any(Object));

      gateway.handleStoryViewed({
        storyId: 's-1',
        authorId: 'a-1',
        viewerId: 'v-1',
        viewer: {},
        viewedAt: '2026-08-28',
      });
      expect(mockServer.to).toHaveBeenCalledWith('story:s-1');

      gateway.handleStoryReacted({
        storyId: 's-1',
        authorId: 'a-1',
        userId: 'u-1',
        user: {},
        emoji: '🔥',
        createdAt: '2026-08-28',
      });
      expect(mockServer.to).toHaveBeenCalledWith('story:s-1');

      gateway.handleStoryPollVoted({
        storyId: 's-1',
        authorId: 'a-1',
        userId: 'u-1',
        pollResult: {},
        optionIndex: 0,
      });
      expect(mockServer.to).toHaveBeenCalledWith('story:s-1');
    });

    it('emitConversationDeleted and emitMessagesCleared broadcast to server and participant user channels', () => {
      gateway.emitConversationDeleted('conv-1', ['usr-1', 'usr-2']);
      expect(mockServer.to).toHaveBeenCalledWith('conv-1');

      gateway.emitMessagesCleared('conv-1', ['usr-1', 'usr-2']);
      expect(mockServer.to).toHaveBeenCalledWith('conv-1');
    });

    it('handleMessageDelivered broadcasts messageDelivered receipt to conversation', async () => {
      const cb = jest.fn();
      await gateway.handleMessageDelivered(
        mockSocket as unknown as AuthenticatedSocket,
        { conversationId: 'c1111111-1111-1111-1111-111111111111', messageId: 'msg-100' },
        cb,
      );

      expect(mockConvsService.assertMember).toHaveBeenCalledWith(
        'c1111111-1111-1111-1111-111111111111',
        'usr-1',
      );
      expect(mockServer.to).toHaveBeenCalledWith(
        'conversation:c1111111-1111-1111-1111-111111111111',
      );
      expect(mockServer.emit).toHaveBeenCalledWith(
        WS_EVENTS.MESSAGE_DELIVERED,
        expect.objectContaining({
          messageId: 'msg-100',
          deliveredToUserId: 'usr-1',
        }),
      );
      expect(cb).toHaveBeenCalledWith({ status: 'ok' });
    });

    it('handleClientHibernate and handleClientWake manage Redis hibernation flags and sequence numbers', async () => {
      const cbHibernate = jest.fn();
      await gateway.handleClientHibernate(
        mockSocket as unknown as AuthenticatedSocket,
        {},
        cbHibernate,
      );
      expect(mockRedisService.set).toHaveBeenCalledWith('user:hibernated:usr-1:sock-1', '1', 300);
      expect(cbHibernate).toHaveBeenCalledWith({ status: 'ok' });

      mockRedisService.get.mockResolvedValueOnce('42');
      const cbWake = jest.fn();
      await gateway.handleClientWake(mockSocket as unknown as AuthenticatedSocket, cbWake);
      expect(mockRedisService.del).toHaveBeenCalledWith('user:hibernated:usr-1:sock-1');
      expect(mockRedisService.set).toHaveBeenCalledWith('user:presence:usr-1', 'online', 60);
      expect(cbWake).toHaveBeenCalledWith({ status: 'ok', currentSeq: 42 });
    });
  });
});
