import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Resolve the packages actually used by these consumers, including pnpm patches.
const rootRequire = createRequire(new URL('../../../package.json', import.meta.url));
const backendRequire = createRequire(
  new URL('../../../apps/backend/package.json', import.meta.url),
);
const desktopRequire = createRequire(
  new URL('../../../apps/desktop/package.json', import.meta.url),
);
const mobileRequire = createRequire(new URL('../../../apps/mobile/package.json', import.meta.url));
const from = (parent, name) => createRequire(parent.resolve(`${name}/package.json`));
const builderRequire = from(from(desktopRequire, 'electron-builder'), 'app-builder-lib');
const universalRequire = from(builderRequire, '@electron/universal');
const nxRequire = from(rootRequire, 'nx');
const strykerRequire = from(backendRequire, '@stryker-mutator/core');
const nestRequire = from(backendRequire, '@nestjs/cli');
const expoRequire = from(from(mobileRequire, 'expo'), '@expo/cli');

async function entries(consumer, name, expectedVersion) {
  const metadata = consumer(`${name}/package.json`);
  assert.equal(metadata.version, expectedVersion);
  const base = dirname(consumer.resolve(`${name}/package.json`));
  const paths = [
    ['CommonJS', consumer.resolve(name)],
    ['ESM', join(base, metadata.exports['.'].import.default)],
  ];
  if (name === 'glob' && metadata.exports['./raw']) {
    paths.push(['CommonJS raw', consumer.resolve('glob/raw')]);
    paths.push(['ESM raw', join(base, metadata.exports['./raw'].import.default)]);
  }
  return Promise.all(
    paths.map(async ([label, entry]) => ({
      label,
      entry,
      base,
      api: label.startsWith('CommonJS') ? consumer(entry) : await import(pathToFileURL(entry).href),
    })),
  );
}

const minimatches = [
  ...(await entries(universalRequire, 'minimatch', '9.0.9')),
  ...(await entries(nxRequire, 'minimatch', '10.2.5')),
  ...(await entries(strykerRequire, 'minimatch', '10.2.6')),
];
const globs = [
  ...(await entries(expoRequire, 'glob', '10.5.0')),
  ...(await entries(nestRequire, 'glob', '13.0.6')),
];

function boundedCompilation(kind, entry, format) {
  const result = spawnSync(
    process.execPath,
    [
      '--max-old-space-size=512',
      fileURLToPath(new URL('./glob-preprocess-worker.mjs', import.meta.url)),
      kind,
      format.startsWith('CommonJS') ? 'CommonJS' : 'ESM',
      entry,
    ],
    { encoding: 'utf8', timeout: 20_000, maxBuffer: 128 * 1024, windowsHide: true },
  );
  assert.ifError(result.error);
  assert.equal(result.signal, null, result.stderr);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /bounded preprocessing verified/);
}

for (const { label, entry, api } of minimatches) {
  describe(`minimatch ${entry.includes('9.0.9') ? '9.0.9' : entry.includes('10.2.5') ? '10.2.5' : '10.2.6'} ${label}`, () => {
    it(
      'bounds splitting and skips quadratic deduplication in an isolated process',
      { timeout: 25_000 },
      () => {
        boundedCompilation('minimatch', entry, label);
      },
    );

    it('retains four-branch matching and the legacy API used by Nx and builders', () => {
      const matcher = new api.Minimatch('**/../a/b/**/../c/d', { optimizationLevel: 2 });
      assert.equal(matcher.set.length, 4);
      assert.equal(matcher.match('../a/b/../c/d'), true);
      assert.equal(matcher.match('x/a/b/y/c/d'), true);
      assert.ok(new api.Minimatch('src/*.ts').makeRe() instanceof RegExp);
      assert.equal(api.minimatch('src/a.ts', 'src/*.ts'), true);
      assert.deepEqual(api.match(['a.ts', 'b.js'], '*.ts'), ['a.ts']);
      assert.equal(api.minimatch('.hidden/file', '**/file'), false);
      assert.equal(api.minimatch('.hidden/file', '**/file', { dot: true }), true);
      assert.equal(api.minimatch('a/b/c', 'a/**/c', { noglobstar: true }), true);
      assert.equal(api.minimatch('a/b/d/c', 'a/**/c', { noglobstar: true }), false);
      assert.equal(
        api.minimatch('//host/share/a/b', '//host/share/**', { platform: 'win32' }),
        true,
      );
    });
  });
}

