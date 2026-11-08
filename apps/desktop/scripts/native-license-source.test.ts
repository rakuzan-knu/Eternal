import { afterEach, describe, expect, it } from 'vitest';
import { copyFile, cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import {
  nativeDependencyDirectory,
  nativeLicenseDirectory,
  verifyNativeLicenseSource,
} from './native-license-source';

const scratch: string[] = [];
async function directory() {
  const value = await mkdtemp(join(tmpdir(), 'eternal-native-license-test-'));
  scratch.push(value);
  return value;
}
afterEach(async () => {
  for (const path of scratch.splice(0)) {
    const actual = await realpath(path);
    if (
      dirname(actual) !== (await realpath(tmpdir())) ||
      !basename(actual).startsWith('eternal-native-license-test-')
    )
      throw new Error('Unexpected native license test directory');
    await rm(path, { recursive: true, force: true });
  }
});

describe('native source distribution contract', () => {
  it('ships the license copies and archived sources matching the installed native dependency', async () => {
    const manifest = await verifyNativeLicenseSource();
    expect(manifest.sourceFiles['binding.gyp']).toBeDefined();
    expect(manifest.sourceFiles['libuiohook/include/uiohook.h']).toBeDefined();
    expect(manifest.sourceFiles['src/lib/addon.c']).toBeDefined();
  });
  it('blocks a dependency version update without refreshed corresponding materials', async () => {
    const dependency = await directory();
    await writeFile(join(dependency, 'package.json'), '{"name":"uiohook-napi","version":"9.9.9"}');
    await expect(verifyNativeLicenseSource(nativeLicenseDirectory, dependency)).rejects.toThrow(
      'refresh its corresponding sources',
    );
  });
  it('blocks a changed source archive even if installed package metadata is unchanged', async () => {
    const resources = await directory();
    await cp(nativeLicenseDirectory, resources, { recursive: true });
    const manifest = await verifyNativeLicenseSource();
    await writeFile(join(resources, manifest.archive), 'damaged archive');
    await expect(verifyNativeLicenseSource(resources)).rejects.toThrow('source mismatch');
  });
  it('blocks native source changes that no longer match the supplied archive inputs', async () => {
    const dependency = await directory();
    const manifest = z
      .object({ sourceFiles: z.record(z.string(), z.string()) })
      .parse(
        JSON.parse(
          await readFile(join(nativeLicenseDirectory, 'native-source-manifest.json'), 'utf8'),
        ),
      );
    for (const file of ['package.json', ...Object.keys(manifest.sourceFiles)]) {
      await mkdir(dirname(join(dependency, file)), { recursive: true });
      await copyFile(join(nativeDependencyDirectory, file), join(dependency, file));
    }
    await writeFile(join(dependency, 'binding.gyp'), 'modified native build inputs');
    await expect(verifyNativeLicenseSource(nativeLicenseDirectory, dependency)).rejects.toThrow(
      'source mismatch: binding.gyp',
    );
  });
});
