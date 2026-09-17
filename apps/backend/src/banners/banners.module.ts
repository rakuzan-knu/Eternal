import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { bannerS3Provider } from './s3-provider';
import { PrismaModule } from '@common/prisma';
import { PrismaBannerRepository } from './repositories/banners.repository';
import { BANNER_REPOSITORY } from './interfaces/banners-repository.interface';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [BannersController],
  providers: [
    BannersService,
    bannerS3Provider,
    {
      provide: BANNER_REPOSITORY,
      useClass: PrismaBannerRepository,
    },
  ],
})
export class BannersModule {}
