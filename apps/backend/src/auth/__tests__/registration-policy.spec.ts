import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getRegistrationPolicy,
  registrationPolicySchema,
  registrationAgeBand,
} from '@common/contracts';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { TurnstileService } from '../turnstile.service';
import { RegistrationPolicyService } from '../registration-policy.service';
import { RegistrationOpenGuard } from '../guards/registration-open.guard';

describe('closed registration publication policy', () => {
  it.each([
    ['2013-11-09T00:00:00.000Z', 'UNDER_13'],
    ['2013-11-08T00:00:00.000Z', 'AGE_13'],
    ['2012-11-09T00:00:00.000Z', 'AGE_13'],
    ['2012-11-08T00:00:00.000Z', 'AGE_14_17'],
    ['2008-11-09T00:00:00.000Z', 'AGE_14_17'],
    ['2008-11-08T00:00:00.000Z', 'ADULT'],
  ])('uses UTC birthday boundaries for %s', (birthday, band) => {
    expect(registrationAgeBand(new Date(birthday), new Date('2026-11-08T00:00:00Z'))).toBe(band);
  });
  let app: INestApplication | undefined;
  afterEach(async () => app?.close());

  it('defaults to a closed policy and supports the explicit Ukrainian release switch', () => {
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
    const configured = new RegistrationPolicyService(
      new ConfigService({ UA_PUBLIC_REGISTRATION_ENABLED: 'true' }),
    );
    expect(registrationPolicySchema.parse(configured.getPolicy())).toMatchObject({
      registrationOpen: true,
      reviewedMarkets: ['UA'],
      reason: 'UKRAINE_SELF_REGISTRATION',
    });
    expect(() => configured.assertRegistrationOpen()).not.toThrow();
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
    expect(await signup.json()).toMatchObject({ errorCode: 'REGISTRATION_UNAVAILABLE' });
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
