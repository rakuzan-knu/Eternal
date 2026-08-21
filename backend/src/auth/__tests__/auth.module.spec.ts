import { AuthModule } from '../auth.module';

describe('AuthModule', () => {
  it('is defined and instantiable', () => {
    const module = new AuthModule();
    expect(module).toBeDefined();
  });
});
