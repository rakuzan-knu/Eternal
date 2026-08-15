import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Health (e2e)', () => {
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

  it('GET /health returns health response status', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect([200, 503]).toContain(res.status);
    const body = res.body as { status: string; timestamp: string; uptime: number };
    expect(body).toHaveProperty('status');
    expect(['ok', 'degraded', 'error']).toContain(body.status);
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
  });

  it('GET /health/live returns status ok', async () => {
    const res = await request(app.getHttpServer()).get('/health/live').expect(200);
    const body = res.body as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });

  it('GET /health/ready returns readiness check response', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready');
    expect([200, 503]).toContain(res.status);
    const body = res.body as { status: string; services: { database: string; redis: string } };
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('services');
  });

  it('GET /ping returns status ok', async () => {
    const res = await request(app.getHttpServer()).get('/ping').expect(200);
    const body = res.body as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });
});
