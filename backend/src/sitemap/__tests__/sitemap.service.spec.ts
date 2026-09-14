import { Test, type TestingModule } from '@nestjs/testing';
import { SitemapService } from '../sitemap.service';
import { PrismaService } from '@common/prisma';

describe('SitemapService', () => {
  let service: SitemapService;
  let prisma: {
    user: { findMany: jest.Mock };
    post: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          { username: 'alex', updatedAt: new Date('2026-09-01T10:00:00Z') },
          { username: 'elena', updatedAt: new Date('2026-08-30T12:00:00Z') },
        ]),
      },
      post: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'post-1', updatedAt: new Date('2026-09-01T10:00:00Z') }]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SitemapService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<SitemapService>(SitemapService);
  });

  it('generates valid XML sitemap for public user profiles', async () => {
    const xml = await service.generateProfilesSitemap();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://eternalnet.vercel.app/@alex</loc>');
    expect(xml).toContain('<loc>https://eternalnet.vercel.app/@elena</loc>');
    expect(xml).toContain('<priority>0.8</priority>');
  });

  it('generates valid XML sitemap for public posts', async () => {
    const xml = await service.generatePostsSitemap();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<loc>https://eternalnet.vercel.app/p/post-1</loc>');
  });
});
