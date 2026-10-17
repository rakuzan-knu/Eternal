import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CassandraTelemetryRepository } from './cassandra-telemetry.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { TelemetrySyncRepository } from './telemetry-sync.repository';
import { TelemetryWorkerService } from './telemetry-worker.service';
import { MessageBodyRepository } from './message-body.repository';
import { MessageBodyService } from './message-body.service';
import { MessageBodyWorkerService } from './message-body-worker.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    CassandraTelemetryRepository,
    TelemetrySyncRepository,
    TelemetryWorkerService,
    MessageBodyRepository,
    MessageBodyService,
    MessageBodyWorkerService,
  ],
  exports: [
    CassandraTelemetryRepository,
    TelemetrySyncRepository,
    MessageBodyRepository,
    MessageBodyService,
  ],
})
export class CassandraModule {}
