import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SnowflakeService } from './snowflake.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SnowflakeService],
  exports: [SnowflakeService],
})
export class SnowflakeModule {}
