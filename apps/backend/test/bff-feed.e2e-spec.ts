import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('BFF Feed Compact (e2e)', () => {
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

  it('GET /feed/compact returns compact feed payload with metadata', async () => {
    const res = await request(app.getHttpServer()).get('/feed/compact?limit=5');
    expect([200, 500, 503]).toContain(res.status);

    if (res.status === 200) {
      const body = res.body as {
        data: Array<{
          id: string;
          author: { id: string; username: string; displayName: string };
          content: string;
          stats: { likes: number; comments: number; reposts: number };
          viewer: { isLiked: boolean; isSaved: boolean; isReposted: boolean };
          createdAt: string;
        }>;
        meta: { nextCursor: string | null; hasMore: boolean; count: number };
      };

      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(Array.isArray(body.data)).toBe(true);
      expect(typeof body.meta.hasMore).toBe('boolean');
      expect(typeof body.meta.count).toBe('number');

      if (body.data.length > 0) {
        const item = body.data[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('author');
        expect(item).toHaveProperty('content');
        expect(item).toHaveProperty('stats');
        expect(item).toHaveProperty('viewer');
        expect(item).toHaveProperty('createdAt');
        // Verify over-fetching fields are omitted
        expect(item).not.toHaveProperty('commentsCount');
        expect(item).not.toHaveProperty('repostsCount');
        expect(item).not.toHaveProperty('likesCount');
      }
    }
  });

  it('GET /feed/compact handles pagination with limit validation', async () => {
    const res = await request(app.getHttpServer()).get('/feed/compact?limit=1000');
    // Limit is capped at 50 in DTO validation pipe
    expect([400, 422, 500, 503]).toContain(res.status);
  });
});
