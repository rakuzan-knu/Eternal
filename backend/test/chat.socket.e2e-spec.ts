import type { INestApplication } from '@nestjs/common';
import type { Server as HttpServer } from 'http';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { io, type Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';

interface AuthedUser {
  id: string;
  token: string;
}

const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function registerUser(app: INestApplication<App>, name: string): Promise<AuthedUser> {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email: `${name}.${runId}@example.com`,
      username: `${name}${runId}`,
      displayName: name,
      password: 'Password123!',
    })
    .expect(201);
  const body = response.body as { user: { id: string }; accessToken: string };
  return { id: body.user.id, token: body.accessToken };
}

/** Resolves with the next payload for `event`, or rejects after `ms`. */
function waitForEvent<T>(socket: Socket, event: string, ms = 8000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for "${event}"`)), ms);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function httpPort(app: INestApplication<App>): number {
  const address = (app.getHttpServer() as unknown as HttpServer).address();
  return (address as { port: number }).port;
}

function connect(app: INestApplication<App>, token: string): Socket {
  return io(`http://localhost:${httpPort(app)}/messenger`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
  });
}

describe('Chat & notifications over WebSocket (e2e)', () => {
  let app: INestApplication<App>;
  let alice: AuthedUser;
  let bob: AuthedUser;
  let aliceSocket: Socket;
  let bobSocket: Socket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // A real listening port is required for the Socket.IO gateway.
    await app.listen(0);

    alice = await registerUser(app, 'alice');
    bob = await registerUser(app, 'bob');

    aliceSocket = connect(app, alice.token);
    bobSocket = connect(app, bob.token);
    await Promise.all([
      waitForEvent<{ sessionId: string }>(aliceSocket, 'gatewayReady'),
      waitForEvent<{ sessionId: string }>(bobSocket, 'gatewayReady'),
    ]);
  });

  afterAll(async () => {
    aliceSocket?.disconnect();
    bobSocket?.disconnect();
    if (app) {
      await app.close();
    }
  });

  it('rejects sockets without a valid token', async () => {
    await new Promise<void>((resolve, reject) => {
      const rogue = io(`http://localhost:${httpPort(app)}/messenger`, {
        transports: ['websocket'],
        reconnection: false,
      });
      // The gateway completes the engine.io handshake, then kicks the socket
      // from handleConnection — observed as either connect_error or disconnect.
      const fail = setTimeout(() => {
        rogue.disconnect();
        reject(new Error('unauthenticated socket was not rejected'));
      }, 8000);
      const rejected = () => {
        clearTimeout(fail);
        rogue.disconnect();
        resolve();
      };
      rogue.on('connect_error', rejected);
      rogue.on('disconnect', rejected);
    });
  });

  it('delivers a newFollower notification in real time', async () => {
    const notification = waitForEvent<{ follower: { id: string } }>(bobSocket, 'newFollower');

    await request(app.getHttpServer())
      .post(`/users/${bob.id}/follow`)
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);

    const payload = await notification;
    expect(payload.follower.id).toBe(alice.id);
  });

  it('delivers new messages to the other participant in real time', async () => {
    const created = await request(app.getHttpServer())
      .post('/conversations/direct')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ participantId: bob.id })
      .expect(201);
    const conversationId = (created.body as { id: string }).id;

    const received = waitForEvent<{ conversationId: string; message: { body: string } }>(
      bobSocket,
      'newMessage',
    );

    bobSocket.emit('joinConversation', { conversationId });
    aliceSocket.emit('joinConversation', { conversationId });

    aliceSocket.emit('sendMessage', { conversationId, text: 'Hello over websocket!' });

    const payload = await received;
    expect(payload.conversationId).toBe(conversationId);
    expect(payload.message.body).toBe('Hello over websocket!');
  });

  it('broadcasts typing indicators to the conversation', async () => {
    const typed = waitForEvent<{ conversationId: string; userId: string }>(bobSocket, 'typing');

    const list = await request(app.getHttpServer())
      .get('/conversations')
      .set('Authorization', `Bearer ${alice.token}`)
      .expect(200);
    const conversationId = (list.body as { id: string }[])[0].id;

    aliceSocket.emit('typingStart', { conversationId });

    const payload = await typed;
    expect(payload.conversationId).toBe(conversationId);
    expect(payload.userId).toBe(alice.id);
  });
});
