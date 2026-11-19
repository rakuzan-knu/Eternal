import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FamilyService } from '../family.service';
import { FamilySafeguardService } from '../family-safeguard.service';
import { PrismaService } from '@common/prisma';

describe('Family enrollment during a coordinated rollout', () => {
  it('rejects new connections before any DB operation while enrollment is held', async () => {
    const module = await Test.createTestingModule({
      providers: [
        FamilyService,
        { provide: PrismaService, useValue: {} },
        { provide: FamilySafeguardService, useValue: {} },
      ],
    }).compile();
    const family = module.get(FamilyService);
    const previous = process.env.FAMILY_ENROLLMENT_ENABLED;
    process.env.FAMILY_ENROLLMENT_ENABLED = 'false';
    try {
      await expect(family.generatePairQr('synthetic-teen')).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(family.pair('synthetic-adult', 'FC-1234')).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(family.confirmPair('synthetic-teen', 'synthetic-link', true)).rejects.toThrow(
        ServiceUnavailableException,
      );
    } finally {
      if (previous === undefined) delete process.env.FAMILY_ENROLLMENT_ENABLED;
      else process.env.FAMILY_ENROLLMENT_ENABLED = previous;
      await module.close();
    }
  });
});
