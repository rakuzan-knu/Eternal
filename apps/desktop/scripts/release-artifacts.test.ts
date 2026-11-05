import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dump, load } from 'js-yaml';
import { describe, expect, it } from 'vitest';
import {
  assembleArtifacts,
  releaseTargets,
  releaseVersion,
  stageArtifacts,
  targetFiles,
} from './release-artifacts';

const commit = 'a'.repeat(40);

async function fixtures(version = '1.2.3') {
  const root = await mkdtemp(join(tmpdir(), 'eternal-release-test-'));
  const source = join(root, 'staged');
  const output = join(root, 'assets');
  const channel = version.includes('-') ? 'beta' : 'latest';
  for (const row of releaseTargets) {
    for (const target of row.targets) {
      const build = join(root, `build-${target}-${row.arch}`);
      await mkdir(build, { recursive: true });
      const files = targetFiles(version, target, row.arch);
      for (const file of files) await writeFile(join(build, file), file);
      const sha512 = createHash('sha512').update(files[0]).digest('base64');
      const metadata =
        target === 'nsis'
          ? `${channel}.yml`
          : ['dmg', 'zip'].includes(target)
            ? `${channel}-mac.yml`
            : target === 'AppImage'
              ? `${channel}-linux${row.arch === 'arm64' ? '-arm64' : ''}.yml`
              : undefined;
      if (metadata)
        await writeFile(
          join(build, metadata),
          dump({
            version,
            files: [
              {
                url: files[0],
                sha512,
                size: Buffer.byteLength(files[0]),
                ...(target === 'AppImage' ? { blockMapSize: 10 } : {}),
              },
            ],
            path: files[0],
            sha512,
          }),
        );
      await stageArtifacts(
        version,
        target,
        row.arch,
        build,
        join(source, `${target}-${row.arch}`),
        commit,
      );
    }
    const directory = join(source, `sbom-${row.os}-${row.arch}`);
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, `Eternal-${version}-${row.os}-${row.arch}.cdx.json`),
      JSON.stringify({ bomFormat: 'CycloneDX', components: [{ name: 'electron-updater' }] }),
    );
  }
  return { root, source, output, channel };
}

