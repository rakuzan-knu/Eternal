import 'reflect-metadata';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { ReelsController } from '../reels.controller';
import type { ReelsService } from '../reels.service';
import { getReelsQuerySchema } from '../../common/contracts/reels';

const user: RequestUser = { id: 'jwt-owner', email: 'owner@example.com', username: 'owner' };

describe('Saved reels HTTP boundary', () => {
  const service = { getSavedReels: vi.fn(), setSaved: vi.fn() };
  const controller = new ReelsController(service as unknown as ReelsService);

  beforeEach(() => vi.clearAllMocks());

  it.each(['getSavedReels', 'saveReel', 'unsaveReel'] as const)(
    'requires JWT authentication for %s',
    (method) => {
      expect(Reflect.getMetadata(GUARDS_METADATA, controller[method])).toEqual([AuthGuard]);
    },
  );

  it('reads only the authenticated owner and validates bounded pagination', async () => {
    const query = getReelsQuerySchema.parse({
      limit: '12',
      after: 'saved-row',
      userId: 'attacker',
    });
    await controller.getSavedReels(query, user);
    expect(service.getSavedReels).toHaveBeenCalledWith('jwt-owner', 12, 'saved-row');
    expect(getReelsQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(getReelsQuerySchema.safeParse({ limit: -1 }).success).toBe(false);
    expect(Reflect.getMetadata(PATH_METADATA, controller.getSavedReels)).toBe('saved');
  });

  it('save and delete retain desired state across HTTP retries and use the JWT owner', async () => {
    await controller.saveReel('reel', user);
    await controller.saveReel('reel', user);
    await controller.unsaveReel('reel', user);
    expect(service.setSaved.mock.calls).toEqual([
      ['reel', 'jwt-owner', true],
      ['reel', 'jwt-owner', true],
      ['reel', 'jwt-owner', false],
    ]);
  });
});
