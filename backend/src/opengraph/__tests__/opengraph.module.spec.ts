import { OpenGraphModule } from '../opengraph.module';

describe('OpenGraphModule', () => {
  it('is defined and instantiable', () => {
    const module = new OpenGraphModule();
    expect(module).toBeDefined();
  });
});
