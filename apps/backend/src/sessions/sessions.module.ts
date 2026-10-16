import { roleControllers } from '../config/service-role';
import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@common/prisma';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsRepository } from './repositories/sessions.repository';
import { SESSIONS_REPOSITORY } from './interfaces/sessions-repository.interface';

@Module({
  imports: [PrismaModule, RedisModule, forwardRef(() => AuthModule)],
  controllers: roleControllers('core', [SessionsController]),
  providers: [
    SessionsService,
    {
      provide: SESSIONS_REPOSITORY,
      useClass: SessionsRepository,
    },
  ],
  exports: [SessionsService],
})
export class SessionsModule {}