let fixture;
before(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'eternal-glob-backport-'));
  const tree = async (dir, depth) => {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'file.txt'), 'fixture');
    await writeFile(join(dir, '.hidden'), 'fixture');
    if (depth) await Promise.all(['a', 'b'].map((child) => tree(join(dir, child), depth - 1)));
  };
  await tree(fixture, 5);
});
after(async () => {
  // Only remove the exact temporary directory created by this suite.
  assert.equal(dirname(resolve(fixture)), resolve(tmpdir()));
  assert.ok(resolve(fixture).startsWith(`${resolve(tmpdir())}${sep}eternal-glob-backport-`));
  await rm(fixture, { recursive: true, force: true });
});

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
function countedFs(controller, reason) {
  let calls = 0;
  const count = () => {
    if (++calls === 1) controller.abort(reason);
  };
  return {
    get calls() {
      return calls;
    },
    fs: {
      ...fs,
      readdir(...args) {
        count();
        return fs.readdir(...args);
      },
      readdirSync(...args) {
        count();
        return fs.readdirSync(...args);
      },
    },
  };
}

for (const { label, entry, api } of globs) {
  describe(`glob ${entry.includes('10.5.0') ? '10.5.0' : '13.0.6'} ${label}`, () => {
    it(
      'bounds the actual bundled or external minimatch implementation',
      { timeout: 25_000 },
      () => {
        boundedCompilation('glob', entry, label);
        assert.equal(new api.Glob('**/../a/b/**/../c/d', {}).patterns.length, 4);
      },
    );

    it(
      'rejects with the exact abort reason and starts no further directory reads',
      { timeout: 5_000 },
      async () => {
        const controller = new AbortController();
        const reason = new Error('intentional glob cancellation');
        const counted = countedFs(controller, reason);
        await assert.rejects(
          api.glob('**', { cwd: fixture, signal: controller.signal, fs: counted.fs }),
          (error) => error === reason,
        );
        const atReject = counted.calls;
        assert.equal(atReject, 1);
        await delay(100);
        assert.equal(counted.calls, atReject);
      },
    );

    it(
      'stops a synchronous stream after its first read with the same abort reason',
      { timeout: 5_000 },
      async () => {
        const controller = new AbortController();
        const reason = new Error('intentional synchronous cancellation');
        const counted = countedFs(controller, reason);
        const stream = api.globStreamSync('**', {
          cwd: fixture,
          signal: controller.signal,
          fs: counted.fs,
        });
        const rejected = new Promise((resolveError, reject) => {
          stream.once('error', (error) => {
            try {
              assert.equal(error, reason);
              resolveError();
            } catch (failure) {
              reject(failure);
            }
          });
          stream.once('end', () => reject(new Error('Aborted stream ended without an error')));
        });
        stream.resume();
        await rejected;
        assert.equal(counted.calls, 1);
      },
    );

    it(
      'finishes a paused stream and preserves synchronous, iterable and dot behavior',
      { timeout: 5_000 },
      async () => {
        const expected = api.globSync('**/*.txt', { cwd: fixture });
        assert.ok(expected.length > 16);
        const stream = api.globStream('**/*.txt', { cwd: fixture });
        await delay(50);
        const found = [];
        for await (const value of stream) found.push(value);
        assert.deepEqual(new Set(found), new Set(expected));
        assert.deepEqual(
          new Set(api.globIterateSync('**/*.txt', { cwd: fixture })),
          new Set(expected),
        );
        assert.deepEqual(api.globSync('.hidden', { cwd: fixture }), ['.hidden']);
        assert.deepEqual(api.globSync('*', { cwd: fixture, nodir: true }), ['file.txt']);
        assert.ok(api.globSync('*', { cwd: fixture, dot: true }).includes('.hidden'));
        assert.equal(typeof api.Glob.prototype.walk, 'function');
        assert.equal(typeof api.Glob.prototype.walkSync, 'function');
      },
    );
  });
}

