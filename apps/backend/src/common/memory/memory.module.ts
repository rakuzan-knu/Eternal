import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MemoryMonitorService } from './memory-monitor.service';
import { MemoryLeakDetectorService } from './memory-leak-detector.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MemoryMonitorService, MemoryLeakDetectorService],
  exports: [MemoryMonitorService, MemoryLeakDetectorService],
})
export class MemoryModule {}
