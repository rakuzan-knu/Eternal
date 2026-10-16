import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getServiceRole,
  ownsRole,
  roleControllers,
  runsBackground,
  SERVICE_ROLES,
} from '../service-role';

afterEach(() => vi.unstubAllEnvs());

describe('service ownership', () => {
  it('can pause background work during rollout without removing HTTP ownership', () => {
    const env = { SERVICE_ROLE: 'messenger', BACKGROUND_ENABLED: 'false' };
    expect(ownsRole('messenger', env)).toBe(true);
    expect(runsBackground('messenger', env)).toBe(false);
    expect(runsBackground('messenger', { SERVICE_ROLE: 'messenger' })).toBe(true);
    expect(runsBackground('messenger', { SERVICE_ROLE: 'core' })).toBe(false);
  });
  it('preserves monolith behavior when no role is supplied', () => {
    expect(getServiceRole({})).toBe('all');
    for (const role of ['core', 'messenger', 'reels', 'music'] as const) {
      expect(ownsRole(role, {})).toBe(true);
    }
  });

  it('rejects invalid roles instead of silently launching all workers', () => {
    expect(() => getServiceRole({ SERVICE_ROLE: 'mesenger' })).toThrow('SERVICE_ROLE');
    expect(() => getServiceRole({ SERVICE_ROLE: '' })).toThrow('SERVICE_ROLE');
  });

  it.each(SERVICE_ROLES)('registers only owned HTTP controllers for %s', (serviceRole) => {
    vi.stubEnv('SERVICE_ROLE', serviceRole);
    class Controller {}
    for (const role of ['core', 'messenger', 'reels', 'music'] as const) {
      expect(roleControllers(role, [Controller])).toEqual(
        serviceRole === 'all' || serviceRole === role ? [Controller] : [],
      );
    }
  });
});
