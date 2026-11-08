import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const require = createRequire(import.meta.url);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const relativeFile = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9_./-]*$/)
  .refine(
    (value) => !isAbsolute(value) && !value.includes('\\') && !value.split('/').includes('..'),
  );
const manifestSchema = z.object({
  package: z.literal('uiohook-napi'),
  version: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/),
  archive: z.string().regex(/^uiohook-napi-[0-9.]+-source\.tar\.gz$/),
  archiveSha256: sha256,
  licenses: z.array(z.object({ file: relativeFile, sha256 })).length(2),
  sourceFiles: z.record(relativeFile, sha256),
});

export const nativeLicenseDirectory = resolve(import.meta.dirname, '../build/licenses');
export const nativeDependencyDirectory = dirname(require.resolve('uiohook-napi/package.json'));
export const projectLicense = resolve(import.meta.dirname, '../../../LICENSE.md');

export async function verifyNativeLicenseSource(
  resources = nativeLicenseDirectory,
  dependency = nativeDependencyDirectory,
) {
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(join(resources, 'native-source-manifest.json'), 'utf8')),
  );
  const pkg = z
    .object({ name: z.string(), version: z.string() })
    .parse(JSON.parse(await readFile(join(dependency, 'package.json'), 'utf8')));
  if (manifest.archive !== `uiohook-napi-${manifest.version}-source.tar.gz`)
    throw new Error('Native source archive version mismatch');
  if (pkg.name !== manifest.package || pkg.version !== manifest.version)
    throw new Error('Native dependency changed; refresh its corresponding sources and licenses');
  const check = async (file: string, expected: string) => {
    if (
      createHash('sha256')
        .update(await readFile(file))
        .digest('hex') !== expected
    )
      throw new Error(`Native license source mismatch: ${basename(file)}`);
  };
  await check(join(resources, manifest.archive), manifest.archiveSha256);
  for (const license of manifest.licenses)
    await check(join(resources, license.file), license.sha256);
  for (const required of ['binding.gyp', 'libuiohook/include/uiohook.h', 'src/lib/addon.c'])
    if (!manifest.sourceFiles[required]) throw new Error('Native source manifest is incomplete');
  for (const [file, digest] of Object.entries(manifest.sourceFiles))
    await check(join(dependency, file), digest);
  return manifest;
}

export async function verifyPackagedLicenseMaterials(resources: string): Promise<void> {
  const manifest = await verifyNativeLicenseSource();
  const files = [
    manifest.archive,
    'native-source-manifest.json',
    'README.NATIVE-SOURCE.txt',
    'THIRD_PARTY_NOTICES.txt',
    ...manifest.licenses.map((license) => license.file),
  ];
  for (const file of [...files, 'Eternal-LICENSE.md']) {
    const source =
      file === 'Eternal-LICENSE.md' ? projectLicense : join(nativeLicenseDirectory, file);
    if (!(await readFile(join(resources, 'licenses', file))).equals(await readFile(source)))
      throw new Error(`Packaged license material mismatch: ${file}`);
  }
}

async function removeNativeSourceScratch(scratch: string): Promise<void> {
  const actual = await realpath(scratch);
  if (
    dirname(actual) !== (await realpath(tmpdir())) ||
    !basename(actual).startsWith('eternal-native-source-')
  )
    throw new Error('Refusing to remove an unexpected native source directory');
  await rm(scratch, { recursive: true, force: true });
}

async function rebuildNativeLicenseSource(output?: string): Promise<void> {
  const manifest = await verifyNativeLicenseSource();
  const scratch = await mkdtemp(join(tmpdir(), 'eternal-native-source-'));
  const run = (command: string, args: string[], cwd: string) => {
    const result = spawnSync(command, args, { cwd, stdio: 'inherit', timeout: 600_000 });
    if (result.error || result.status !== 0) throw new Error('Native source rebuild failed');
  };
  try {
    run('tar', ['-xzf', join(nativeLicenseDirectory, manifest.archive), '-C', scratch], scratch);
    const source = join(scratch, `uiohook-napi-${manifest.version}`);
    const npm =
      process.platform === 'win32'
        ? resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
        : resolve(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js');
    run(
      process.execPath,
      [npm, 'exec', '--yes', '--package=node-gyp@12.4.0', '--', 'node-gyp', 'rebuild'],
      source,
    );
    run(
      process.execPath,
      [
        '-e',
        "const addon = require(process.argv[1]); if (typeof addon.start !== 'function' || typeof addon.stop !== 'function') process.exit(1);",
        join(source, 'build/Release/uiohook_napi.node'),
      ],
      source,
    );
    if (output) {
      await mkdir(output, { recursive: true });
      const binary = join(source, 'build/Release/uiohook_napi.node');
      await copyFile(binary, join(output, 'uiohook_napi.node'));
      await writeFile(
        join(output, 'source.json'),
        JSON.stringify(
          {
            package: manifest.package,
            version: manifest.version,
            archiveSha256: manifest.archiveSha256,
            binarySha256: createHash('sha256')
              .update(await readFile(binary))
              .digest('hex'),
            platform: process.platform,
            architecture: process.arch,
            nodeVersion: process.versions.node,
          },
          null,
          2,
        ),
      );
    }
    process.stdout.write(
      JSON.stringify({ rebuilt: true, platform: process.platform, architecture: process.arch }) +
        '\n',
    );
  } finally {
    await removeNativeSourceScratch(scratch);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'rebuild') await rebuildNativeLicenseSource(process.argv[3]);
  else if (process.argv[2] === 'verify-package' && process.argv[3]) {
    await verifyPackagedLicenseMaterials(resolve(process.argv[3]));
    process.stdout.write(JSON.stringify({ packagedLicensesVerified: true }) + '\n');
  } else if (!process.argv[2] || process.argv[2] === 'verify') {
    const manifest = await verifyNativeLicenseSource();
    process.stdout.write(JSON.stringify({ verified: true, version: manifest.version }) + '\n');
  } else throw new Error('Unsupported native license source command');
}
