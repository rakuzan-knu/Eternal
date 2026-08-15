import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OpenGraphService, type OpenGraphMetadata } from './opengraph.service';

@ApiTags('OpenGraph')
@Controller('og-preview')
export class OpenGraphController {
  constructor(private readonly ogService: OpenGraphService) {}

  @Get()
  @ApiOperation({ summary: 'Extract OpenGraph link metadata with 7-day server caching' })
  @ApiQuery({
    name: 'url',
    type: String,
    description: 'Target URL to extract OpenGraph preview for',
  })
  @ApiResponse({ status: 200, description: 'OpenGraph metadata extracted or null' })
  async getPreview(@Query('url') url?: string): Promise<OpenGraphMetadata | null> {
    if (!url || typeof url !== 'string') {
      throw new BadRequestException('Query param "url" is required');
    }
    return this.ogService.extractMetadata(url);
  }
}
