import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SitemapService } from './sitemap.service';

@ApiTags('Sitemaps')
@Controller('sitemaps')
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get('profiles.xml')
  @ApiOperation({ summary: 'Dynamic XML Sitemap for Public Profiles' })
  @ApiResponse({ status: 200, description: 'Profiles XML Sitemap' })
  @Header('Content-Type', 'application/xml')
  @Header('Cache-Control', 'public, max-age=3600')
  async getProfilesSitemap(@Res() res: Response): Promise<void> {
    const xml = await this.sitemapService.generateProfilesSitemap();
    res.type('application/xml').send(xml);
  }

  @Get('posts.xml')
  @ApiOperation({ summary: 'Dynamic XML Sitemap for Public Posts' })
  @ApiResponse({ status: 200, description: 'Posts XML Sitemap' })
  @Header('Content-Type', 'application/xml')
  @Header('Cache-Control', 'public, max-age=3600')
  async getPostsSitemap(@Res() res: Response): Promise<void> {
    const xml = await this.sitemapService.generatePostsSitemap();
    res.type('application/xml').send(xml);
  }
}
