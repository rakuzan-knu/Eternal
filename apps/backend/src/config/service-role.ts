import type { Type } from '@nestjs/common';

export const SERVICE_ROLES = ['all', 'core', 'messenger', 'reels', 'music'] as const;
export type ServiceRole = (typeof SERVICE_ROLES)[number];
export type FeatureRole = Exclude<ServiceRole, 'all'>;
export const SERVICE_ROLE_METADATA = 'eternal:service-role';

export function getServiceRole(env: NodeJS.ProcessEnv = process.env): ServiceRole {
  const role = env.SERVICE_ROLE ?? 'all';
  const found = SERVICE_ROLES.find((candidate) => candidate === role);
  if (!found) throw new Error('SERVICE_ROLE must be all, core, messenger, reels or music');
  return found;
}

export function ownsRole(role: FeatureRole, env: NodeJS.ProcessEnv = process.env): boolean {
  const serviceRole = getServiceRole(env);
  return serviceRole === 'all' || serviceRole === role;
}

// Allows an API-compatible staging deployment while workers move to their owner.
export function runsBackground(role: FeatureRole, env: NodeJS.ProcessEnv = process.env): boolean {
  return env.BACKGROUND_ENABLED !== 'false' && ownsRole(role, env);
}

// Providers remain shared because existing domain services depend on one another.
// Only the owning deployment registers a feature's HTTP controllers and background work.
export function roleControllers(role: ServiceRole, controllers: Type<unknown>[]): Type<unknown>[] {
  for (const controller of controllers)
    Reflect.defineMetadata(SERVICE_ROLE_METADATA, role, controller);
  return role === 'all' || ownsRole(role) ? controllers : [];
}
