import { NotFoundException } from '@nestjs/common';
import { PrekeysService } from '../prekeys.service';
import type { IPrekeysRepository } from '../../interfaces/prekeys-repository.interface';
import type { PrekeyBundleView } from '@common/contracts';

describe('PrekeysService', () => {
  let service: PrekeysService;
  let mockPrekeysRepo: jest.Mocked<IPrekeysRepository>;

  const mockBundle: PrekeyBundleView = {
    userId: 'u-2',
    identityKeySpki: 'ik-spki-base64',
    signedPrekeySpki: 'spk-spki-base64',
    signedPrekeySig: 'sig-base64',
    oneTimePrekey: {
      keyId: 1,
      keySpki: 'opk-1-base64',
    },
  };

  beforeEach(() => {
    mockPrekeysRepo = {
      upsertBundle: jest.fn(),
      consumePrekeyBundle: jest.fn(),
      replenishPrekeys: jest.fn(),
      countRemainingPrekeys: jest.fn(),
    };
    service = new PrekeysService(mockPrekeysRepo);
  });

  it('delegates uploadBundle to repository', async () => {
    mockPrekeysRepo.upsertBundle.mockResolvedValue(undefined);
    await service.uploadBundle('u-1', {
      identityKeySpki: 'ik',
      signedPrekeySpki: 'spk',
      signedPrekeySig: 'sig',
      oneTimePrekeys: [{ keyId: 1, keySpki: 'opk-1' }],
    });
    expect(mockPrekeysRepo.upsertBundle).toHaveBeenCalledWith(
      'u-1',
      expect.objectContaining({ identityKeySpki: 'ik' }),
    );
  });

  it('throws NotFoundException when target prekey bundle does not exist', async () => {
    mockPrekeysRepo.consumePrekeyBundle.mockResolvedValue(null);
    await expect(service.getPrekeyBundle('missing-user')).rejects.toThrow(NotFoundException);
  });

  it('returns bundle when target user prekey exists', async () => {
    mockPrekeysRepo.consumePrekeyBundle.mockResolvedValue(mockBundle);
    const res = await service.getPrekeyBundle('u-2');
    expect(res.userId).toBe('u-2');
    expect(res.oneTimePrekey?.keyId).toBe(1);
  });

  it('replenishes prekeys and returns remaining count', async () => {
    mockPrekeysRepo.replenishPrekeys.mockResolvedValue(45);
    const res = await service.replenishPrekeys('u-1', {
      oneTimePrekeys: [{ keyId: 2, keySpki: 'opk-2' }],
    });
    expect(res).toBe(45);
  });

  it('returns count of remaining prekeys', async () => {
    mockPrekeysRepo.countRemainingPrekeys.mockResolvedValue(30);
    const res = await service.getRemainingCount('u-1');
    expect(res).toBe(30);
  });
});
