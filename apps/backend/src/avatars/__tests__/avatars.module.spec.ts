import { AvatarsModule } from '../avatars.module';

describe('AvatarsModule', () => {
  it('is defined and instantiable', () => {
    const module = new AvatarsModule();
    expect(module).toBeDefined();
  });
});
