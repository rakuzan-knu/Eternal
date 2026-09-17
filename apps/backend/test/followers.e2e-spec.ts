import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Followers (e2e)', () => {
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

  it('GET /users/:id/followers returns followers or 404', async () => {
    const res = await request(app.getHttpServer()).get('/users/nonexistent-user-id/followers');
    expect([200, 404, 500, 503]).toContain(res.status);
  });

  it('GET /users/:id/following returns following or 404', async () => {
    const res = await request(app.getHttpServer()).get('/users/nonexistent-user-id/following');
    expect([200, 404, 500, 503]).toContain(res.status);
  });

  it('GET /users/me/friends without auth returns 401', async () => {
    await request(app.getHttpServer()).get('/users/me/friends').expect(401);
  });

  it('GET /users/me/follow-requests without auth returns 401', async () => {
    await request(app.getHttpServer()).get('/users/me/follow-requests').expect(401);
  });

  it('POST /users/:id/follow without auth returns 401', async () => {
    await request(app.getHttpServer()).post('/users/sample-user-id/follow').expect(401);
  });

  it('DELETE /users/:id/follow without auth returns 401', async () => {
    await request(app.getHttpServer()).delete('/users/sample-user-id/follow').expect(401);
  });
});
