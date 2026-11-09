import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash';
const shellPath = (path) =>
  path.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
const script = shellPath(fileURLToPath(new URL('../verify-backup.sh', import.meta.url)));

test('restore drill fails closed and cleans up only its created database', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'eternal-restore-'));
  const bin = join(workspace, 'bin');
  const backups = join(workspace, 'backups');
  const calls = join(workspace, 'calls');
  mkdirSync(bin);
  mkdirSync(backups);
  const stub = (name, body) => {
    const path = join(bin, name);
    writeFileSync(path, `#!/bin/bash\nset -euo pipefail\n${body}\n`);
    chmodSync(path, 0o700);
  };
  stub('createdb', 'printf "create %s\\n" "$*" >> "$CALLS"; exit "${CREATE_STATUS:-0}"');
  stub('dropdb', 'printf "drop %s\\n" "$*" >> "$CALLS"; exit "${DROP_STATUS:-0}"');
  stub(
    'psql',
    `
printf 'psql %s\n' "$*" >> "$CALLS"
[[ " $* " == *" -X "* && " $* " == *" ON_ERROR_STOP=1 "* ]] || exit 90
if [[ " $* " == *" -c "* ]]; then
  [ "\${MODE:-}" != count-error ] || exit 23
  if [ "\${MODE:-}" = empty ]; then echo 0; else echo 2; fi
else
  cat >/dev/null
  [ "\${MODE:-}" != sql-error ] || exit 3
fi`,
  );
  stub(
    'gunzip',
    `
if [ "\${MODE:-}" = stream-error ] && [ "\${1:-}" = -c ]; then
  gzip -dc "\${2}"
  exit 7
fi
exec gzip -d "$@"`,
  );
  const env = {
    ...process.env,
    CALLS: shellPath(calls),
    BACKUP_DIR: shellPath(backups),
    POSTGRES_HOST: 'test-only.invalid',
    POSTGRES_PASSWORD: 'test-only',
  };
  delete env.BACKUP_ENCRYPTION_KEY;
  const run = (file, extra = {}) => {
    writeFileSync(calls, '');
    const result = spawnSync(
      bash,
      [
        '-c',
        'export PATH="$1:$PATH"; shift; exec bash "$@"',
        'restore-test',
        shellPath(bin),
        script,
        ...(file ? [shellPath(file)] : []),
      ],
      { env: { ...env, ...extra }, encoding: 'utf8', timeout: 15000 },
    );
    assert.ifError(result.error);
    return { ...result, calls: readFileSync(calls, 'utf8') };
  };
  try {
    const missing = run();
    assert.notEqual(missing.status, 0);
    assert.match(missing.stdout, /No valid backup file/);
    assert.equal(missing.calls, '');

    // Shell syntax in a filename must stay data, even when the newest backup is auto-selected.
    const gzip = join(backups, "backup_quoted ' $(exit 99).sql.gz");
    writeFileSync(gzip, gzipSync('CREATE TABLE example(id INT);\n'));
    const success = run();
    assert.equal(success.status, 0, success.stderr + success.stdout);
    assert.match(success.stdout, /Restored 2 public tables/);
    assert.doesNotMatch(success.stdout, /100%|RPO\/RTO validated/);
    assert.match(success.calls, /^create /m);
    assert.match(success.calls, /^drop /m);
    const database = success.calls.split('\n')[0].split(' ').at(-1);
    assert.match(database, /^restore_test_\d+_\d+_\d+$/);
    assert.ok(
      success.calls
        .split('\n')
        .find((line) => line.startsWith('drop '))
        .endsWith(database),
    );

    for (const mode of ['sql-error', 'stream-error', 'count-error', 'empty']) {
      const failed = run(gzip, { MODE: mode });
      assert.notEqual(failed.status, 0, mode);
      assert.match(failed.calls, /^drop /m, mode);
      assert.doesNotMatch(failed.stdout, /Restore drill successful/, mode);
    }
    const createFailure = run(gzip, { CREATE_STATUS: '1' });
    assert.notEqual(createFailure.status, 0);
    assert.doesNotMatch(createFailure.calls, /^drop |^psql /m);
    const cleanupFailure = run(gzip, { DROP_STATUS: '7' });
    assert.notEqual(cleanupFailure.status, 0);
    assert.match(cleanupFailure.stderr, /Cleanup failed: temporary test database/);
    const originalFailure = run(gzip, { MODE: 'count-error', DROP_STATUS: '7' });
    assert.equal(originalFailure.status, 23);
    assert.match(originalFailure.stderr, /Cleanup failed: temporary test database/);

    const encrypted = join(backups, 'encrypted.sql.gz.enc');
    const key = 'test-only-key-"-$(exit 99)-1234567890';
    const encrypt = spawnSync(
      bash,
      [
        '-c',
        'openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -pass env:BACKUP_ENCRYPTION_KEY < "$1" > "$2"',
        'encrypt-test',
        shellPath(gzip),
        shellPath(encrypted),
      ],
      { env: { ...env, BACKUP_ENCRYPTION_KEY: key }, encoding: 'utf8', timeout: 15000 },
    );
    assert.equal(encrypt.status, 0, encrypt.stderr);
    const noKey = run(encrypted);
    assert.notEqual(noKey.status, 0);
    assert.match(noKey.stderr, /BACKUP_ENCRYPTION_KEY is required/);
    assert.equal(noKey.calls, '');
    const wrongKey = run(encrypted, { BACKUP_ENCRYPTION_KEY: 'incorrect-test-key' });
    assert.notEqual(wrongKey.status, 0);
    assert.equal(wrongKey.calls, '');

    // Record OpenSSL argv while keeping the real crypto implementation for this test.
    const openssl = spawnSync(bash, ['-c', 'command -v openssl'], { encoding: 'utf8' });
    assert.equal(openssl.status, 0);
    stub(
      'openssl',
      `
printf "openssl %s\\n" "$*" >> "$CALLS"
"$REAL_OPENSSL" "$@"
if [ "\${MODE:-}" = decrypt-error ]; then exit 7; fi
if [ "\${MODE:-}" = encrypted-stream-error ] && [ "$(grep -c '^openssl ' "$CALLS")" -gt 1 ]; then exit 7; fi`,
    );
    const encryptedSuccess = run(encrypted, {
      BACKUP_ENCRYPTION_KEY: key,
      REAL_OPENSSL: openssl.stdout.trim(),
    });
    assert.equal(encryptedSuccess.status, 0, encryptedSuccess.stderr + encryptedSuccess.stdout);
    assert.match(encryptedSuccess.calls, /-pass env:BACKUP_ENCRYPTION_KEY/);
    assert.equal(encryptedSuccess.calls.includes(key), false);
    for (const mode of ['decrypt-error', 'encrypted-stream-error']) {
      const failed = run(encrypted, {
        MODE: mode,
        BACKUP_ENCRYPTION_KEY: key,
        REAL_OPENSSL: openssl.stdout.trim(),
      });
      assert.notEqual(failed.status, 0, mode);
      assert.doesNotMatch(failed.stdout, /Restore drill successful/, mode);
      if (mode === 'decrypt-error') assert.doesNotMatch(failed.calls, /^create |^drop /m);
      else assert.match(failed.calls, /^drop /m);
    }

    writeFileSync(gzip, 'corrupt gzip');
    const corrupt = run(gzip);
    assert.notEqual(corrupt.status, 0);
    assert.equal(corrupt.calls, '');
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
