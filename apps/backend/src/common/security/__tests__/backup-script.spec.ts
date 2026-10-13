import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash';
const shellPath = (path: string) =>
  path.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive: string) => `/${drive.toLowerCase()}`);

describe('encrypted database backup script', () => {
  it('requires a key, preserves pipeline failures and creates a decryptable encrypted backup', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'social-backup-security-'));
    const bin = join(workspace, 'bin');
    const backups = join(workspace, 'backups');
    mkdirSync(bin);
    mkdirSync(backups);
    const dump = join(bin, 'pg_dump');
    const key = 'random-test-only-backup-key-1234567890';
    const script = shellPath(resolve(process.cwd(), '../../scripts/db/backup-db.sh'));
    const run = (encryptionKey?: string) => {
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        BACKUP_DIR: shellPath(backups),
        POSTGRES_PASSWORD: 'test-only',
        BACKUP_S3_BUCKET: '',
        BACKUP_ENCRYPTION_KEY: encryptionKey,
      };
      if (!encryptionKey) delete env.BACKUP_ENCRYPTION_KEY;
      return spawnSync(
        bash,
        ['-c', 'export PATH="$1:$PATH"; exec bash "$2"', 'backup-test', shellPath(bin), script],
        { env, encoding: 'utf8', timeout: 15000 },
      );
    };
    try {
      writeFileSync(dump, '#!/bin/bash\nprintf "CREATE TABLE example(id INT);\\n"\n', {
        encoding: 'utf8',
      });
      chmodSync(dump, 0o700);
      const missing = run();
      expect(missing.status).not.toBe(0);
      expect(missing.stderr).toContain('BACKUP_ENCRYPTION_KEY is required');
      expect(readdirSync(backups)).toEqual([]);
      const short = run('short');
      expect(short.status).not.toBe(0);
      expect(readdirSync(backups)).toEqual([]);
      const success = run(key);
      expect(success.error).toBeUndefined();
      expect(success.status).toBe(0);
      const files = readdirSync(backups);
      expect(files).toHaveLength(1);
      expect(readFileSync(join(backups, files[0])).includes(Buffer.from('CREATE TABLE'))).toBe(
        false,
      );
      const decoded = spawnSync(
        bash,
        [
          '-c',
          'set -o pipefail; openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -pass env:BACKUP_ENCRYPTION_KEY -in "$1" | gzip -dc',
          'decode-test',
          shellPath(join(backups, files[0])),
        ],
        { env: { ...process.env, BACKUP_ENCRYPTION_KEY: key }, encoding: 'utf8', timeout: 15000 },
      );
      expect(decoded.status).toBe(0);
      expect(decoded.stdout).toBe('CREATE TABLE example(id INT);\n');
      rmSync(join(backups, files[0]));
      writeFileSync(dump, '#!/bin/bash\nprintf "partial dump"\nexit 1\n', { encoding: 'utf8' });
      expect(run(key).status).not.toBe(0);
      expect(readdirSync(backups)).toEqual([]);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  }, 90_000);
});
