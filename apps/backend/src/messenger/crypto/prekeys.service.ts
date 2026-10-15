import {
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrivacyDimension } from '@prisma/client';
import { VisibilityResolver } from '../../users/privacy/visibility.resolver';
import { RedisService } from '../../redis/redis.service';
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
    private readonly visibility: VisibilityResolver,
    private readonly redis: RedisService,
  ) {}

  uploadBundle(userId: string, dto: UploadPrekeysDto): Promise<void> {
    return this.prekeysRepo.upsertBundle(userId, dto);
  }

  async getPrekeyBundle(targetUserId: string, requesterId: string): Promise<PrekeyBundleView> {
    const context = await this.visibility.loadContext([targetUserId], requesterId);
    if (!this.visibility.resolve(PrivacyDimension.MESSAGES, targetUserId, context)) {
      throw new ForbiddenException('Messaging this user is not permitted');
    }
    const client = this.redis.getClient();
    const allowed = await client.eval(
      `
      local pair = tonumber(redis.call('GET', KEYS[1]) or '0')
      local total = tonumber(redis.call('GET', KEYS[2]) or '0')
      if pair >= 2 or total >= 30 then return 0 end
      if redis.call('INCR', KEYS[1]) == 1 then redis.call('EXPIRE', KEYS[1], 60) end
      if redis.call('INCR', KEYS[2]) == 1 then redis.call('EXPIRE', KEYS[2], 60) end
      return 1
    `,
      2,
      `prekey-quota:{${requesterId}}:${targetUserId}`,
      `prekey-quota:{${requesterId}}:total`,
    );
    if (allowed !== 1) throw new HttpException('Prekey request limit exceeded', 429);
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
