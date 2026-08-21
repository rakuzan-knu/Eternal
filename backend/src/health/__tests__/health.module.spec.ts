import { HealthModule } from '../health.module';

describe('HealthModule', () => {
  it('is defined and instantiable', () => {
    const module = new HealthModule();
    expect(module).toBeDefined();
  });
});
