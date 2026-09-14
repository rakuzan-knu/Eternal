import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import sanitizeHtml from 'sanitize-html';
import { UsersService } from './users.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly usersService: UsersService) {}

  @Get('suggestions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OpenSearch suggestion endpoint for browser Omnibox' })
  async getSuggestions(@Query('q') q?: string): Promise<[string, string[], string[], string[]]> {
    const raw = typeof q === 'string' ? q.trim() : '';
    const searchTerm = sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} })
      .replace(/[<>"'&]/g, '')
      .slice(0, 100);

    if (!searchTerm) {
      return ['', [], [], []];
    }
    const results = await this.usersService.searchUsers(searchTerm, null);
    const top = results.slice(0, 8);
    const names = top.map((u) => `@${u.username} (${u.displayName || u.username})`);
    const descriptions = top.map((u) => u.bio || `Profile of @${u.username} on Eternal`);
    const baseUrl = process.env.BASE_URL || 'https://eternalnet.vercel.app';
    const urls = top.map((u) => `${baseUrl}/@${u.username}`);
    return [searchTerm, names, descriptions, urls];
  }
}
