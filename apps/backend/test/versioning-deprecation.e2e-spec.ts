import type { INestApplication } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Strict API Versioning & RFC 8594 Deprecation Policy (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('serves VERSION_NEUTRAL infrastructure endpoints without /v1 prefix', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
    await request(app.getHttpServer()).get('/ping').expect(200);
    await request(app.getHttpServer()).get('/metrics').expect(200);
  });

  it('serves versioned /v1 endpoints normally', async () => {
    const res = await request(app.getHttpServer()).get('/v1/posts');
    expect(res.status).toBeLessThan(500);
    // Non-deprecated endpoints should not have Deprecation or Sunset headers
    expect(res.headers.deprecation).toBeUndefined();
    expect(res.headers.sunset).toBeUndefined();
  });

  it('sets Sunset (RFC 8594), Deprecation, and Link headers on deprecated endpoints', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/users/legacy/lookup?q=test')
      .expect(200);

    expect(res.headers.deprecation).toBe('true');
    expect(res.headers.sunset).toBe('Thu, 31 Dec 2026 23:59:59 GMT');
    expect(res.headers.link).toContain('rel="deprecation"');
    expect(res.headers.link).toContain('rel="sunset"');
    expect(res.headers.link).toContain('rel="successor-version"');
    expect(res.headers['x-api-deprecation-notice']).toContain('deprecated');
    expect(res.headers['x-api-replacement']).toBe('/v1/users/search');
  });

  it('tracks mobile client usage of deprecated endpoints in Prometheus metrics', async () => {
    // Send request with an old iOS client user agent
    await request(app.getHttpServer())
      .get('/v1/users/legacy/lookup?q=alice')
      .set('User-Agent', 'SocialNetwork-iOS/1.1.0')
      .expect(200);

    // Verify metrics endpoint reflects the call
    const metricsRes = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(metricsRes.text).toContain('app_deprecated_api_requests_total');
    expect(metricsRes.text).toContain('client_type="ios"');
    expect(metricsRes.text).toContain('is_mobile="true"');
  });
});
