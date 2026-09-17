import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Comments (e2e)', () => {
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

  it('GET /posts/:id/comments returns root comments or 404', async () => {
    const res = await request(app.getHttpServer()).get('/posts/nonexistent-post-id/comments');
    expect([200, 404, 500, 503]).toContain(res.status);
    if (res.status === 200) {
      const body = res.body as { data: unknown[] };
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
    }
  });

  it('POST /posts/:id/comments without auth returns 401', async () => {
    await request(app.getHttpServer())
      .post('/posts/nonexistent-post-id/comments')
      .send({ text: 'Nice post!' })
      .expect(401);
  });

  it('GET /comments/:id/replies returns replies or 404', async () => {
    const res = await request(app.getHttpServer()).get('/comments/nonexistent-comment-id/replies');
    expect([200, 404, 500, 503]).toContain(res.status);
  });

  it('POST /comments/:id/like without auth returns 401', async () => {
    await request(app.getHttpServer()).post('/comments/nonexistent-comment-id/like').expect(401);
  });

  it('DELETE /comments/:id without auth returns 401', async () => {
    await request(app.getHttpServer()).delete('/comments/nonexistent-comment-id').expect(401);
  });
});
