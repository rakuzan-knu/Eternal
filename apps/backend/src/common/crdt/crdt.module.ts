import { Module } from '@nestjs/common';
import { CrdtRegistryService } from './crdt-registry.service';
import { RedisModule } from '../../redis';

@Module({
  imports: [RedisModule],
  providers: [CrdtRegistryService],
  exports: [CrdtRegistryService],
})
export class CrdtModule {}
