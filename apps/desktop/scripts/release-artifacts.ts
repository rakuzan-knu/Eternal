import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { dump, JSON_SCHEMA, load } from 'js-yaml';
import { z } from 'zod';
import { versionSchema } from '../src/shared/updates.ts';

const filenameSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9.+_-]*$/);
const commitSchema = z.string().regex(/^[a-f0-9]{40}$/);
const targetSchema = z.enum(['nsis', 'msi', 'dmg', 'zip', 'AppImage', 'deb', 'rpm']);
const archSchema = z.enum(['x64', 'arm64', 'universal']);
const manifestSchema = z.object({
  version: versionSchema,
  commit: commitSchema,
  target: targetSchema,
  arch: archSchema,
  files: z.array(filenameSchema).min(1),
});
const updateFileSchema = z.object({
  url: filenameSchema,
  sha512: z.string().regex(/^[A-Za-z0-9+/]{86}==$/),
  size: z.number().int().positive().optional(),
  blockMapSize: z.number().int().positive().optional(),
});
const updateSchema = z.object({
  version: versionSchema,
  files: z.array(updateFileSchema).min(1),
  path: filenameSchema,
  sha512: updateFileSchema.shape.sha512,
  releaseDate: z.string().optional(),
});

export const releaseTargets = [
  { os: 'win', arch: 'x64', targets: ['nsis', 'msi'] },
  { os: 'win', arch: 'arm64', targets: ['nsis', 'msi'] },
  { os: 'mac', arch: 'universal', targets: ['dmg', 'zip'] },
  { os: 'linux', arch: 'x64', targets: ['AppImage', 'deb', 'rpm'] },
  { os: 'linux', arch: 'arm64', targets: ['AppImage', 'deb', 'rpm'] },
] as const;

export function releaseVersion(tag: string): string {
  if (!tag.startsWith('v') || tag !== tag.trim()) throw new Error('Invalid release tag');
  const version = versionSchema.parse(tag.slice(1));
  if (
    version.includes('+') ||
    (version.includes('-') && !/^\d+\.\d+\.\d+-beta\.\d+$/.test(version))
  )
    throw new Error('Only stable and beta.N releases are supported');
  return version;
}

export function targetFiles(version: string, target: string, arch: string): string[] {
  versionSchema.parse(version);
  targetSchema.parse(target);
  archSchema.parse(arch);
  const row = releaseTargets.find(
    (row) => row.arch === arch && row.targets.some((t) => t === target),
  );
  if (!row) throw new Error('Unsupported release target/architecture');
  const extension = target === 'nsis' ? 'exe' : target;
  const artifactArch =
    arch === 'x64' && ['AppImage', 'rpm'].includes(target)
      ? 'x86_64'
      : arch === 'x64' && target === 'deb'
        ? 'amd64'
        : arch === 'arm64' && target === 'rpm'
          ? 'aarch64'
          : arch;
  const artifact = `Eternal-${version}-${row.os}-${artifactArch}.${extension}`;
  return target === 'nsis' ? [artifact, `${artifact}.blockmap`] : [artifact];
}

function channelFile(version: string, target: string, arch: string): string | undefined {
  const channel = version.includes('-') ? 'beta' : 'latest';
  if (target === 'nsis') return `${channel}.yml`;
  if (target === 'dmg' || target === 'zip') return `${channel}-mac.yml`;
  if (target === 'AppImage') return `${channel}-linux${arch === 'x64' ? '' : '-arm64'}.yml`;
  return undefined;
}

async function digest(path: string, algorithm: string, encoding: 'hex' | 'base64') {
  const hash = createHash(algorithm);
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest(encoding);
}

export async function stageArtifacts(
  version: string,
  target: string,
  arch: string,
  source: string,
  destination: string,
  commit = commitSchema.parse(process.env.DESKTOP_RELEASE_COMMIT),
) {
  const required = targetFiles(version, target, arch);
  const entries = await readdir(source);
  const files = [...required];
  const metadata = channelFile(version, target, arch);
  if (metadata) files.push(metadata);
  const blockmap = `${required[0]}.blockmap`;
  if (!files.includes(blockmap) && entries.includes(blockmap)) files.push(blockmap);
  await mkdir(destination, { recursive: true });
  for (const file of files) await copyFile(join(source, file), join(destination, file));
  await writeFile(
    join(destination, 'manifest.json'),
    JSON.stringify(manifestSchema.parse({ version, commit, target, arch, files })),
  );
}

