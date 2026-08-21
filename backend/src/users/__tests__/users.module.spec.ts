import { UsersModule } from '../users.module';

describe('UsersModule', () => {
  it('is defined and instantiable', () => {
    const module = new UsersModule();
    expect(module).toBeDefined();
  });
});
