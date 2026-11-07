import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { it } from 'node:test';

const backendRequire = createRequire(new URL('../../apps/backend/package.json', import.meta.url));
const commonJs = backendRequire('zod');
const esmEntry = backendRequire.resolve('zod').replace(/index\.cjs$/, 'index.js');
const esm = await import(pathToFileURL(esmEntry).href);

for (const [format, z] of [
  ['CommonJS', commonJs.z],
  ['ESM', esm.z],
]) {
  for (const kind of ['array max', 'array length', 'set max', 'set size']) {
    for (const async of [false, true]) {
      it(`${format} ${kind} rejects oversize before ${async ? 'async' : 'sync'} child parsing`, async () => {
        let childCalls = 0;
        const child = z.preprocess((value) => {
          childCalls++;
          return value;
        }, z.string());
        const collection = kind.startsWith('array') ? z.array(child) : z.set(child);
        const schema = z.object({
          items: kind.endsWith('max')
            ? collection.max(2, 'Collection too large')
            : kind.endsWith('length')
              ? collection.length(2, 'Collection too large')
              : collection.size(2, 'Collection too large'),
        });
        const values = Array.from({ length: 1000 }, (_, index) => index);
        const input = { items: kind.startsWith('array') ? values : new Set(values) };
        const result = async ? await schema.safeParseAsync(input) : schema.safeParse(input);
        assert.equal(result.success, false);
        assert.equal(childCalls, 0);
        assert.equal(result.error.issues.length, 1);
        assert.equal(result.error.issues[0].code, 'too_big');
        assert.equal(result.error.issues[0].message, 'Collection too large');
        assert.deepEqual(result.error.issues[0].path, ['items']);
      });
    }
  }
  it(`${format} preserves accepted transforms, lower bounds and in-bound child errors`, async () => {
    const array = z.array(z.string().transform((value) => value.trim())).max(2);
    assert.deepEqual(array.parse([' a ', 'b']), ['a', 'b']);
    assert.deepEqual(await array.parseAsync([' a ']), ['a']);
    const invalid = array.safeParse([1]);
    assert.equal(invalid.success, false);
    assert.equal(invalid.error.issues[0].code, 'invalid_type');
    assert.deepEqual(invalid.error.issues[0].path, [0]);
    const short = z.array(z.string()).length(2).safeParse(['a']);
    assert.equal(short.success, false);
    assert.equal(short.error.issues[0].code, 'too_small');
    const shortSet = z
      .set(z.string())
      .min(2)
      .safeParse(new Set(['a']));
    assert.equal(shortSet.success, false);
    assert.equal(shortSet.error.issues[0].code, 'too_small');
    assert.deepEqual(
      z
        .set(z.string())
        .size(2)
        .parse(new Set(['a', 'b'])),
      new Set(['a', 'b']),
    );
    assert.equal(z.union([array, z.string()]).parse('alternative'), 'alternative');
    let transformed = false;
    const oversized = array
      .transform(() => {
        transformed = true;
      })
      .safeParse(['a', 'b', 'c']);
    assert.equal(oversized.success, false);
    assert.equal(transformed, false);
  });
}
