import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '@common/prisma';
import { ShowcaseRepository } from '../repositories/showcase.repository';

describe('Steam identity integrity in generic showcase updates', () => {
  const verified = {
    steamId: '76561198000000001',
    verified: true,
    authenticatedAt: '2026-10-14T10:00:00Z',
    username: 'Provider Name',
    gamesCount: 42,
  };
  const findUnique = vi.fn();
  const upsert = vi.fn().mockResolvedValue({ id: 'showcase-1' });
  let repository: ShowcaseRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    findUnique.mockResolvedValue({ connectedAccounts: { steam: verified } });
    const transaction = { profileShowcase: { findUnique, upsert } };
    const module = await Test.createTestingModule({
      providers: [
        ShowcaseRepository,
        {
          provide: PrismaService,
          useValue: {
            $transaction: async (callback: (tx: typeof transaction) => Promise<void>) =>
              callback(transaction),
          },
        },
      ],
    }).compile();
    repository = module.get(ShowcaseRepository);
  });

  it('rejects self-verified new Steam accounts before any DB mutation', async () => {
    findUnique.mockResolvedValue({ connectedAccounts: {} });
    await expect(
      repository.updateShowcase('user-1', { connectedAccounts: { steam: verified } }),
    ).rejects.toThrow('Authenticate Steam');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects a changed verified Steam identity, preserving the existing connection', async () => {
    await expect(
      repository.updateShowcase('user-1', {
        connectedAccounts: {
          steam: { ...verified, steamId: '76561198000000002' },
        },
      }),
    ).rejects.toThrow('Steam identity');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('allows only preferences and retains legacy verified identity and provider stats', async () => {
    await repository.updateShowcase('user-1', {
      connectedAccounts: {
        steam: {
          ...verified,
          gamesCount: 999999,
          username: 'Forged Name',
          displayOnProfile: false,
          featuredGames: ['cs2'],
          featuredGame: 'cs2',
        },
      },
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          connectedAccounts: {
            steam: {
              ...verified,
              displayOnProfile: false,
              featuredGames: ['cs2'],
              featuredGame: 'cs2',
            },
          },
        }),
      }),
    );
  });

  it('preserves Steam when editing another platform, and supports explicit unlink', async () => {
    await repository.updateShowcase('user-1', {
      connectedAccounts: { github: { username: 'retained' } },
    });
    expect(upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          connectedAccounts: {
            steam: verified,
            github: { username: 'retained' },
          },
        }),
      }),
    );
    await repository.updateShowcase('user-1', { connectedAccounts: { steam: null } });
    expect(upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ connectedAccounts: { steam: null } }),
      }),
    );
  });
});
