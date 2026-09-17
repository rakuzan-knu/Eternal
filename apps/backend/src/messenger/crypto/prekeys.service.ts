import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PREKEYS_REPOSITORY,
  type IPrekeysRepository,
} from '../interfaces/prekeys-repository.interface';
import type { UploadPrekeysDto, ReplenishPrekeysDto, PrekeyBundleView } from '@common/contracts';

@Injectable()
export class PrekeysService {
  constructor(
    @Inject(PREKEYS_REPOSITORY)
    private readonly prekeysRepo: IPrekeysRepository,
  ) {}

  uploadBundle(userId: string, dto: UploadPrekeysDto): Promise<void> {
    return this.prekeysRepo.upsertBundle(userId, dto);
  }

  async getPrekeyBundle(targetUserId: string): Promise<PrekeyBundleView> {
    const bundle = await this.prekeysRepo.consumePrekeyBundle(targetUserId);
    if (!bundle) {
      throw new NotFoundException(`Prekey bundle not found for user ${targetUserId}`);
    }
    return bundle;
  }

  replenishPrekeys(userId: string, dto: ReplenishPrekeysDto): Promise<number> {
    return this.prekeysRepo.replenishPrekeys(userId, dto);
  }

  getRemainingCount(userId: string): Promise<number> {
    return this.prekeysRepo.countRemainingPrekeys(userId);
  }
}
