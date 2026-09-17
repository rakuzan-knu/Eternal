import type { UploadPrekeysDto, ReplenishPrekeysDto, PrekeyBundleView } from '@common/contracts';

export const PREKEYS_REPOSITORY = Symbol('PREKEYS_REPOSITORY');

export interface IPrekeysRepository {
  upsertBundle(userId: string, dto: UploadPrekeysDto): Promise<void>;
  consumePrekeyBundle(targetUserId: string): Promise<PrekeyBundleView | null>;
  replenishPrekeys(userId: string, dto: ReplenishPrekeysDto): Promise<number>;
  countRemainingPrekeys(userId: string): Promise<number>;
}
