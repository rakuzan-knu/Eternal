import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = fileURLToPath(new URL('../prepare-cassandra-bundle.cjs', import.meta.url));

test('optional runtime bundle preserves bytes, replaces atomically and restricts permissions', () => {
  const directory = mkdtempSync(join(tmpdir(), 'eternal-scb-'));
  const target = join(directory, 'bundle.zip');
  const bytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 255, 128, 10]);
  try {
    const env = {
      ...process.env,
      CASSANDRA_SECURE_CONNECT_BUNDLE: target,
      CASSANDRA_SECURE_CONNECT_BUNDLE_BASE64: bytes.toString('base64'),
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = spawnSync(process.execPath, [script], { env });
      assert.equal(result.status, 0, result.stderr.toString());
      assert.deepEqual(readFileSync(target), bytes);
      if (process.platform !== 'win32') assert.equal(statSync(target).mode & 0o777, 0o600);
    }
    const invalid = spawnSync(process.execPath, [script], {
      env: { ...env, CASSANDRA_SECURE_CONNECT_BUNDLE_BASE64: 'not-a-bundle-secret' },
    });
    assert.notEqual(invalid.status, 0);
    assert.deepEqual(readFileSync(target), bytes);
    assert.equal(invalid.stderr.includes('not-a-bundle-secret'), false);
    const disabled = spawnSync(process.execPath, [script], {
      env: { ...env, CASSANDRA_SECURE_CONNECT_BUNDLE_BASE64: '' },
    });
    assert.equal(disabled.status, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects non-ZIP data before creating the target', () => {
  const directory = mkdtempSync(join(tmpdir(), 'eternal-scb-invalid-'));
  const target = join(directory, 'bundle.zip');
  try {
    const result = spawnSync(process.execPath, [script], {
      env: {
        ...process.env,
        CASSANDRA_SECURE_CONNECT_BUNDLE: target,
        CASSANDRA_SECURE_CONNECT_BUNDLE_BASE64: Buffer.from('not a zip').toString('base64'),
      },
    });
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(target), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
