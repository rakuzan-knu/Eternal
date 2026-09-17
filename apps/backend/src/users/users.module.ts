import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@common/prisma';
import { PostsModule } from '../posts/posts.module';
import { USERS_REPOSITORY } from './interfaces/users-repository.interface';
import { UsersRepository } from './repositories/users.repository';
import { UsersController } from './users.controller';
import { SearchController } from './search.controller';
import { UsersService } from './users.service';
import { PrivacyController } from './privacy/privacy.controller';
import { PrivacyService } from './privacy/privacy.service';
import { VisibilityResolver } from './privacy/visibility.resolver';
import { PRIVACY_REPOSITORY } from './privacy/interfaces/privacy-repository.interface';
import { PrivacyRepository } from './privacy/repositories/privacy.repository';

import { LastSeenCoalescerService } from './coalescing/last-seen-coalescer.service';

@Module({
  imports: [PrismaModule, forwardRef(() => PostsModule)],
  controllers: [UsersController, SearchController, PrivacyController],
  providers: [
    UsersService,
    LastSeenCoalescerService,
    PrivacyService,
    VisibilityResolver,
    { provide: USERS_REPOSITORY, useClass: UsersRepository },
    { provide: PRIVACY_REPOSITORY, useClass: PrivacyRepository },
  ],
  exports: [UsersService, LastSeenCoalescerService, VisibilityResolver],
})
export class UsersModule {}
