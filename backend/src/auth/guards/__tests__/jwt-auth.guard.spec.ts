import { AuthGuard } from '../jwt-auth.guard';

describe('AuthGuard (JwtAuthGuard)', () => {
  it('instantiates and extends PassportAuthGuard("jwt")', () => {
    const guard = new AuthGuard();
    expect(guard).toBeDefined();
    expect(typeof guard.canActivate).toBe('function');
  });
});
