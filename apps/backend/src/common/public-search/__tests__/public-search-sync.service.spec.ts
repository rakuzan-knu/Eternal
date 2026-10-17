import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { PrismaService } from '../../prisma';
import { PublicSearchService } from '../public-search.service';
import { PublicSearchSyncService } from '../public-search-sync.service';

describe('Public identity reconciliation ownership', () => {
  afterEach(() => vi.unstubAllEnvs());
  it.each([
    ['messenger', 'true', 'algolia', false],
    ['core', 'false', 'algolia', false],
    ['core', 'true', 'postgres', false],
    ['core', 'true', 'algolia', true],
  ])('role=%s background=%s provider=%s', async (role, background, provider, runs) => {
    vi.stubEnv('SERVICE_ROLE', String(role));
    vi.stubEnv('BACKGROUND_ENABLED', String(background));
    const module = await Test.createTestingModule({
      providers: [
        PublicSearchSyncService,
        {
          provide: ConfigService,
          useValue: new ConfigService({ PUBLIC_SEARCH_PROVIDER: provider }),
        },
        { provide: PrismaService, useValue: {} },
        { provide: PublicSearchService, useValue: {} },
      ],
    }).compile();
    const sync = module.get(PublicSearchSyncService);
    const processOne = vi.spyOn(sync, 'processOne').mockResolvedValue(false);
    await sync.reconcile();
    expect(processOne).toHaveBeenCalledTimes(runs ? 1 : 0);
    await module.close();
  });
});
