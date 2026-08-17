import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { Socket, Server } from 'socket.io';
import { MessengerGateway } from '../messenger.gateway';
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
  };
  let mockConvsService: {
    getConversation: jest.Mock;
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
    expire: jest.Mock;
  };
  let mockUsersService: {
    getFollowers: jest.Mock;
    touchLastSeen: jest.Mock;
  };
  let mockVisibility: {
    loadContext: jest.Mock;
    resolve: jest.Mock;
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
    userId?: string;
  };

  beforeEach(() => {
    mockJwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'usr-1', type: 'access' }),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('jwt-secret'),
    };

    mockMessagesService = {
      send: jest.fn(),
      markRead: jest.fn(),
    };

    mockConvsService = {
      getConversation: jest.fn(),
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
      expire: jest.fn().mockResolvedValue(1),
    };

    mockUsersService = {
      getFollowers: jest.fn(),
      touchLastSeen: jest.fn().mockResolvedValue(undefined),
    };

    mockVisibility = {
      loadContext: jest.fn().mockResolvedValue({}),
      resolve: jest.fn().mockReturnValue(true),
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

  describe('handleConnection & handleDisconnect', () => {
    it('authenticates socket on connection and emits GATEWAY_READY', async () => {
      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-jwt-token', {
        secret: 'jwt-secret',
      });
      expect(mockRedisService.sadd).toHaveBeenCalledWith('user:sockets:usr-1', 'sock-1');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        WS_EVENTS.GATEWAY_READY,
        expect.objectContaining({ sessionId: 'sock-1' }),
      );
    });

    it('disconnects socket when token verification fails', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('Invalid token'));

      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it('tracks socket disconnect and cleans up state', async () => {
      await gateway.handleConnection(mockSocket as unknown as Socket);
      await gateway.handleDisconnect(mockSocket as unknown as Socket);

      expect(mockRedisService.srem).toHaveBeenCalledWith('user:sockets:usr-1', 'sock-1');
      expect(mockUsersService.touchLastSeen).toHaveBeenCalledWith('usr-1');
    });
  });

  describe('broadcast methods', () => {
    it('emitMessageEdited, emitMessageDeleted, emitReactionAdded emit to conversation room', () => {
      gateway.emitMessageEdited('conv-1', { id: 'msg-1', body: 'Edited' });
      expect(mockServer.to).toHaveBeenCalledWith('conv-1');

      gateway.emitMessageDeleted('conv-1', 'msg-1', true);
      expect(mockServer.to).toHaveBeenCalledWith('conv-1');

      gateway.emitReactionAdded('conv-1', { id: 'msg-1', emoji: '🔥' });
      expect(mockServer.to).toHaveBeenCalledWith('conv-1');

      gateway.emitMessagePinned('conv-1', 'msg-1');
      expect(mockServer.to).toHaveBeenCalledWith('conv-1');
    });

    it('emitToUser emits to active sockets of user and increments sequence in Redis', async () => {
      await gateway.handleConnection(mockSocket as unknown as Socket);

      gateway.emitToUser('usr-1', WS_EVENTS.SOCIAL_NOTIFICATION, { text: 'Notification' });

      expect(mockRedisService.incr).toHaveBeenCalledWith('user:seq:usr-1');
      expect(mockServer.to).toHaveBeenCalledWith('sock-1');
    });
  });
});
