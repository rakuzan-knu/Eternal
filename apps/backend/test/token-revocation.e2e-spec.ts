import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { RedisBloomFilterService } from '../src/redis/redis-bloom-filter.service';
import { TokenRevocationService } from '../src/auth/token-revocation.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('Token Revocation List & Redis Bloom Filter (e2e)', () => {
  let app: INestApplication<App>;
  let bloomFilter: RedisBloomFilterService;
  let revocationService: TokenRevocationService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    bloomFilter = app.get<RedisBloomFilterService>(RedisBloomFilterService);
    revocationService = app.get<TokenRevocationService>(TokenRevocationService);
    jwtService = app.get<JwtService>(JwtService);
    configService = app.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Redis Bloom Filter Low-Level Operations', () => {
    it('returns false for items not in the Bloom Filter', async () => {
      const randomJti = 'random-unadded-jti-' + Date.now();
      const exists = await bloomFilter.has('test:bloom:filter', randomJti);
      expect(exists).toBe(false);
    });

    it('adds and verifies presence of item in the Bloom Filter', async () => {
      const testJti = 'jti-bloom-test-1-' + Date.now();
      await bloomFilter.add('test:bloom:filter', testJti, 60);

      const exists = await bloomFilter.has('test:bloom:filter', testJti);
      expect(exists).toBe(true);
    });

    it('adds and verifies batch items in Bloom Filter in single roundtrip', async () => {
      const jtis = [
        'jti-batch-1-' + Date.now(),
        'jti-batch-2-' + Date.now(),
        'jti-batch-3-' + Date.now(),
      ];
      await bloomFilter.addMany('test:bloom:filter', jtis, 60);

      for (const jti of jtis) {
        const exists = await bloomFilter.has('test:bloom:filter', jti);
        expect(exists).toBe(true);
      }
    });
  });

  describe('2. Token Revocation Service (TRL)', () => {
    it('correctly identifies active non-revoked token as valid', async () => {
      const activeJti = 'active-jti-' + Date.now();
      const isRevoked = await revocationService.isTokenRevoked(activeJti, 'usr-test-1');
      expect(isRevoked).toBe(false);
    });

    it('revokes single JTI and detects revocation immediately via Bloom Filter', async () => {
      const targetJti = 'revoked-jti-' + Date.now();
      await revocationService.revokeJti(targetJti, 60);

      const isRevoked = await revocationService.isTokenRevoked(targetJti, 'usr-test-1');
      expect(isRevoked).toBe(true);
    });

    it('batch revokes multiple JTIs', async () => {
      const jtis = ['multi-jti-1-' + Date.now(), 'multi-jti-2-' + Date.now()];
      await revocationService.revokeJtis(jtis, 60);

      for (const jti of jtis) {
        const isRevoked = await revocationService.isTokenRevoked(jti, 'usr-test-1');
        expect(isRevoked).toBe(true);
      }
    });

    it('revokes all user tokens issued prior to user-wide revocation (logout all / password change)', async () => {
      const userId = 'user-security-lock-' + Date.now();
      const pastIssuedAtSec = Math.floor((Date.now() - 5000) / 1000);

      // User performs "Logout from all devices" or changes password
      await revocationService.revokeAllUserTokens(userId, 60);

      // Old token issued before logout is revoked
      const isOldTokenRevoked = await revocationService.isTokenRevoked(
        'some-old-jti',
        userId,
        pastIssuedAtSec,
      );
      expect(isOldTokenRevoked).toBe(true);

      // New token issued after revocation timestamp is valid
      const futureIssuedAtSec = Math.floor((Date.now() + 5000) / 1000);
      const isNewTokenRevoked = await revocationService.isTokenRevoked(
        'some-new-jti',
        userId,
        futureIssuedAtSec,
      );
      expect(isNewTokenRevoked).toBe(false);
    });
  });

  describe('3. Protected Route Verification with Revoked Token', () => {
    it('rejects API request with 401 Unauthorized when Bearer token has revoked JTI', async () => {
      const revokedJti = 'e2e-revoked-token-jti-' + Date.now();
      const secret =
        configService.get<string>('JWT_ACCESS_SECRET') ||
        'test-jwt-access-secret-at-least-32-chars-long-for-testing';

      const token = await jwtService.signAsync(
        {
          type: 'access',
          sub: 'test-user-id',
          email: 'test@example.com',
          username: 'testuser',
          jti: revokedJti,
        },
        { secret, expiresIn: '15m' },
      );

      // Revoke this token
      await revocationService.revokeJti(revokedJti, 60);

      // Attempt accessing protected session route
      const res = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      const body = res.body as { message?: string };
      expect(body.message).toContain('Token has been revoked');
    });
  });
});
