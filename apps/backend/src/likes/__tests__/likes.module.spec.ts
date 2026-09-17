import { LikesModule } from '../likes.module';

describe('LikesModule', () => {
  it('is defined and instantiable', () => {
    const module = new LikesModule();
    expect(module).toBeDefined();
  });
});
