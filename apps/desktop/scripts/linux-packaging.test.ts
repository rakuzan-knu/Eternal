import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { targetFiles } from './release-artifacts';

const outputSchema = z.object({
  artifacts: z.array(z.object({ target: z.string(), arch: z.string(), filename: z.string() })),
  metadata: z.array(z.object({ target: z.string(), url: z.string(), maintainer: z.string() })),
});

describe('Linux packaging compatibility', () => {
  it('stages Snap desktop integration without referring to a future meta/gui file', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import config from './electron-builder.config.ts';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const builder = createRequire(require.resolve('electron-builder/package.json'));
const packagerRequire = createRequire(builder.resolve('app-builder-lib/package.json'));
const { Packager } = builder('app-builder-lib');
const { AppInfo } = packagerRequire('./out/appInfo.js');
const { createElectronFrameworkSupport } = packagerRequire('./out/electron/ElectronFramework.js');
const { LinuxPackager } = packagerRequire('./out/linuxPackager.js');
const { LinuxTargetHelper } = packagerRequire('./out/targets/LinuxTargetHelper.js');
const { Arch } = packagerRequire('builder-util');
const packager = new Packager({ projectDir: process.cwd(), config, effectiveOptionComputed: () => true });
try {
  await packager.validateConfig();
  packager._appInfo = new AppInfo(packager, null);
  packager._framework = await createElectronFrameworkSupport(config, packager);
  const core = new LinuxTargetHelper(new LinuxPackager(packager)).getSnapCore();
  const directory = await packager.tempDirManager.getTempDir({ prefix: 'snap-desktop-test' });
  const appOutDir = join(directory, 'source-app');
  const stageDir = join(directory, 'stage');
  await mkdir(appOutDir, { recursive: true });
  await writeFile(join(appOutDir, 'eternal-desktop'), 'fixture executable');
  await writeFile(join(appOutDir, 'chrome-sandbox'), 'fixture sandbox helper');
  const snap = await core.createDescriptor(Arch.x64);
  await core.buildSnap({ snap, appOutDir, stageDir, snapArch: Arch.x64, artifactPath: join(directory, 'fixture.snap') });
  process.stdout.write(JSON.stringify({
    app: snap.apps[snap.name],
    desktop: await readFile(join(stageDir, 'snap/gui/eternal-desktop.desktop'), 'utf8'),
    launcher: await readFile(join(stageDir, 'app/command.sh'), 'utf8'),
    sandbox: await readFile(join(stageDir, 'app/chrome-sandbox'), 'utf8'),
  }));
} finally {
  await packager.tempDirManager.cleanup();
}`,
      ],
      {
        cwd: import.meta.dirname + '/..',
        env: { ...process.env, ETERNAL_DESKTOP_DISTRIBUTION: 'snap' },
        encoding: 'utf8',
        timeout: 20_000,
      },
    );
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const output = z
      .object({
        app: z.object({ command: z.string(), desktop: z.string().optional() }),
        desktop: z.string(),
        launcher: z.string(),
        sandbox: z.string(),
      })
      .parse(JSON.parse(result.stdout.trim().split('\n').at(-1) ?? ''));
    expect(output.app.command).toBe('command.sh');
    expect(output.app.desktop).toBeUndefined();
    expect(output.desktop).toContain('Exec=eternal-desktop %U');
    expect(output.desktop).toContain('x-scheme-handler/eternal');
    expect(output.desktop).toContain('${SNAP}/meta/gui/eternal-desktop.png');
    expect(output.launcher).toContain('app/eternal-desktop');
    expect(output.launcher).not.toContain('--no-sandbox');
    expect(output.sandbox).toBe('fixture sandbox helper');
  }, 25_000);

  it('matches filenames and package metadata produced by the installed electron-builder', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import config from './electron-builder.config.ts';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const builder = createRequire(require.resolve('electron-builder/package.json'));
const packagerRequire = createRequire(builder.resolve('app-builder-lib/package.json'));
const { Packager } = builder('app-builder-lib');
const { AppInfo } = packagerRequire('./out/appInfo.js');
const { LinuxPackager } = packagerRequire('./out/linuxPackager.js');
const { LinuxTargetHelper } = packagerRequire('./out/targets/LinuxTargetHelper.js');
const FpmTarget = packagerRequire('./out/targets/FpmTarget.js').default;
const { Arch } = packagerRequire('builder-util');
const packager = new Packager({ projectDir: process.cwd(), config });
try {
  await packager.validateConfig();
  packager._appInfo = new AppInfo(packager, null);
  const linux = new LinuxPackager(packager);
  const artifacts = [];
  for (const target of ['AppImage', 'deb', 'rpm']) {
    for (const arch of ['x64', 'arm64']) {
      artifacts.push({ target, arch, filename: linux.expandArtifactNamePattern({}, target, Arch[arch]) });
    }
  }
  const metadata = [];
  for (const target of ['deb', 'rpm']) {
    const directory = await packager.tempDirManager.getTempDir({ prefix: 'linux-metadata-test' });
    const fpm = new FpmTarget(target, linux, new LinuxTargetHelper(linux), directory);
    await fpm.scriptFiles;
    metadata.push({ target, ...await fpm.checkOptions() });
  }
  process.stdout.write(JSON.stringify({ artifacts, metadata }));
} finally {
  await packager.tempDirManager.cleanup();
}`,
      ],
      {
        cwd: import.meta.dirname + '/..',
        env: { ...process.env, ETERNAL_DESKTOP_DISTRIBUTION: 'AppImage' },
        encoding: 'utf8',
        timeout: 20_000,
      },
    );
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const output = outputSchema.parse(JSON.parse(result.stdout));
    expect(output.artifacts).toEqual([
      { target: 'AppImage', arch: 'x64', filename: 'Eternal-0.0.0-linux-x86_64.AppImage' },
      { target: 'AppImage', arch: 'arm64', filename: 'Eternal-0.0.0-linux-arm64.AppImage' },
      { target: 'deb', arch: 'x64', filename: 'Eternal-0.0.0-linux-amd64.deb' },
      { target: 'deb', arch: 'arm64', filename: 'Eternal-0.0.0-linux-arm64.deb' },
      { target: 'rpm', arch: 'x64', filename: 'Eternal-0.0.0-linux-x86_64.rpm' },
      { target: 'rpm', arch: 'arm64', filename: 'Eternal-0.0.0-linux-aarch64.rpm' },
    ]);
    for (const artifact of output.artifacts)
      expect(targetFiles('0.0.0', artifact.target, artifact.arch)).toEqual([artifact.filename]);
    expect(output.metadata).toEqual([
      {
        target: 'deb',
        url: 'https://eternalnet.vercel.app',
        maintainer: 'Eternal contributors <eternalnet.support@proton.me>',
      },
      {
        target: 'rpm',
        url: 'https://eternalnet.vercel.app',
        maintainer: 'Eternal contributors <eternalnet.support@proton.me>',
      },
    ]);
  }, 25_000);
});
