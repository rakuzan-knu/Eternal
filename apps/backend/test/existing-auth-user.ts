import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types';
import { authResponseSchema } from '../src/common/contracts/auth';
import { PrismaService } from '../src/common/prisma/prisma.service';

export interface ExistingAuthUser {
  id: string;
  email: string;
  username: string;
  password: string;
}

function fixtureUrl(value: string | undefined): URL | undefined {
  if (!value) return undefined;
  try {
    return new URL(value);
  } catch {
    throw new Error('Auth fixture URLs must be valid disposable loopback URLs');
  }
}

export function assertIsolatedAuthFixtureEnvironment(
  environment: {
    DATABASE_URL?: string | undefined;
    DIRECT_URL?: string | undefined;
    REDIS_URL?: string | undefined;
  } = process.env,
): void {
  const loopback = new Set(['127.0.0.1', 'localhost', '[::1]']);
  const database = fixtureUrl(environment.DATABASE_URL);
  if (
    !database ||
    !['postgres:', 'postgresql:'].includes(database.protocol) ||
    !loopback.has(database.hostname) ||
    database.pathname !== '/social_test' ||
    Boolean(database.search)
  ) {
    throw new Error('Auth fixtures require an explicit disposable loopback social_test database');
  }
  if (environment.DIRECT_URL) {
    const direct = fixtureUrl(environment.DIRECT_URL);
    if (
      !direct ||
      !['postgres:', 'postgresql:'].includes(direct.protocol) ||
      !loopback.has(direct.hostname) ||
      direct.pathname !== database.pathname ||
      direct.port !== database.port ||
      Boolean(direct.search)
    ) {
      throw new Error('Auth fixture DIRECT_URL must target the same disposable loopback database');
    }
  }
  const redis = fixtureUrl(environment.REDIS_URL);
  if (!redis || redis.protocol !== 'redis:' || !loopback.has(redis.hostname) || redis.search) {
    throw new Error('Auth fixtures require an explicit disposable loopback Redis instance');
  }
}

export async function seedExistingAuthUser(
  app: INestApplication<App>,
  name: string,
  runId: string,
): Promise<ExistingAuthUser> {
  assertIsolatedAuthFixtureEnvironment();
  const id = randomUUID();
  const email = `${name}.${runId}@example.com`;
  const username = `${name}${runId}`;
  const password = 'Password123!';
  const prisma = app.get(PrismaService);
  await prisma.user.create({
    data: {
      id,
      email,
      username,
      displayName: name,
      passwordHash: await argon2.hash(password),
      birthDate: new Date('2000-01-01T00:00:00.000Z'),
    },
  });
  return { id, email, username, password };
}

export async function seedAndLoginExistingAuthUser(
  app: INestApplication<App>,
  name: string,
  runId: string,
): Promise<{ id: string; token: string }> {
  const user = await seedExistingAuthUser(app, name, runId);
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);
  const body = authResponseSchema.parse(response.body);
  if (body.user.id !== user.id) throw new Error('Login returned a different fixture user');
  return { id: body.user.id, token: body.accessToken };
}
