import { PrismaModule } from '../prisma';
import { PublicSearchSyncService } from './public-search-sync.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PublicSearchService } from './public-search.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [PublicSearchService, PublicSearchSyncService],
  exports: [PublicSearchService],
})
export class PublicSearchModule {}
