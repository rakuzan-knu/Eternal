import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRegistrationPolicy, registrationPolicySchema } from '@common/contracts';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { TurnstileService } from '../turnstile.service';
import { RegistrationPolicyService } from '../registration-policy.service';
import { RegistrationOpenGuard } from '../guards/registration-open.guard';

describe('closed registration publication policy', () => {
  let app: INestApplication | undefined;
  afterEach(async () => app?.close());

  it('has no approved markets or environment-based opening switch', () => {
    expect(registrationPolicySchema.parse(getRegistrationPolicy())).toEqual({
      minimumAge: 13,
      registrationOpen: false,
      reviewedMarkets: [],
      policyVersion: '2026-11-05',
      reason: 'REGIONAL_REVIEW_PENDING',
    });
    const service = new RegistrationPolicyService();
    expect(() => service.assertRegistrationOpen()).toThrow();
    expect(() => new RegistrationOpenGuard(service).canActivate()).toThrow();
  });

  it('exposes policy publicly and rejects signup before validation or Turnstile while login remains reachable', async () => {
    const register = vi.fn();
    const verifyToken = vi.fn();
    const login = vi.fn().mockResolvedValue({
      accessToken: 'test-access',
      refreshToken: 'test-refresh',
      user: { id: 'existing', email: 'test@example.com', username: 'test_user' },
    });
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        RegistrationPolicyService,
        RegistrationOpenGuard,
        { provide: AuthService, useValue: { register, login } },
        { provide: TurnstileService, useValue: { verifyToken } },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    const origin = await app.getUrl();
    const policy = await fetch(`${origin}/auth/registration-policy`);
    expect(policy.status).toBe(200);
    expect(policy.headers.get('cache-control')).toBe('no-store');
    expect(registrationPolicySchema.parse(await policy.json())).toEqual(getRegistrationPolicy());

    const signup = await fetch(`${origin}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(signup.status).toBe(403);
    expect(await signup.json()).toMatchObject({ code: 'REGISTRATION_UNAVAILABLE' });
    expect(register).not.toHaveBeenCalled();
    expect(verifyToken).not.toHaveBeenCalled();

    const signin = await fetch(`${origin}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'Password123!' }),
    });
    expect(signin.status).toBe(200);
    expect(login).toHaveBeenCalledOnce();
  });
});
