import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { stableStoreVersion } from './store-config.ts';
import { targetFiles } from './release-artifacts.ts';

const appId = 'com.eternal.desktop';
const listingSchema = z.object({
  developerName: z.string().trim().min(1).max(256),
  metadataLicense: z.literal('CC0-1.0'),
  screenshotUrl: z.url().startsWith('https://'),
  releaseDate: z.iso.date(),
});
const releaseSchema = z.object({
  version: z.string(),
  tag: z.string(),
  commit: z.string().regex(/^[a-f0-9]{40}$/),
});

function xml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => {
    switch (character) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      default:
        return '&apos;';
    }
  });
}

export async function prepareFlathub(
  version: string,
  assetsDirectory: string,
  outputDirectory: string,
  listing: unknown,
): Promise<void> {
  stableStoreVersion(version);
  const details = listingSchema.parse(listing);
  const assets = resolve(assetsDirectory);
  const output = resolve(outputDirectory);
  const sums = await readFile(join(assets, 'SHA256SUMS'), 'utf8');
  const verify = async (name: string) => {
    const entries = sums.split(/\r?\n/).filter((line) => line.slice(66) === name);
    if (entries.length !== 1 || !/^[a-f0-9]{64} [ *]/.test(entries[0]))
      throw new Error(`Missing or ambiguous SHA256SUMS entry: ${name}`);
    const path = join(assets, name);
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    const digest = hash.digest('hex');
    if (digest !== entries[0].slice(0, 64)) throw new Error(`Checksum mismatch: ${name}`);
    return { sha256: digest, size: (await stat(path)).size };
  };
  await verify('desktop-release.json');
  const release = releaseSchema.parse(
    JSON.parse(await readFile(join(assets, 'desktop-release.json'), 'utf8')),
  );
  if (release.version !== version || release.tag !== `v${version}`)
    throw new Error('Release metadata does not match the requested stable version');
  const sources = [];
  for (const [arch, flatpakArch] of [
    ['x64', 'x86_64'],
    ['arm64', 'aarch64'],
  ] as const) {
    const filename = targetFiles(version, 'deb', arch)[0];
    const digest = await verify(filename);
    if (!digest.size) throw new Error(`Empty package: ${filename}`);
    sources.push({
      type: 'extra-data',
      filename: 'eternal.deb',
      url: `https://github.com/rakuzan-knu/Eternal/releases/download/v${version}/${filename}`,
      ...digest,
      'only-arches': [flatpakArch],
    });
  }
  const manifest = {
    'app-id': appId,
    runtime: 'org.freedesktop.Platform',
    'runtime-version': '25.08',
    sdk: 'org.freedesktop.Sdk',
    base: 'org.electronjs.Electron2.BaseApp',
    'base-version': '25.08',
    command: 'eternal',
    'finish-args': [
      '--share=network',
      '--share=ipc',
      '--socket=fallback-x11',
      '--socket=wayland',
      '--socket=pulseaudio',
      '--device=dri',
    ],
    modules: [
      {
        name: 'eternal',
        buildsystem: 'simple',
        'build-commands': [
          'install -Dm755 apply_extra /app/bin/apply_extra',
          'install -Dm755 eternal /app/bin/eternal',
          `install -Dm644 ${appId}.desktop /app/share/applications/${appId}.desktop`,
          `install -Dm644 ${appId}.metainfo.xml /app/share/metainfo/${appId}.metainfo.xml`,
          `install -Dm644 icon.png /app/share/icons/hicolor/512x512/apps/${appId}.png`,
        ],
        sources: [
          ...sources,
          ...[
            'apply_extra',
            'eternal',
            `${appId}.desktop`,
            `${appId}.metainfo.xml`,
            'icon.png',
          ].map((path) => ({ type: 'file', path })),
        ],
      },
    ],
  };
  const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>${appId}</id>
  <metadata_license>${details.metadataLicense}</metadata_license>
  <project_license>LicenseRef-proprietary</project_license>
  <name>Eternal</name>
  <summary>Social networking, private messaging and calls</summary>
  <developer id="com.eternal"><name>${xml(details.developerName)}</name></developer>
  <description><p>Connect with people, exchange private messages and join voice and video calls on Eternal.</p></description>
  <launchable type="desktop-id">${appId}.desktop</launchable>
  <url type="homepage">https://eternalnet.vercel.app</url>
  <url type="bugtracker">https://github.com/rakuzan-knu/Eternal/issues</url>
  <content_rating type="oars-1.1"><content_attribute id="social-chat">intense</content_attribute><content_attribute id="social-audio">intense</content_attribute></content_rating>
  <screenshots><screenshot type="default"><image>${xml(details.screenshotUrl)}</image></screenshot></screenshots>
  <releases><release version="${version}" date="${details.releaseDate}"/></releases>
</component>
`;
  await mkdir(output);
  const files = {
    [`${appId}.json`]: `${JSON.stringify(manifest, null, 2)}\n`,
    'flathub.json': `${JSON.stringify({ 'only-arches': ['x86_64', 'aarch64'] }, null, 2)}\n`,
    apply_extra:
      '#!/bin/sh\nset -eu\nbsdtar -Oxf eternal.deb "data.tar.*" > data.tar\nbsdtar --no-same-owner -xf data.tar\ntest -x opt/Eternal/eternal\nrm eternal.deb data.tar\n',
    eternal:
      '#!/bin/sh\nexport TMPDIR="$XDG_RUNTIME_DIR/app/$FLATPAK_ID"\nexec zypak-wrapper /app/extra/opt/Eternal/eternal "$@"\n',
    [`${appId}.desktop`]: `[Desktop Entry]\nType=Application\nName=Eternal\nComment=Social networking, private messaging and calls\nExec=eternal %U\nIcon=${appId}\nTerminal=false\nCategories=Network;InstantMessaging;\nMimeType=x-scheme-handler/eternal;\nStartupWMClass=eternal\n`,
    [`${appId}.metainfo.xml`]: metadata,
  };
  for (const [name, contents] of Object.entries(files))
    await writeFile(join(output, name), contents, {
      mode: name === 'eternal' || name === 'apply_extra' ? 0o755 : 0o644,
    });
  await copyFile(new URL('../build/icons/512x512.png', import.meta.url), join(output, 'icon.png'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [version, assets, output, listingPath] = process.argv.slice(2);
  if (!version || !assets || !output || !listingPath)
    throw new Error(
      'Usage: prepare-flathub.ts <stable-version> <verified-release-assets> <new-output-directory> <listing.json>',
    );
  await prepareFlathub(version, assets, output, JSON.parse(await readFile(listingPath, 'utf8')));
}
