import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Users (e2e)', () => {
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

  it('GET /users/by-username/:username returns 404 for non-existent user', async () => {
    await request(app.getHttpServer()).get('/users/by-username/nonexistent_user_9999').expect(404);
  });

  it('GET /users/:id returns 404 for non-existent user id', async () => {
    await request(app.getHttpServer()).get('/users/nonexistent-id-9999').expect(404);
  });
});
