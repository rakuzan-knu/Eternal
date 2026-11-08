import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { authResponseSchema } from '../src/common/contracts/auth';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { assertIsolatedAuthFixtureEnvironment, seedExistingAuthUser } from './existing-auth-user';

describe('Data rights through authenticated HTTP routes (isolated databases)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const fixtureIds: string[] = [];
  const conversationIds: string[] = [];

  beforeAll(async () => {
    assertIsolatedAuthFixtureEnvironment();
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    if (!app) return;
    try {
      await prisma.$transaction([
        prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } }),
        prisma.post.deleteMany({ where: { authorId: { in: fixtureIds } } }),
        prisma.user.deleteMany({ where: { id: { in: fixtureIds } } }),
      ]);
    } finally {
      await app.close();
    }
  });

  it('exports only owned data, persists a report and deletes only the reauthenticated account', async () => {
    const runId = randomUUID().replaceAll('-', '').slice(0, 10);
    const owner = await seedExistingAuthUser(app, 'rightsowner', runId);
    fixtureIds.push(owner.id);
    const other = await seedExistingAuthUser(app, 'rightsother', runId);
    fixtureIds.push(other.id);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: owner.email, password: owner.password })
      .expect(200);
    const token = authResponseSchema.parse(login.body).accessToken;
    const ownPost = await prisma.post.create({
      data: { authorId: owner.id, content: 'owned-data-rights-fixture' },
    });
    const otherPost = await prisma.post.create({
      data: { authorId: other.id, content: 'other-user-private-fixture' },
    });
    const conversation = await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        participants: { create: [{ userId: owner.id }, { userId: other.id }] },
      },
    });
    conversationIds.push(conversation.id);
    const ownMessage = await prisma.message.create({
      data: { senderId: owner.id, conversationId: conversation.id, body: 'owned-message-fixture' },
    });
    const otherMessage = await prisma.message.create({
      data: { senderId: other.id, conversationId: conversation.id, body: 'other-message-fixture' },
    });

    await request(app.getHttpServer())
      .post('/users/me/data-export')
      .send({ section: 'account', password: owner.password })
      .expect(401);
    await request(app.getHttpServer())
      .post('/users/me/data-export')
      .auth(token, { type: 'bearer' })
      .send({ section: 'account', password: 'wrong-password' })
      .expect(401);
    const account = await request(app.getHttpServer())
      .post('/users/me/data-export')
      .auth(token, { type: 'bearer' })
      .send({ section: 'account', password: owner.password })
      .expect(200);
    expect(account.headers['cache-control']).toBe('no-store');
    expect(account.body.items).toEqual([expect.objectContaining({ id: owner.id })]);
    expect(account.text).not.toContain('passwordHash');
    expect(account.text).not.toContain(owner.password);
    const posts = await request(app.getHttpServer())
      .post('/users/me/data-export')
      .auth(token, { type: 'bearer' })
      .send({ section: 'posts', password: owner.password, limit: 10 })
      .expect(200);
    expect(posts.body.items).toEqual([expect.objectContaining({ id: ownPost.id })]);
    expect(posts.text).not.toContain(otherPost.content);
    const messages = await request(app.getHttpServer())
      .post('/messenger/me/data-export')
      .auth(token, { type: 'bearer' })
      .send({ section: 'messages', password: owner.password, limit: 10 })
      .expect(200);
    expect(messages.headers['cache-control']).toBe('no-store');
    expect(messages.body.items).toEqual([expect.objectContaining({ id: ownMessage.id })]);
    expect(messages.text).not.toContain(otherMessage.body);

    const report = await request(app.getHttpServer())
      .post(`/posts/${otherPost.id}/report`)
      .auth(token, { type: 'bearer' })
      .send({ category: 'SPAM', details: 'Synthetic acceptance test only' })
      .expect(200);
    expect(await prisma.report.findUnique({ where: { id: report.body.id } })).toMatchObject({
      reporterId: owner.id,
      reportedId: other.id,
      status: 'PENDING',
    });
    await request(app.getHttpServer())
      .delete(`/users/${other.id}`)
      .auth(token, { type: 'bearer' })
      .send({ password: owner.password })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/users/${owner.id}`)
      .auth(token, { type: 'bearer' })
      .send({ password: 'wrong-password' })
      .expect(401);
    expect(await prisma.user.findUnique({ where: { id: owner.id } })).not.toBeNull();
    await request(app.getHttpServer())
      .delete(`/users/${owner.id}`)
      .auth(token, { type: 'bearer' })
      .send({ password: owner.password })
      .expect(200);
    expect(await prisma.user.findUnique({ where: { id: owner.id } })).toBeNull();
    expect(await prisma.post.findUnique({ where: { id: ownPost.id } })).toBeNull();
    expect(await prisma.message.findUnique({ where: { id: ownMessage.id } })).toBeNull();
    expect(await prisma.message.findUnique({ where: { id: otherMessage.id } })).not.toBeNull();
    expect(await prisma.user.findUnique({ where: { id: other.id } })).not.toBeNull();
    expect(await prisma.post.findUnique({ where: { id: otherPost.id } })).not.toBeNull();
    await request(app.getHttpServer())
      .post('/users/me/data-export')
      .auth(token, { type: 'bearer' })
      .send({ section: 'account', password: owner.password })
      .expect(401);
  });
});
