import { z } from 'zod';

export const storeRegistration = {
  microsoft: {
    identityName: 'STORE_IDENTITY_NOT_CONFIGURED',
    publisher: 'CN=74CE90A6-3E99-4A37-B2D1-9DC6DAD9416A',
    publisherDisplayName: 'Publisher display name not configured',
    displayName: 'Eternal Desktop',
    productId: '9N2XFD2B14JG',
  },
  snapName: 'eternal-desktop',
} as const;

const storeIdentitySchema = z.object({
  identityName: z.string().regex(/^[A-Za-z0-9.-]{3,50}$/),
  publisher: z
    .string()
    .min(4)
    .startsWith('CN=')
    .refine((value) => !/[\r\n\0]/.test(value)),
  publisherDisplayName: z
    .string()
    .min(1)
    .max(256)
    .refine((value) => value.trim().length > 0 && !/[\r\n\0]/.test(value)),
});

export function microsoftStoreIdentity(env: NodeJS.ProcessEnv) {
  return storeIdentitySchema.parse({
    identityName: env.ETERNAL_DESKTOP_STORE_IDENTITY || storeRegistration.microsoft.identityName,
    publisher: env.ETERNAL_DESKTOP_STORE_PUBLISHER || storeRegistration.microsoft.publisher,
    publisherDisplayName:
      env.ETERNAL_DESKTOP_STORE_PUBLISHER_DISPLAY_NAME ||
      storeRegistration.microsoft.publisherDisplayName,
  });
}

export function stableStoreVersion(value: string): string {
  const version = z
    .string()
    .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/)
    .parse(value);
  const parts = version.split('.').map(Number);
  if (parts.some((part) => part > 65535) || parts[0] === 0)
    throw new Error('Store releases require a stable version >= 1.0.0 with components <= 65535');
  return version;
}

export function snapName(value: string = storeRegistration.snapName): string {
  return z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z](?:[a-z0-9]|-(?=[a-z0-9]))*$/)
    .parse(value);
}
