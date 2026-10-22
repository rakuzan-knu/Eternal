import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { io, type Socket } from 'socket.io-client';
import { vi } from 'vitest';
import { MessengerGateway } from '../src/messenger/gateway/messenger.gateway';
import { MessagesService } from '../src/messenger/messages/messages.service';
import { ConversationsService } from '../src/messenger/conversations/conversations.service';
import { RedisService } from '../src/redis/redis.service';
import { UsersService } from '../src/users/users.service';
import { VisibilityResolver } from '../src/users/privacy/visibility.resolver';

// Exercise actual Nest parameter injection and Socket.IO acknowledgements.
// Authentication/persistence are covered separately; this fixture owns no real data.
describe('Gateway acknowledgements through the Nest Socket.IO adapter', () => {
  let app: INestApplication<Server>;
  let socket: Socket;

  beforeAll(async () => {
    vi.spyOn(MessengerGateway.prototype, 'onModuleInit').mockImplementation(() => {});
    vi.spyOn(MessengerGateway.prototype, 'afterInit').mockImplementation(() => {});
    vi.spyOn(MessengerGateway.prototype, 'onModuleDestroy').mockImplementation(() => {});
    vi.spyOn(MessengerGateway.prototype, 'handleDisconnect').mockImplementation(async () => {});
    vi.spyOn(MessengerGateway.prototype, 'handleConnection').mockImplementation(async (client) => {
      Object.assign(client, { userId: 'adapter-user' });
    });
    const module = await Test.createTestingModule({
      providers: [
        MessengerGateway,
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: MessagesService, useValue: { assertCanSend: vi.fn() } },
        { provide: ConversationsService, useValue: {} },
        {
          provide: RedisService,
          useValue: {
            get: vi.fn(async (key: string) =>
              key.startsWith('idemp:msg:') ? JSON.stringify({ id: 'cached-message' }) : '0',
            ),
            zrangebyscore: vi.fn(async () => []),
          },
        },
        { provide: UsersService, useValue: {} },
        { provide: VisibilityResolver, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP listener');
    socket = io(`http://127.0.0.1:${address.port}/messenger`, {
      transports: ['websocket'],
      reconnection: false,
    });
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
  });

  afterAll(async () => {
    socket?.disconnect();
    await app?.close();
    vi.restoreAllMocks();
  });

  it('acknowledges resume with replay data', async () => {
    const response: unknown = await socket.timeout(2000).emitWithAck('gatewayResume', {
      sessionId: 'adapter-session',
      lastSeq: 0,
    });
    expect(response).toEqual({ status: 'ok', events: [], currentSeq: 0 });
  });

  it('acknowledges an idempotent send and carries client sequence metadata', async () => {
    const response: unknown = await socket.timeout(2000).emitWithAck('sendMessage', {
      conversationId: 'adapter-conversation',
      text: 'adapter test',
      clientMessageId: 'adapter-message',
      clientSeq: 1,
    });
    expect(response).toEqual({
      status: 'ok',
      message: { id: 'cached-message' },
      clientMessageId: 'adapter-message',
      clientSeq: 1,
    });
  });
});
