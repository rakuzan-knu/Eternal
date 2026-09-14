import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma';

@Injectable()
export class SitemapService {
  private readonly logger = new Logger(SitemapService.name);
  private readonly BASE_URL = process.env.BASE_URL || 'https://eternalnet.vercel.app';

  constructor(private readonly prisma: PrismaService) {}

  async generateProfilesSitemap(): Promise<string> {
    try {
      const users = await this.prisma.user.findMany({
        select: {
          username: true,
          updatedAt: true,
        },
        take: 50000,
        orderBy: {
          updatedAt: 'desc',
        },
      });

      const urlsXml = users
        .map((u) => {
          const lastMod = u.updatedAt ? u.updatedAt.toISOString().split('T')[0] : '2026-09-01';
          return `  <url>
    <loc>${this.BASE_URL}/@${u.username}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
        })
        .join('\n');

      return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;
    } catch (err) {
      this.logger.error('Failed to generate profiles sitemap from database', err);
      // Return minimal valid fallback sitemap
      return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${this.BASE_URL}/explore</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
    }
  }

  async generatePostsSitemap(): Promise<string> {
    try {
      const posts = await this.prisma.post.findMany({
        select: {
          id: true,
          updatedAt: true,
        },
        take: 50000,
        orderBy: {
          updatedAt: 'desc',
        },
      });

      const urlsXml = posts
        .map((p) => {
          const lastMod = p.updatedAt ? p.updatedAt.toISOString().split('T')[0] : '2026-09-01';
          return `  <url>
    <loc>${this.BASE_URL}/p/${p.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
        })
        .join('\n');

      return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;
    } catch (err) {
      this.logger.error('Failed to generate posts sitemap from database', err);
      return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
    }
  }
}
