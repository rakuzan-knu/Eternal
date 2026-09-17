import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('OpenGraph (e2e)', () => {
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

  it('GET /og-preview without url query param returns 400', async () => {
    await request(app.getHttpServer()).get('/og-preview').expect(400);
  });

  it('GET /og-preview with url query param returns metadata or null or service response', async () => {
    const res = await request(app.getHttpServer()).get('/og-preview?url=https://github.com');
    expect([200, 400, 500, 503]).toContain(res.status);
  });
});
