import { SessionsModule } from '../sessions.module';

describe('SessionsModule', () => {
  it('is defined and instantiable', () => {
    const module = new SessionsModule();
    expect(module).toBeDefined();
  });
});
