import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AvatarsController } from './avatars.controller';
import { AvatarsService } from './avatars.service';
import { s3Provider } from './s3-provider';
import { PrismaModule } from '@common/prisma';
import { PrismaAvatarRepository } from './repositories/avatars.repository';
import { AVATAR_REPOSITORY } from './interfaces/avatars-repository.interface';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AvatarsController],
  providers: [
    AvatarsService,
    s3Provider,
    {
      provide: AVATAR_REPOSITORY,
      useClass: PrismaAvatarRepository,
    },
  ],
})
export class AvatarsModule {}
