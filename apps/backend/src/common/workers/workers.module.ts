import { Global, Module } from '@nestjs/common';
import { ComputeWorkerService } from './compute-worker.service';

@Global()
@Module({
  providers: [ComputeWorkerService],
  exports: [ComputeWorkerService],
})
export class WorkersModule {}
