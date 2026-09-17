import { FollowersModule } from '../followers.module';

describe('FollowersModule', () => {
  it('is defined and instantiable', () => {
    const module = new FollowersModule();
    expect(module).toBeDefined();
  });
});
