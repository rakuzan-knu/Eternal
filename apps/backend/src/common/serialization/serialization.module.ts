import { Global, Module } from '@nestjs/common';
import { FastJsonService } from './fast-json.service';
import { FastJsonInterceptor } from './fast-json.interceptor';

@Global()
@Module({
  providers: [FastJsonService, FastJsonInterceptor],
  exports: [FastJsonService, FastJsonInterceptor],
})
export class SerializationModule {}
