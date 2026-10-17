import { RedisService } from '../../redis/redis.service';
import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { PrismaModule, PrismaService } from '../prisma';
import { RedisModule } from '../../redis/redis.module';
import { PublicSearchModule } from './public-search.module';
import { PublicSearchService, MAX_PUBLIC_IDENTITIES } from './public-search.service';
import { RESERVED_USERNAMES } from '@common/contracts';

@Module({ imports: [ConfigModule.forRoot(), PrismaModule, RedisModule, PublicSearchModule] })
class RebuildModule {}

async function main(): Promise<void> {
  if (
    process.argv[2] !== '--replace-public-identities' ||
    process.env.PUBLIC_SEARCH_REBUILD_CONFIRM !== process.env.ALGOLIA_PUBLIC_USERS_INDEX ||
    !process.env.ALGOLIA_PUBLIC_USERS_INDEX ||
    process.env.PUBLIC_SEARCH_PROVIDER === 'algolia' ||
    !process.argv.includes('--compatible-readers-deployed')
  ) {
    throw new Error(
      'Disable provider reads and explicitly confirm the target index before rebuilding',
    );
  }
  const app = await NestFactory.createApplicationContext(RebuildModule, { logger: false });
  try {
    await app.get(RedisService).getClient().ping();
    await app.get(PrismaService)
      .$executeRaw`UPDATE public_search_control SET enabled = true WHERE id = true`;
    const users = await app.get(PrismaService).user.findMany({
      where: { username: { notIn: [...RESERVED_USERNAMES] } },
      select: { id: true, username: true, displayName: true },
      take: MAX_PUBLIC_IDENTITIES + 1,
      orderBy: { id: 'asc' },
    });
    if (users.length > MAX_PUBLIC_IDENTITIES)
      throw new Error('Identity index exceeds the record ceiling');
    await app.get(PublicSearchService).rebuild(
      users.map(({ id, username, displayName }) => ({
        objectID: id,
        username,
        displayName,
      })),
    );
    console.log(`Rebuilt ${users.length} discoverable identities. No posts or messages indexed.`);
  } finally {
    await app.close();
  }
}

void main().catch(() => {
  console.error(
    'Public search rebuild failed; keep provider disabled and inspect configuration/budgets.',
  );
  process.exitCode = 1;
});
