import { spawnSync } from 'node:child_process';
import { FuseV1Options } from '@electron/fuses';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const resultSchema = z.object({
  events: z.array(z.string()),
  sliceWires: z.array(z.string()),
  mergedWires: z.array(z.string()),
  hasCustomAfterPack: z.boolean(),
  resetAdHocDarwinSignature: z.boolean(),
  hardenedRuntime: z.boolean(),
  entitlements: z.string(),
  entitlementsInherit: z.string(),
});

describe('universal packaging security lifecycle', () => {
  it('lets the installed builder merge unmodified slices before applying every security fuse and signing', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        String.raw`import config from './electron-builder.config.ts';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const builder = createRequire(require.resolve('electron-builder/package.json'));
const packagerRequire = createRequire(builder.resolve('app-builder-lib/package.json'));
const { Packager } = builder('app-builder-lib');
const { AppInfo } = packagerRequire('./out/appInfo.js');
const { MacPackager } = packagerRequire('./out/macPackager.js');
const { PlatformPackager } = packagerRequire('./out/platformPackager.js');
const { Arch } = packagerRequire('builder-util');
const universal = packagerRequire('@electron/universal');
const packager = new Packager({ projectDir: process.cwd(), config });
const sentinel = Buffer.from('dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX');
const freshWire = Buffer.concat([sentinel, Buffer.from([1, 9]), Buffer.from('111111111')]);
const events = [];
const sliceWires = [];
const readWires = (binary) => {
  const wires = [];
  for (let position = binary.indexOf(sentinel); position !== -1; position = binary.indexOf(sentinel, position + sentinel.length)) {
    const start = position + sentinel.length + 2;
    wires.push(binary.subarray(start, start + 9).toString());
  }
  return wires;
};
const framework = (appPath) => join(appPath, 'Contents', 'Frameworks', 'Electron Framework.framework', 'Electron Framework');
try {
  await packager.validateConfig();
  packager._appInfo = new AppInfo(packager, null);
  packager._framework = { name: 'electron', version: '45.1.0' };
  const mac = new MacPackager(packager);
  const root = await packager.tempDirManager.getTempDir({ prefix: 'universal-fuses-test' });
  const appName = mac.appInfo.productFilename + '.app';
  PlatformPackager.prototype.doPack = async function (options) {
    events.push('pack-' + Arch[options.arch]);
    if (!options.options.disableFuses || options.options.sign !== false)
      throw new Error('Intermediate slices must defer native fuses and signing');
    const binary = framework(join(options.appOutDir, appName));
    await mkdir(join(binary, '..'), { recursive: true });
    await writeFile(binary, freshWire);
    await this.info.emitAfterPack({ ...options, electronPlatformName: 'darwin', packager: this });
    sliceWires.push(...readWires(await readFile(binary)));
  };
  universal.makeUniversalApp = async (options) => {
    events.push('merge');
    const x64 = await readFile(framework(options.x64AppPath));
    const arm64 = await readFile(framework(options.arm64AppPath));
    const binary = framework(options.outAppPath);
    await mkdir(join(binary, '..'), { recursive: true });
    await writeFile(binary, Buffer.concat([x64, Buffer.from('fat-binary-separator'), arm64]));
  };
  packager.emitAfterPack = async (context) => {
    events.push('afterPack-' + Arch[context.arch]);
    if (typeof config.afterPack === 'function') await config.afterPack(context);
  };
  const applyFuses = mac.doAddElectronFuses.bind(mac);
  mac.doAddElectronFuses = async (context) => {
    events.push('fuses-' + Arch[context.arch]);
    await applyFuses(context);
  };
  let mergedWires = [];
  mac.doSignAfterPack = async (_outDir, appOutDir, _platform, arch) => {
    events.push('sign-' + Arch[arch]);
    mergedWires = readWires(await readFile(framework(join(appOutDir, appName))));
  };
  if (process.platform === 'darwin') {
    mac.addElectronFuses = async (context, fuseConfig) => {
      const { flipFuses } = packagerRequire('@electron/fuses');
      await flipFuses(join(context.appOutDir, appName), { ...fuseConfig, resetAdHocDarwinSignature: false });
    };
  }
  await mac.doUniversalPack({
    outDir: root,
    appOutDir: join(root, 'mac-universal'),
    platformName: 'darwin',
    arch: Arch.universal,
    platformSpecificBuildOptions: config.mac,
    targets: [],
  });
  process.stdout.write('\nETERNAL_FUSES_TEST:' + JSON.stringify({
    events, sliceWires, mergedWires,
    hasCustomAfterPack: config.afterPack !== undefined,
    resetAdHocDarwinSignature: config.electronFuses.resetAdHocDarwinSignature,
    hardenedRuntime: config.mac.hardenedRuntime,
    entitlements: config.mac.entitlements,
    entitlementsInherit: config.mac.entitlementsInherit,
  }));
} finally {
  await packager.tempDirManager.cleanup();
}`,
      ],
      {
        cwd: import.meta.dirname + '/..',
        env: { ...process.env, ETERNAL_DESKTOP_DISTRIBUTION: 'dmg' },
        encoding: 'utf8',
        timeout: 20_000,
      },
    );
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const payload = result.stdout.split('\nETERNAL_FUSES_TEST:').at(-1);
    expect(payload).toBeTruthy();
    const parsed = resultSchema.parse(JSON.parse(payload ?? ''));
    expect(parsed.events).toEqual([
      'pack-x64',
      'afterPack-x64',
      'pack-arm64',
      'afterPack-arm64',
      'merge',
      'afterPack-universal',
      'fuses-universal',
      'sign-universal',
    ]);
    expect(parsed.sliceWires).toEqual(['111111111', '111111111']);
    expect(parsed.mergedWires).toHaveLength(2);
    for (const wire of parsed.mergedWires) {
      expect(wire[FuseV1Options.RunAsNode]).toBe('0');
      expect(wire[FuseV1Options.EnableCookieEncryption]).toBe('1');
      expect(wire[FuseV1Options.EnableNodeOptionsEnvironmentVariable]).toBe('0');
      expect(wire[FuseV1Options.EnableNodeCliInspectArguments]).toBe('0');
      expect(wire[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]).toBe('1');
      expect(wire[FuseV1Options.OnlyLoadAppFromAsar]).toBe('1');
      expect(wire.slice(6)).toBe('111');
    }
    expect(parsed.hasCustomAfterPack).toBe(false);
    expect(parsed.resetAdHocDarwinSignature).toBe(process.platform === 'darwin');
    expect(parsed.hardenedRuntime).toBe(true);
    expect(parsed.entitlements).toBe('build/entitlements.mac.plist');
    expect(parsed.entitlementsInherit).toBe('build/entitlements.mac.plist');
  }, 25_000);
});
