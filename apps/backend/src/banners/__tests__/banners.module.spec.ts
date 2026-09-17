import { BannersModule } from '../banners.module';

describe('BannersModule', () => {
  it('is defined and instantiable', () => {
    const module = new BannersModule();
    expect(module).toBeDefined();
  });
});
