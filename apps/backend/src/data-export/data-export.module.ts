import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { CassandraModule } from '../common/cassandra/cassandra.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { roleControllers } from '../config/service-role';
import { CoreDataExportController, MessengerDataExportController } from './data-export.controller';
import { DataExportCursor } from './data-export.cursor';
import { DataExportRepository } from './data-export.repository';
import { DataExportService } from './data-export.service';

@Module({
  imports: [AuthModule, ConfigModule, PrismaModule, CassandraModule],
  controllers: [
    ...roleControllers('core', [CoreDataExportController]),
    ...roleControllers('messenger', [MessengerDataExportController]),
  ],
  providers: [DataExportCursor, DataExportRepository, DataExportService],
})
export class DataExportModule {}
