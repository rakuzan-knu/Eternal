import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Banners (e2e)', () => {
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

  it('POST /users/:id/banner without auth returns 401', async () => {
    await request(app.getHttpServer()).post('/users/sample-user-id/banner').expect(401);
  });

  it('DELETE /users/:id/banner without auth returns 401', async () => {
    await request(app.getHttpServer()).delete('/users/sample-user-id/banner').expect(401);
  });
});
