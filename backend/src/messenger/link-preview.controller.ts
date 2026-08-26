import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OpenGraphService } from '../opengraph/opengraph.service';
import type { LinkEmbedData } from '@common/contracts';

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
  async getPreview(@Query('url') url?: string): Promise<LinkEmbedData | null> {
    if (!url || typeof url !== 'string') {
      throw new BadRequestException('Query param "url" is required');
    }
    return this.ogService.extractMetadata(url);
  }
}
