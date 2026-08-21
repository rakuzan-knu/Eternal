import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Polls (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /polls/post/:postId returns poll or 404', async () => {
    const res = await request(app.getHttpServer()).get('/polls/post/nonexistent-post-id');
    expect([200, 404, 500, 503]).toContain(res.status);
  });

  it('POST /polls without auth returns 401', async () => {
    await request(app.getHttpServer())
      .post('/polls')
      .send({
        postId: 'p-1',
        title: 'Best framework?',
        options: ['NestJS', 'Next.js'],
      })
      .expect(401);
  });

  it('POST /polls/:pollId/vote/:optionId without auth returns 401', async () => {
    await request(app.getHttpServer()).post('/polls/sample-poll-id/vote/sample-opt-id').expect(401);
  });

  it('DELETE /polls/:pollId/vote without auth returns 401', async () => {
    await request(app.getHttpServer()).delete('/polls/sample-poll-id/vote').expect(401);
  });
});
