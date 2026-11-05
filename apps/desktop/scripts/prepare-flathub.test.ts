import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { prepareFlathub } from './prepare-flathub';

const listing = {
  developerName: 'Eternal & contributors',
  metadataLicense: 'CC0-1.0',
  screenshotUrl: 'https://example.com/screenshot.png?a=1&b=2',
  releaseDate: '2026-11-01',
};

async function fixture(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'eternal-flathub-'));
  try {
    const files = {
      'desktop-release.json': JSON.stringify({
        version: '1.12.0',
        tag: 'v1.12.0',
        commit: 'a'.repeat(40),
      }),
      'Eternal-1.12.0-linux-x64.deb': 'x64 test fixture',
      'Eternal-1.12.0-linux-arm64.deb': 'arm64 test fixture',
    };
    let sums = '';
    for (const [name, contents] of Object.entries(files)) {
      await writeFile(join(directory, name), contents);
      sums += `${createHash('sha256').update(contents).digest('hex')}  ${name}\n`;
    }
    await writeFile(join(directory, 'SHA256SUMS'), sums);
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe('Flathub submission bundle', () => {
  it('pins both architectures to release checksums without redistributing app binaries', async () => {
    await fixture(async (directory) => {
      const output = join(directory, 'submission');
      await prepareFlathub('1.12.0', directory, output, listing);
      const manifest = JSON.parse(await readFile(join(output, 'com.eternal.desktop.json'), 'utf8'));
      expect(manifest.modules[0].sources.slice(0, 2)).toEqual([
        expect.objectContaining({ type: 'extra-data', 'only-arches': ['x86_64'], size: 16 }),
        expect.objectContaining({ type: 'extra-data', 'only-arches': ['aarch64'], size: 18 }),
      ]);
      expect(manifest.modules[0].sources[0].url).toContain('/v1.12.0/Eternal-1.12.0-linux-x64.deb');
      const metadata = await readFile(join(output, 'com.eternal.desktop.metainfo.xml'), 'utf8');
      expect(metadata).toContain('Eternal &amp; contributors');
      expect(metadata).toContain('a=1&amp;b=2');
      expect(metadata).toContain('<project_license>LicenseRef-proprietary</project_license>');
      expect(await readFile(join(output, 'eternal'), 'utf8')).toContain('exec zypak-wrapper');
      await expect(prepareFlathub('1.12.0', directory, output, listing)).rejects.toThrow();
    });
  });

  it('rejects a tampered package before creating the output directory', async () => {
    await fixture(async (directory) => {
      await writeFile(join(directory, 'Eternal-1.12.0-linux-arm64.deb'), 'tampered');
      await expect(
        prepareFlathub('1.12.0', directory, join(directory, 'submission'), listing),
      ).rejects.toThrow('Checksum mismatch');
    });
  });

  it('requires explicit metadata licensing and stable release provenance', async () => {
    await fixture(async (directory) => {
      await expect(
        prepareFlathub('1.12.0', directory, join(directory, 'submission'), {
          ...listing,
          metadataLicense: 'UNLICENSED',
        }),
      ).rejects.toThrow();
      await expect(
        prepareFlathub('1.12.1', directory, join(directory, 'submission'), listing),
      ).rejects.toThrow('does not match');
      await expect(
        prepareFlathub('1.12.0-beta.1', directory, join(directory, 'submission'), listing),
      ).rejects.toThrow();
    });
  });
});
