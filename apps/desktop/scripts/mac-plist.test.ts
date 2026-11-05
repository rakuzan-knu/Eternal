import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('macOS packaging dependencies', () => {
  it('parses Info.plist with the XML parser resolved by electron-builder', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const builder = createRequire(require.resolve('electron-builder/package.json'));
const packager = createRequire(builder.resolve('app-builder-lib/package.json'));
const plist = packager('plist');
const document = '<plist version="1.0"><dict><key>CFBundleName</key><string>Eternal</string><key>LSUIElement</key><true/></dict></plist>';
process.stdout.write(JSON.stringify(plist.parse(document)));`,
      ],
      { encoding: 'utf8', cwd: import.meta.dirname + '/..' },
    );
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('{"CFBundleName":"Eternal","LSUIElement":true}');
  });
});
