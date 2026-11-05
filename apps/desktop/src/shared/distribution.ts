import { z } from 'zod';

export const distributionSchema = z.enum([
  'nsis',
  'msi',
  'appx',
  'msix',
  'dmg',
  'zip',
  'AppImage',
  'deb',
  'rpm',
  'flatpak',
  'snap',
]);
export type Distribution = z.infer<typeof distributionSchema>;

export function isConfinedLinux(): boolean {
  return process.platform === 'linux' && Boolean(process.env.FLATPAK_ID || process.env.SNAP);
}

export function updateMode(
  packaged: boolean,
  platform: string,
  distribution: unknown,
  appImage: boolean,
  store: boolean,
): 'automatic' | 'manual' | 'managed' | 'disabled' {
  if (!packaged) return 'disabled';
  if (store || ['msi', 'appx', 'msix', 'flatpak', 'snap'].includes(String(distribution)))
    return 'managed';
  if (platform === 'win32' && distribution === 'nsis') return 'automatic';
  if (platform === 'linux' && distribution === 'AppImage' && appImage) return 'automatic';
  return 'manual';
}
