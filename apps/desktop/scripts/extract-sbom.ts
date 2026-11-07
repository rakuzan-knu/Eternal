import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const builderRequire = createRequire(require.resolve('electron-builder'));
const libraryRequire = createRequire(builderRequire.resolve('app-builder-lib'));
const asar: { extractAll(archive: string, destination: string): void } =
  libraryRequire('@electron/asar');
const [archive, destination] = process.argv.slice(2);
if (!archive || !destination) throw new Error('Expected ASAR path and SBOM source directory');
asar.extractAll(resolve(archive), resolve(destination));
