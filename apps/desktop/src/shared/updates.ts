import { z } from 'zod';

export const versionSchema = z
  .string()
  .max(128)
  .regex(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/,
  );
export const updateChannelSchema = z.enum(['stable', 'beta']);
export const updateChannelArgumentsSchema = z.tuple([updateChannelSchema]);
export const minimumVersionSchema = z.object({ minVersion: versionSchema });
export const updateStateSchema = z.object({
  currentVersion: versionSchema,
  channel: updateChannelSchema,
  mode: z.enum(['automatic', 'manual', 'managed', 'disabled']),
  status: z.enum(['idle', 'checking', 'available', 'downloading', 'downloaded', 'error']),
  latestVersion: versionSchema.nullable(),
  minVersion: versionSchema.nullable(),
  required: z.boolean(),
  progress: z.number().min(0).max(100).nullable(),
  error: z.enum(['check', 'download', 'preferences']).nullable(),
  minimumCheckFailed: z.boolean(),
});
export type UpdateState = z.infer<typeof updateStateSchema>;
export type UpdateChannel = z.infer<typeof updateChannelSchema>;

export function compareVersions(left: string, right: string): number {
  const parts = (value: string) => {
    const [core, prerelease] = versionSchema.parse(value).split('+')[0].split(/-(.*)/s);
    return { core: core.split('.').map(BigInt), prerelease: prerelease?.split('.') };
  };
  const a = parts(left);
  const b = parts(right);
  for (let index = 0; index < 3; index++) {
    if (a.core[index] !== b.core[index]) return a.core[index] > b.core[index] ? 1 : -1;
  }
  if (!a.prerelease || !b.prerelease) return a.prerelease ? -1 : b.prerelease ? 1 : 0;
  for (let index = 0; index < Math.max(a.prerelease.length, b.prerelease.length); index++) {
    const x = a.prerelease[index];
    const y = b.prerelease[index];
    if (x === y) continue;
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const numericX = /^\d+$/.test(x);
    const numericY = /^\d+$/.test(y);
    if (numericX && numericY) return BigInt(x) > BigInt(y) ? 1 : -1;
    if (numericX !== numericY) return numericX ? -1 : 1;
    return x > y ? 1 : -1;
  }
  return 0;
}