describe('desktop release assets', () => {
  it('stages the real x64 AppImage filename without rewriting updater metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'eternal-appimage-stage-'));
    const destination = join(root, 'staged');
    const filename = 'Eternal-0.0.0-linux-x86_64.AppImage';
    const body = 'appimage fixture from the observed CI filename';
    const sha512 = createHash('sha512').update(body).digest('base64');
    const metadata = dump({
      version: '0.0.0',
      files: [{ url: filename, sha512, size: Buffer.byteLength(body), blockMapSize: 10 }],
      path: filename,
      sha512,
    });
    await writeFile(join(root, filename), body);
    await writeFile(join(root, `${filename}.blockmap`), 'blockmap');
    await writeFile(join(root, 'latest-linux.yml'), metadata);
    await writeFile(join(root, 'Eternal-0.0.0-linux-x64.AppImage'), 'unexpected artifact');
    await stageArtifacts('0.0.0', 'AppImage', 'x64', root, destination, commit);
    expect((await readdir(destination)).sort()).toEqual([
      filename,
      `${filename}.blockmap`,
      'latest-linux.yml',
      'manifest.json',
    ]);
    expect(await readFile(join(destination, 'latest-linux.yml'), 'utf8')).toBe(metadata);
    expect(JSON.parse(await readFile(join(destination, 'manifest.json'), 'utf8'))).toMatchObject({
      target: 'AppImage',
      arch: 'x64',
      files: [filename, 'latest-linux.yml', `${filename}.blockmap`],
    });
  });

  it.each(['v1.2.3', 'v1.2.3-beta.1'])('accepts supported semantic-release tag %s', (tag) => {
    expect(releaseVersion(tag)).toBe(tag.slice(1));
  });

  it.each(['1.2.3', 'v01.2.3', 'v1.2.3-alpha.1', 'v1.2.3-beta.01', 'v1.2.3+build', 'v1.2.3\n'])(
    'rejects unsupported release tag %j',
    (tag) => {
      expect(() => releaseVersion(tag)).toThrow();
    },
  );

  it.each(['1.2.3', '1.2.3-beta.2'])(
    'merges complete matrix for %s and hashes every asset',
    async (version) => {
      const { source, output, channel } = await fixtures(version);
      await assembleArtifacts(version, source, output, commit);
      const windows: unknown = load(await readFile(join(output, `${channel}.yml`), 'utf8'));
      expect(windows).toMatchObject({
        version,
        files: [
          { url: `Eternal-${version}-win-x64.exe` },
          { url: `Eternal-${version}-win-arm64.exe` },
        ],
      });
      expect(load(await readFile(join(output, `${channel}-mac.yml`), 'utf8'))).toMatchObject({
        files: [
          { url: `Eternal-${version}-mac-universal.dmg` },
          { url: `Eternal-${version}-mac-universal.zip` },
        ],
      });
      const checksums = (await readFile(join(output, 'SHA256SUMS'), 'utf8')).trim().split('\n');
      expect(
        load(await readFile(join(output, `${channel}-linux-arm64.yml`), 'utf8')),
      ).toMatchObject({
        files: [{ blockMapSize: 10 }],
      });
      expect(load(await readFile(join(output, `${channel}-linux.yml`), 'utf8'))).toMatchObject({
        path: `Eternal-${version}-linux-x86_64.AppImage`,
        files: [{ url: `Eternal-${version}-linux-x86_64.AppImage` }],
      });
      expect(JSON.parse(await readFile(join(output, 'desktop-release.json'), 'utf8'))).toEqual({
        version,
        tag: `v${version}`,
        commit,
      });
      expect(checksums).toHaveLength(24);
      for (const line of checksums) {
        const [hash, file] = line.split('  ');
        expect(
          createHash('sha256')
            .update(await readFile(join(output, file)))
            .digest('hex'),
        ).toBe(hash);
      }
      await expect(assembleArtifacts(version, source, output, commit)).rejects.toThrow(
        'Output must be empty',
      );
    },
  );

  it('rejects missing architectures', async () => {
    const { source, output } = await fixtures();
    await writeFile(join(source, 'msi-arm64', 'manifest.json'), '{}');
    await expect(assembleArtifacts('1.2.3', source, output, commit)).rejects.toThrow();
  });

  it('rejects staged artifacts built from another commit', async () => {
    const { source, output } = await fixtures();
    await expect(assembleArtifacts('1.2.3', source, output, 'b'.repeat(40))).rejects.toThrow(
      'does not match release',
    );
  });

  it('rejects artifacts that disagree with the updater SHA512', async () => {
    const { source, output } = await fixtures();
    await writeFile(join(source, 'nsis-x64', 'Eternal-1.2.3-win-x64.exe'), 'corrupt');
    await expect(assembleArtifacts('1.2.3', source, output, commit)).rejects.toThrow(
      'integrity mismatch',
    );
  });

  it('rejects a different version in update metadata', async () => {
    const { source, output } = await fixtures();
    const path = join(source, 'nsis-x64', 'latest.yml');
    await writeFile(path, (await readFile(path, 'utf8')).replace('1.2.3', '1.2.4'));
    await expect(assembleArtifacts('1.2.3', source, output, commit)).rejects.toThrow(
      'version mismatch',
    );
  });

  it('rejects paths outside the release directory', async () => {
    const { source, output } = await fixtures();
    const path = join(source, 'nsis-x64', 'latest.yml');
    await writeFile(
      path,
      (await readFile(path, 'utf8')).replace('url: Eternal-', 'url: ../Eternal-'),
    );
    await expect(assembleArtifacts('1.2.3', source, output, commit)).rejects.toThrow();
  });

  it('requires NSIS blockmaps at staging time', async () => {
    const root = await mkdtemp(join(tmpdir(), 'eternal-stage-test-'));
    await writeFile(join(root, 'Eternal-1.2.3-win-x64.exe'), 'installer');
    await expect(
      stageArtifacts('1.2.3', 'nsis', 'x64', root, join(root, 'stage'), commit),
    ).rejects.toThrow();
  });
});
