import { describe, expect, it } from 'vitest';
import {
  compareVersions,
  minimumVersionSchema,
  updateChannelArgumentsSchema,
  versionSchema,
} from './updates';
import { updateMode } from './distribution';

describe('desktop release contracts', () => {
  it.each([
    ['1.10.0', '1.9.0', 1],
    ['1.0.0', '1.0.0-beta.10', 1],
    ['1.0.0-beta.10', '1.0.0-beta.2', 1],
    ['1.0.0-alpha', '1.0.0-beta', -1],
    ['1.0.0-beta.1', '1.0.0-beta.1.1', -1],
    ['1.0.0-1', '1.0.0-alpha', -1],
    ['1.0.0+build1', '1.0.0+build2', 0],
    ['9007199254740993.0.0', '9007199254740992.0.0', 1],
  ])('compares %s and %s semantically', (a, b, expected) => {
    expect(compareVersions(a, b)).toBe(expected);
    expect(compareVersions(b, a)).toBe(expected === 0 ? 0 : -expected);
  });
  it.each(['v1.0.0', '1.0', '01.0.0', '1.0.0-beta.01', '1.0.0-', '../1.0.0'])(
    'rejects invalid version %s',
    (version) => {
      expect(versionSchema.safeParse(version).success).toBe(false);
    },
  );
  it('validates channel arguments and policy without accepting arbitrary feeds', () => {
    expect(updateChannelArgumentsSchema.safeParse(['stable', 'https://evil.test']).success).toBe(
      false,
    );
    expect(updateChannelArgumentsSchema.safeParse(['latest']).success).toBe(false);
    expect(minimumVersionSchema.safeParse({ minVersion: 2 }).success).toBe(false);
  });
  it.each([
    [true, 'win32', 'nsis', false, false, 'automatic'],
    [true, 'win32', 'msi', false, false, 'managed'],
    [true, 'win32', 'appx', false, false, 'managed'],
    [true, 'win32', 'msix', false, false, 'managed'],
    [true, 'linux', 'AppImage', true, false, 'automatic'],
    [true, 'linux', 'AppImage', false, false, 'manual'],
    [true, 'linux', 'deb', false, false, 'manual'],
    [true, 'linux', 'rpm', false, false, 'manual'],
    [true, 'linux', 'flatpak', false, false, 'managed'],
    [true, 'linux', 'snap', false, false, 'managed'],
    [true, 'darwin', 'dmg', false, false, 'manual'],
    [true, 'darwin', 'zip', false, false, 'manual'],
    [true, 'darwin', 'dmg', false, true, 'managed'],
    [false, 'win32', 'nsis', false, false, 'disabled'],
    [true, 'win32', undefined, false, false, 'manual'],
  ])('selects update mode for %s %s %s', (packaged, platform, format, appImage, store, mode) => {
    expect(updateMode(packaged, platform, format, appImage, store)).toBe(mode);
  });
});
