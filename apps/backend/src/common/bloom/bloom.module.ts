import { Module } from '@nestjs/common';
import { InMemoryBloomFilterService } from './in-memory-bloom-filter.service';

@Module({
  providers: [InMemoryBloomFilterService],
  exports: [InMemoryBloomFilterService],
})
export class BloomModule {}
