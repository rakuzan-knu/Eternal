import { CassandraModule } from '../cassandra/cassandra.module';
import { Global, Module } from '@nestjs/common';
import { DataLoaderService } from './dataloader.service';

@Global()
@Module({
  imports: [CassandraModule],
  providers: [DataLoaderService],
  exports: [DataLoaderService],
})
export class DataLoaderModule {}
