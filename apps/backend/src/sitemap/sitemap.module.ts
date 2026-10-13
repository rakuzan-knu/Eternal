import { roleControllers } from '../config/service-role';
import { Module } from '@nestjs/common';
import { SitemapController } from './sitemap.controller';
import { SitemapService } from './sitemap.service';
import { PrismaModule } from '@common/prisma';

@Module({
  imports: [PrismaModule],
  controllers: roleControllers('core', [SitemapController]),
  providers: [SitemapService],
  exports: [SitemapService],
})
export class SitemapModule {}
