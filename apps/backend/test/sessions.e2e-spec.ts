import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Sessions (e2e)', () => {
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

  it('GET /auth/sessions without auth returns 401', async () => {
    await request(app.getHttpServer()).get('/auth/sessions').expect(401);
  });

  it('DELETE /auth/sessions/:id without auth returns 401', async () => {
    await request(app.getHttpServer()).delete('/auth/sessions/sample-session-id').expect(401);
  });

  it('DELETE /auth/sessions without auth returns 401', async () => {
    await request(app.getHttpServer()).delete('/auth/sessions').expect(401);
  });
});
