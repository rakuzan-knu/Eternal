import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

interface AuthedUser {
  id: string;
  token: string;
}

/** Unique suffix so repeated runs never collide on email/username uniqueness. */
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

type AuthedClient = {
  get: (path: string) => request.Test;
  post: (path: string) => request.Test;
  patch: (path: string) => request.Test;
  delete: (path: string) => request.Test;
};

let client: (token: string) => AuthedClient;

function makeClient(app: INestApplication<App>): (token: string) => AuthedClient {
  const server = app.getHttpServer();
  return (token: string) => ({
    get: (path: string) => request(server).get(path).set('Authorization', `Bearer ${token}`),
    post: (path: string) => request(server).post(path).set('Authorization', `Bearer ${token}`),
    patch: (path: string) => request(server).patch(path).set('Authorization', `Bearer ${token}`),
    delete: (path: string) => request(server).delete(path).set('Authorization', `Bearer ${token}`),
  });
}

describe('Chat (e2e)', () => {
  let app: INestApplication<App>;
  let alice: AuthedUser;
  let bob: AuthedUser;
  let directId: string;
  let groupdId: string;
  let messageId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    client = makeClient(app);

    alice = await registerUser(app, 'alice');
    bob = await registerUser(app, 'bob');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('rejects unauthenticated access to conversations', async () => {
    await request(app.getHttpServer()).get('/conversations').expect(401);
  });

  it('refuses a direct conversation with yourself', async () => {
    await client(alice.token)
      .post('/conversations/direct')
      .send({ participantId: alice.id })
      .expect(400);
  });

  it('returns 404 when the direct participant does not exist', async () => {
    await client(alice.token)
      .post('/conversations/direct')
      .send({ participantId: '00000000-0000-4000-8000-000000000000' })
      .expect(404);
  });

  it('creates a direct conversation between two users', async () => {
    const response = await client(alice.token)
      .post('/conversations/direct')
      .send({ participantId: bob.id })
      .expect(201);

    const body = response.body as { id: string; type: string; participants: unknown[] };
    expect(body.type).toBe('DIRECT');
    expect(body.participants).toHaveLength(2);
    directId = body.id;
  });

  it('re-uses the same direct conversation on repeat creation', async () => {
    const response = await client(bob.token)
      .post('/conversations/direct')
      .send({ participantId: alice.id })
      .expect(201);

    expect((response.body as { id: string }).id).toBe(directId);
  });

  it('lists the conversation for both participants', async () => {
    for (const user of [alice, bob]) {
      const response = await client(user.token).get('/conversations').expect(200);
      const list = response.body as { id: string }[];
      expect(list.some((c) => c.id === directId)).toBe(true);
    }
  });

  it('rejects empty messages with a validation error', async () => {
    await client(alice.token)
      .post(`/conversations/${directId}/messages`)
      .send({ conversationId: directId })
      .expect(400);
  });

  it('sends a text message and returns the mapped view', async () => {
    const response = await client(alice.token)
      .post(`/conversations/${directId}/messages`)
      .send({ conversationId: directId, text: 'Hello from alice!' })
      .expect(201);

    const body = response.body as { id: string; body: string; sender: { id: string } };
    expect(body.body).toBe('Hello from alice!');
    expect(body.sender.id).toBe(alice.id);
    messageId = body.id;
  });

  it('returns the message in the conversation history for the other user', async () => {
    const response = await client(bob.token).get(`/conversations/${directId}/messages`).expect(200);

    const body = response.body as { data: { id: string; body: string }[] };
    const found = body.data.find((m) => m.id === messageId);
    expect(found?.body).toBe('Hello from alice!');
  });

  it('lets the sender edit their message', async () => {
    const response = await client(alice.token)
      .patch(`/conversations/${directId}/messages/${messageId}`)
      .send({ messageId, body: 'Hello from alice (edited)!' })
      .expect(200);

    const body = response.body as { body: string; isEdited: boolean };
    expect(body.body).toBe('Hello from alice (edited)!');
    expect(body.isEdited).toBe(true);
  });

  it('forbids editing another member’s message', async () => {
    await client(bob.token)
      .patch(`/conversations/${directId}/messages/${messageId}`)
      .send({ messageId, body: 'bob was here' })
      .expect(403);
  });

  it('adds and removes a reaction', async () => {
    const reacted = await client(bob.token)
      .post(`/conversations/${directId}/messages/${messageId}/reactions`)
      .send({ messageId, emoji: '👍' })
      .expect(201);

    const reactions = (reacted.body as { reactions: { emoji: string; count: number }[] }).reactions;
    expect(reactions.some((r) => r.emoji === '👍' && r.count === 1)).toBe(true);

    const removed = await client(bob.token)
      .delete(`/conversations/${directId}/messages/${messageId}/reactions/👍`)
      .expect(200);
    expect(
      ((removed.body as { reactions: { emoji: string }[] }).reactions ?? []).some(
        (r) => r.emoji === '👍',
      ),
    ).toBe(false);
  });

  it('marks the conversation as read for the recipient', async () => {
    await client(bob.token)
      .post(`/conversations/${directId}/messages/read`)
      .send({ conversationId: directId })
      .expect(204);
  });

  it('pins and unpins a message', async () => {
    await client(alice.token)
      .post(`/conversations/${directId}/messages/${messageId}/pin`)
      .send({ messageId })
      .expect(204);

    const pinned = await client(alice.token).get(`/conversations/${directId}/messages`).expect(200);
    const body = pinned.body as { data: { id: string; isPinned: boolean }[] };
    expect(body.data.find((m) => m.id === messageId)?.isPinned).toBe(true);

    await client(alice.token)
      .delete(`/conversations/${directId}/messages/${messageId}/pin`)
      .expect(204);
  });

  it('creates a group conversation with members', async () => {
    const response = await client(alice.token)
      .post('/conversations/group')
      .send({ name: 'E2E group', memberIds: [bob.id] })
      .expect(201);

    const body = response.body as { id: string; type: string; name: string };
    expect(body.type).toBe('GROUP');
    expect(body.name).toBe('E2E group');
    groupdId = body.id;
  });

  it('forwards a message into the group conversation', async () => {
    const response = await client(alice.token)
      .post(`/conversations/${directId}/messages/${messageId}/forward`)
      .send({ messageId, conversationIds: [groupdId] })
      .expect(201);

    const body = response.body as unknown;
    expect(body).toBeDefined();

    const groupMessages = await client(bob.token)
      .get(`/conversations/${groupdId}/messages`)
      .expect(200);
    const list = groupMessages.body as { data: { forwardedFrom: { id: string } | null }[] };
    expect(list.data.some((m) => m.forwardedFrom?.id === messageId)).toBe(true);
  });

  it('deletes the message for everyone, leaving a tombstone', async () => {
    const response = await client(alice.token)
      .delete(`/conversations/${directId}/messages/${messageId}`)
      .send({ messageId, forAll: true })
      .expect(200);
    expect((response.body as { deletedForAll: boolean }).deletedForAll).toBe(true);

    const history = await client(bob.token).get(`/conversations/${directId}/messages`).expect(200);
    const list = history.body as { data: { id: string }[] };
    expect(list.data.some((m) => m.id === messageId)).toBe(false);
  });
});
