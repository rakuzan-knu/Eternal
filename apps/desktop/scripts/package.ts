import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { distributionSchema } from '../src/shared/distribution.ts';
import { versionSchema } from '../src/shared/updates.ts';
import { microsoftStoreIdentity, stableStoreVersion } from './store-config.ts';

const formats = {
  win32: ['nsis', 'msi', 'appx', 'msix'],
  darwin: ['dmg', 'zip'],
  linux: ['AppImage', 'deb', 'rpm', 'flatpak', 'snap'],
};
const args = process.argv.slice(2);
const nativeFormat =
  process.platform === 'win32' ? 'nsis' : process.platform === 'darwin' ? 'dmg' : 'AppImage';
const format = distributionSchema.parse(
  args[0] && !args[0].startsWith('--') ? args.shift() : nativeFormat,
);
const platform = Object.entries(formats).find(([, values]) => values.includes(format))?.[0];
if (!platform) throw new Error('Unsupported distribution');
const builderArgs = ['--config', 'electron-builder.config.ts', '--publish', 'never'];
let version = process.env.npm_package_version ?? '0.0.0';
builderArgs.push(
  platform === 'win32' ? '--win' : platform === 'darwin' ? '--mac' : '--linux',
  format === 'msix' ? 'appx' : format,
);
const architecture = args.find((arg) => ['--x64', '--arm64', '--universal'].includes(arg));
if (architecture === '--universal' && platform !== 'darwin')
  throw new Error('Universal is macOS only');
if (args.filter((arg) => ['--x64', '--arm64', '--universal'].includes(arg)).length > 1)
  throw new Error('Build one architecture at a time');
builderArgs.push(architecture ?? (platform === 'darwin' ? '--universal' : `--${process.arch}`));
for (let index = 0; index < args.length; index++) {
  const arg = args[index];
  if (['--x64', '--arm64', '--universal'].includes(arg)) continue;
  if (arg === '--dir') builderArgs.push(arg);
  else if (arg === '--version') {
    version = versionSchema.parse(args[++index]);
    builderArgs.push(`--config.extraMetadata.version=${version}`);
  } else throw new Error(`Unsupported packaging argument: ${arg}`);
}
const require = createRequire(import.meta.url);
if (format === 'msix') {
  stableStoreVersion(version);
  microsoftStoreIdentity(process.env);
}
const result = spawnSync(
  process.execPath,
  [require.resolve('electron-builder/cli.js'), ...builderArgs],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      ETERNAL_DESKTOP_DISTRIBUTION: format,
      ETERNAL_DESKTOP_UPDATE_CHANNEL: version.includes('-beta') ? 'beta' : 'latest',
    },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
