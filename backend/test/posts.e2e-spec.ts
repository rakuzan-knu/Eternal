import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Posts (e2e)', () => {
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

  it('GET /posts returns feed array or empty pagination', async () => {
    const res = await request(app.getHttpServer()).get('/posts').expect(200);
    const body = res.body as { data: unknown[] };
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /posts/:id returns 404 for non-existent post', async () => {
    await request(app.getHttpServer()).get('/posts/nonexistent-id-12345').expect(404);
  });
});
