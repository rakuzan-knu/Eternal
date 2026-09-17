import { Module } from '@nestjs/common';
import { PollController } from './poll.controller';
import { PollService } from './poll.service';
import { PollRepository } from './repositories/poll.repository';
import { POLL_REPOSITORY } from './interfaces/poll-repository.interface';

@Module({
  controllers: [PollController],
  providers: [
    PollService,
    PollRepository,
    {
      provide: POLL_REPOSITORY,
      useClass: PollRepository,
    },
  ],
  exports: [POLL_REPOSITORY],
})
export class PollModule {}
