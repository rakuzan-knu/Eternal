import { Global, Module } from '@nestjs/common';
import { TextPipelineService } from './text-pipeline.service';

/**
 * Global text-pipeline access: sanitizing, mentions/hashtags, spam triage.
 * Import once (AppModule) — inject TextPipelineService anywhere.
 */
@Global()
@Module({
  providers: [TextPipelineService],
  exports: [TextPipelineService],
})
export class TextPipelineModule {}
