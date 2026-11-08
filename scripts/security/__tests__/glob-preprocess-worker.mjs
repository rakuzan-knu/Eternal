// Adversarial compilation stays in a disposable process with a parent-enforced
// timeout and V8 heap limit. Do not import this fixture into the test process.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const [kind, format, entry] = process.argv.slice(2);
const api =
  format === 'CommonJS'
    ? createRequire(import.meta.url)(entry)
    : await import(pathToFileURL(entry).href);
const pattern = Array(30).fill('**/../a/b').join('/');

for (const braceExpandMax of [16, 64]) {
  const options = { optimizationLevel: 2, braceExpandMax };
  const matcher =
    kind === 'minimatch' ? new api.Minimatch(pattern, options) : new api.Glob(pattern, options);
  assert.equal(kind === 'minimatch' ? matcher.set.length : matcher.patterns.length, braceExpandMax);
}

const small =
  kind === 'minimatch'
    ? new api.Minimatch('{x,*}/{0..9}', { optimizationLevel: 2 })
    : new api.Glob('{x,*}/{0..9}', {});
const large =
  kind === 'minimatch'
    ? new api.Minimatch('{x,*}/{0..999}', { optimizationLevel: 2 })
    : new api.Glob('{x,*}/{0..999}', {});
assert.equal(kind === 'minimatch' ? small.set.length : small.patterns.length, 10);
assert.equal(kind === 'minimatch' ? large.set.length : large.patterns.length, 2000);

if (kind === 'minimatch') {
  assert.equal(large.match('x/5'), true);
  assert.equal(large.match('y/999'), true);
  assert.equal(large.match('.y/5'), false);
  // Check the default ceiling without compiling 100,000 sets into regexps.
  const matcher = new api.Minimatch('a', { optimizationLevel: 2 });
  assert.equal(
    matcher.firstPhasePreProcess([Array(18).fill('**/../a/b').join('/').split('/')]).length,
    100_000,
  );
}

process.stdout.write('bounded preprocessing verified\n');