export async function assembleArtifacts(
  version: string,
  source: string,
  destination: string,
  commit = commitSchema.parse(process.env.DESKTOP_RELEASE_COMMIT),
) {
  releaseVersion(`v${version}`);
  commitSchema.parse(commit);
  if ((await readdir(destination).catch(() => [])).length) throw new Error('Output must be empty');
  await mkdir(destination, { recursive: true });
  const metadata = new Map<string, z.infer<typeof updateSchema>>();
  const copied = new Set<string>();
  for (const row of releaseTargets) {
    for (const target of row.targets) {
      const directory = join(source, `${target}-${row.arch}`);
      const manifest = manifestSchema.parse(
        JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')),
      );
      if (
        manifest.version !== version ||
        manifest.commit !== commit ||
        manifest.target !== target ||
        manifest.arch !== row.arch
      )
        throw new Error('Artifact manifest does not match release');
      const required = targetFiles(version, target, row.arch);
      const channel = channelFile(version, target, row.arch);
      const allowed = new Set([
        ...required,
        `${required[0]}.blockmap`,
        ...(channel ? [channel] : []),
      ]);
      if (
        required.some((file) => !manifest.files.includes(file)) ||
        (channel && !manifest.files.includes(channel))
      )
        throw new Error('Incomplete artifact manifest');
      for (const file of manifest.files) {
        if (!allowed.has(file)) throw new Error('Unexpected release artifact');
        if (file === channel) {
          const info = updateSchema.parse(
            load(await readFile(join(directory, file), 'utf8'), { schema: JSON_SCHEMA }),
          );
          if (info.version !== version) throw new Error('Update metadata version mismatch');
          const primary = info.files.find((entry) => entry.url === info.path);
          if (!primary || primary.sha512 !== info.sha512)
            throw new Error('Invalid legacy update metadata');
          for (const entry of info.files) {
            if (entry.url !== required[0]) throw new Error('Unexpected update target');
            const path = join(directory, entry.url);
            if (
              (await digest(path, 'sha512', 'base64')) !== entry.sha512 ||
              (entry.size !== undefined && (await stat(path)).size !== entry.size)
            )
              throw new Error('Update artifact integrity mismatch');
          }
          const previous = metadata.get(file);
          metadata.set(
            file,
            previous ? { ...previous, files: [...previous.files, ...info.files] } : info,
          );
        } else {
          if (copied.has(file)) throw new Error('Duplicate release artifact');
          if ((await stat(join(directory, file))).size > 250 * 1024 * 1024)
            throw new Error(`Installer exceeds the 250 MiB budget: ${file}`);
          await copyFile(join(directory, file), join(destination, file));
          copied.add(file);
        }
      }
    }
    const sbom = `Eternal-${version}-${row.os}-${row.arch}.cdx.json`;
    const sbomPath = join(source, `sbom-${row.os}-${row.arch}`, sbom);
    z.object({ bomFormat: z.literal('CycloneDX'), components: z.array(z.unknown()).min(1) }).parse(
      JSON.parse(await readFile(sbomPath, 'utf8')),
    );
    await copyFile(sbomPath, join(destination, sbom));
  }
  for (const [file, info] of metadata) await writeFile(join(destination, file), dump(info));
  await writeFile(
    join(destination, 'desktop-release.json'),
    JSON.stringify({ version, tag: `v${version}`, commit }, null, 2),
  );
  await writeChecksums(destination);
}

export async function writeChecksums(directory: string) {
  const files = (await readdir(directory))
    .filter((file) => !['SHA256SUMS', 'SHA256SUMS.asc'].includes(file))
    .sort();
  const lines: string[] = [];
  for (const file of files) {
    filenameSchema.parse(file);
    if (!(await stat(join(directory, file))).isFile())
      throw new Error('Unexpected release directory');
    lines.push(`${await digest(join(directory, file), 'sha256', 'hex')}  ${file}`);
  }
  await writeFile(join(directory, 'SHA256SUMS'), `${lines.join('\n')}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'stage') {
    const [version, target, arch, source, destination] = args;
    await stageArtifacts(version, target, arch, source, destination);
  } else if (command === 'assemble') {
    const [version, source, destination] = args;
    await assembleArtifacts(version, source, destination);
  } else throw new Error('Expected stage or assemble command');
}
