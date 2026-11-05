import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { targetFiles } from './release-artifacts';

const outputSchema = z.object({
  artifacts: z.array(z.object({ target: z.string(), arch: z.string(), filename: z.string() })),
  metadata: z.array(z.object({ target: z.string(), url: z.string(), maintainer: z.string() })),
});

describe('Linux packaging compatibility', () => {
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
  });
});
