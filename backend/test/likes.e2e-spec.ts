import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Likes (e2e)', () => {
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

  it('POST /posts/:id/like without auth returns 401', async () => {
    await request(app.getHttpServer()).post('/posts/sample-post-id/like').expect(401);
  });

  it('DELETE /posts/:id/like without auth returns 401', async () => {
    await request(app.getHttpServer()).delete('/posts/sample-post-id/like').expect(401);
  });
});
