import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OpenGraphService, type OpenGraphMetadata } from './opengraph.service';

const SAFE_URL_REGEX = /^https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9](:\d{1,5})?(\/.*)?$/i;

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
    const trimmed = url.trim();
    if (!SAFE_URL_REGEX.test(trimmed)) {
      throw new BadRequestException('Invalid URL format');
    }
    const sanitized = this.ogService.sanitizeUrl(trimmed);
    if (!sanitized) {
      throw new BadRequestException('Invalid or forbidden URL');
    }
    return this.ogService.extractMetadata(sanitized);
  }
}