for (const consumer of [expoRequire, nestRequire]) {
  for (const format of ['commonjs', 'esm']) {
    it(`settles every aborted walker callback and retains the resume guard (${consumer('glob/package.json').version} ${format})`, async () => {
      const base = dirname(consumer.resolve('glob/package.json'));
      const modulePath = join(base, 'dist', format, 'walker.js');
      const { GlobWalker } =
        format === 'commonjs' ? consumer(modulePath) : await import(pathToFileURL(modulePath).href);
      const controller = new AbortController();
      const glob = new (consumer('glob').Glob)('**', { cwd: fixture, signal: controller.signal });
      const walker = new GlobWalker(glob.patterns, glob.scurry.cwd, {
        ...glob.opts,
        maxDepth: Infinity,
      });
      controller.abort(new Error('intentional callback cancellation'));
      let settled = 0;
      const callback = () => {
        settled++;
      };
      const processor = {
        processPatterns() {
          throw new Error('Must not process after cancellation');
        },
      };
      walker.walkCB(glob.scurry.cwd, glob.patterns, callback);
      walker.walkCB2(glob.scurry.cwd, glob.patterns, processor, callback);
      walker.walkCBSync(glob.scurry.cwd, glob.patterns, callback);
      walker.walkCB2Sync(glob.scurry.cwd, glob.patterns, processor, callback);
      assert.equal(settled, 4);
      walker.onResume(callback);
      assert.equal(settled, 5);
      walker.pause();
      walker.onResume(callback);
      walker.resume();
      assert.equal(walker.paused, true);
      assert.equal(settled, 5);
    });
  }
}

// Decode only what is needed to check a mapping after each edited section.
function originalPosition(map, generatedLine, generatedColumn) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let source = 0;
  let line = 0;
  let column = 0;
  for (const [lineIndex, encodedLine] of map.mappings.split(';').entries()) {
    let generated = 0;
    let found;
    for (const encoded of encodedLine.split(',')) {
      if (!encoded) continue;
      const fields = [];
      let value = 0;
      let shift = 0;
      for (const character of encoded) {
        const digit = alphabet.indexOf(character);
        assert.ok(digit >= 0);
        value += (digit & 31) * 2 ** shift;
        if (digit & 32) shift += 5;
        else {
          fields.push(value & 1 ? -(value >> 1) : value >> 1);
          value = 0;
          shift = 0;
        }
      }
      generated += fields[0];
      if (fields.length > 1) {
        source += fields[1];
        line += fields[2];
        column += fields[3];
      }
      if (lineIndex === generatedLine && generated <= generatedColumn) {
        found = fields.length > 1 ? { source, line, column } : undefined;
      }
      if (lineIndex === generatedLine && generated > generatedColumn) break;
    }
    if (lineIndex === generatedLine) return found;
  }
}

it('retains original source positions after the patched runtime sections', async () => {
  const runtimeFiles = new Set(minimatches.map((item) => item.entry));
  for (const { entry, base, label } of globs) {
    if (!label.endsWith('raw') && entry.endsWith('index.min.js')) runtimeFiles.add(entry);
    runtimeFiles.add(
      join(base, 'dist', label.startsWith('CommonJS') ? 'commonjs' : 'esm', 'walker.js'),
    );
  }
  for (const file of runtimeFiles) {
    const source = await readFile(file, 'utf8');
    const map = JSON.parse(await readFile(`${file}.map`, 'utf8'));
    assert.match(source, /sourceMappingURL=/);
    assert.equal(map.version, 3);
    assert.ok(map.mappings.length > 0);
    assert.equal(map.sources.length, map.sourcesContent.length);
    assert.ok(map.sourcesContent.every((content) => typeof content === 'string'));
    const marker = file.endsWith('walker.js')
      ? /async matchCheck\([^)]*\)\s*\{/
      : /partsMatch\([^)]*\)\s*\{/;
    const match = marker.exec(source);
    assert.ok(match, `Missing mapping checkpoint in ${file}`);
    const prefix = source.slice(0, match.index);
    const generatedLine = prefix.split('\n').length - 1;
    const generatedColumn = match.index - prefix.lastIndexOf('\n') - 1;
    const position = originalPosition(map, generatedLine, generatedColumn);
    assert.ok(position, `Unmapped checkpoint in ${file}`);
    const originalLine = map.sourcesContent[position.source].split('\n')[position.line];
    assert.match(originalLine, file.endsWith('walker.js') ? /matchCheck/ : /partsMatch/);
  }
});
