import { MetricsModule } from '../metrics.module';

describe('MetricsModule', () => {
  it('is defined and instantiable', () => {
    const module = new MetricsModule();
    expect(module).toBeDefined();
  });
});
