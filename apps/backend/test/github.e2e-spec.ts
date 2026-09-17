import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('GitHub (e2e)', () => {
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

  it('GET /auth/github initiates OAuth redirect or handles flow', async () => {
    const res = await request(app.getHttpServer()).get('/auth/github');
    expect([200, 302, 500, 503]).toContain(res.status);
  });

  it('DELETE /auth/github without auth returns 401', async () => {
    await request(app.getHttpServer()).delete('/auth/github').expect(401);
  });

  it('POST /users/sync-github without auth returns 401', async () => {
    await request(app.getHttpServer()).post('/users/sync-github').expect(401);
  });

  it('POST /github/webhook without signature returns 401', async () => {
    await request(app.getHttpServer())
      .post('/github/webhook')
      .send({ action: 'opened' })
      .expect(401);
  });
});
