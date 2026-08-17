import { Verifier } from '@pact-foundation/pact';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import * as argon2 from 'argon2';
import path from 'path';

/**
 * Verifies the committed consumer pact (backend/pacts/frontend-backend.json)
 * against a running backend instance with a reachable database.
 *
 *   PACT_PROVIDER_URL=http://localhost:3000 pnpm --filter backend test:pact:verify
 *
 * Provider states seed the database through Prisma (idempotent upserts), a
 * real access token is minted by logging in as the seeded user, and the
 * verifier injects it as an Authorization header for every replayed request.
 */

const prisma = new PrismaClient();
const PACT_PASSWORD = 'correct-horse-battery';

interface UserSpec {
  email: string;
  username: string;
  displayName: string;
  bio?: string;
}

const ALICE: UserSpec = {
  email: 'alice@example.com',
  username: 'alice',
  displayName: 'Alice Mock',
  bio: 'Mocked biography',
};
const BOB: UserSpec = { email: 'bob@example.com', username: 'bob', displayName: 'Bob Mock' };
const CAROL: UserSpec = {
  email: 'carol@example.com',
  username: 'carol',
  displayName: 'Carol Mock',
};

async function ensureUser(spec: UserSpec): Promise<string> {
  const passwordHash = await argon2.hash(PACT_PASSWORD);
  const user = await prisma.user.upsert({
    where: { username: spec.username },
    create: {
      email: spec.email,
      username: spec.username,
      displayName: spec.displayName,
      bio: spec.bio ?? null,
      passwordHash,
    },
    update: {
      email: spec.email,
      displayName: spec.displayName,
      bio: spec.bio ?? null,
      passwordHash,
    },
  });
  return user.id;
}

async function ensureFeedPost(aliceId: string): Promise<void> {
  const existing = await prisma.post.findFirst({
    where: { authorId: aliceId, content: 'Hello from the contract test' },
  });
  if (existing) return;

  await prisma.post.create({
    data: {
      content: 'Hello from the contract test',
      authorId: aliceId,
      media: {
        create: { type: 'IMAGE', url: 'https://cdn.example.com/post.jpg', order: 0 },
      },
    },
  });
}

async function ensureConversation(aliceId: string, bobId: string): Promise<void> {
  const existing = await prisma.conversation.findFirst({
    where: {
      type: 'DIRECT',
      AND: [
        { participants: { some: { userId: aliceId } } },
        { participants: { some: { userId: bobId } } },
      ],
    },
  });
  if (existing) return;

  await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      participants: {
        create: [
          { userId: aliceId, role: 'OWNER' },
          { userId: bobId, role: 'MEMBER' },
        ],
      },
      messages: {
        create: { senderId: bobId, body: 'Hey there', messageType: 'TEXT' },
      },
    },
  });
}

async function seedUsers(): Promise<{ aliceId: string; bobId: string }> {
  const aliceId = await ensureUser(ALICE);
  const bobId = await ensureUser(BOB);
  return { aliceId, bobId };
}

const stateHandlers: Record<string, () => Promise<Record<string, unknown>>> = {
  'a user exists with email alice@example.com': () => seedUsers().then(() => ({})),
  'the feed contains exactly one post and no further pages': async () => {
    const { aliceId } = await seedUsers();
    await ensureFeedPost(aliceId);
    return {};
  },
  'the user participates in one direct conversation with a last message': async () => {
    const { aliceId, bobId } = await seedUsers();
    await ensureConversation(aliceId, bobId);
    return {};
  },
  'a user with username alice exists': () => seedUsers().then(() => ({})),
  'a user with username carol and no avatar exists': async () => {
    await ensureUser(CAROL);
    return {};
  },
};

/** The anonymous feed is Redis-cached; drop it so seeded posts are visible. */
async function clearFeedCache(): Promise<void> {
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  try {
    const keys = await redis.keys('posts:feed:*');
    if (keys.length > 0) await redis.del(...keys);
  } finally {
    await redis.quit();
  }
}

async function mintAccessToken(providerBaseUrl: string): Promise<string> {
  const response = await fetch(`${providerBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ALICE.email, identity: ALICE.email, password: PACT_PASSWORD }),
  });
  if (!response.ok) {
    throw new Error(`login for pact verification failed: ${response.status}`);
  }
  const body = (await response.json()) as { accessToken: string };
  return body.accessToken;
}

async function main(): Promise<void> {
  const providerBaseUrl = process.env.PACT_PROVIDER_URL ?? 'http://localhost:3000';
  await clearFeedCache();
  // The token must be minted before verification starts, so the login user
  // has to exist before the per-interaction state handlers ever run.
  await seedUsers();
  const accessToken = await mintAccessToken(providerBaseUrl);

  try {
    await new Verifier({
      providerBaseUrl,
      pactUrls: [path.resolve(__dirname, '../pacts/frontend-backend.json')],
      stateHandlers,
      customProviderHeaders: [`Authorization: Bearer ${accessToken}`],
    }).verifyProvider();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error: unknown) => {
  await prisma.$disconnect();
  process.stderr.write(`Pact verification failed: ${String(error)}\n`);
  process.exitCode = 1;
});
