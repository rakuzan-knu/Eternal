import { Global, Module } from '@nestjs/common';
import { DataLoaderService } from './dataloader.service';

@Global()
@Module({
  providers: [DataLoaderService],
  exports: [DataLoaderService],
})
export class DataLoaderModule {}
