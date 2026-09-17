import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OpenGraphService } from '../opengraph/opengraph.service';
import {
  type LinkEmbedData,
  type LinkPreviewQueryDto,
  linkPreviewQuerySchema,
} from '@common/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('Messenger / Link Preview')
@Controller('messenger/link-preview')
export class MessengerLinkPreviewController {
  constructor(private readonly ogService: OpenGraphService) {}

  @Get()
  @ApiOperation({
    summary:
      'Extract rich link metadata & interactive embed previews (YouTube, GitHub, Spotify, OpenGraph)',
  })
  @ApiQuery({
    name: 'url',
    type: String,
    description: 'Target URL to extract rich preview for',
  })
  @ApiResponse({ status: 200, description: 'Rich link embed metadata or null' })
  async getPreview(
    @Query(new ZodValidationPipe(linkPreviewQuerySchema)) query: LinkPreviewQueryDto,
  ): Promise<LinkEmbedData | null> {
    return this.ogService.extractMetadata(query.url);
  }
}
