import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CassandraTelemetryRepository } from './cassandra-telemetry.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { TelemetrySyncRepository } from './telemetry-sync.repository';
import { TelemetryWorkerService } from './telemetry-worker.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [CassandraTelemetryRepository, TelemetrySyncRepository, TelemetryWorkerService],
  exports: [CassandraTelemetryRepository, TelemetrySyncRepository],
})
export class CassandraModule {}
