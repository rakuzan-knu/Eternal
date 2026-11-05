import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ root: '', save: vi.fn() }));
vi.mock('electron', () => ({
  app: { getPath: () => mocks.root, getVersion: () => '1.0.0' },
  dialog: { showSaveDialog: mocks.save },
}));
import { createLogExport, diagnostic, exportLogs, initializeLogging, logLimit } from './logging';

beforeEach(async () => {
  mocks.root = await mkdtemp(join(tmpdir(), 'eternal-diagnostics-'));
  initializeLogging();
});
afterEach(async () => {
  await rm(mocks.root, { recursive: true, force: true });
});

describe('local diagnostic logs', () => {
  it('rotates the bounded file and exports both generations without profile files', async () => {
    await writeFile(join(mocks.root, 'main.log'), 'x'.repeat(logLimit + 1));
    await writeFile(join(mocks.root, 'cookies'), 'private cookie');
    diagnostic('startup');
    const text = await createLogExport();
    expect(text).toContain('--- main.old.log ---');
    expect(text).toContain('startup');
    expect(text).not.toContain('private cookie');
    expect(text.length).toBeLessThan(logLimit * 2 + 200);
  });
  it('does not write on cancel, saves plain diagnostics only at the chosen path', async () => {
    mocks.save.mockResolvedValue({ canceled: true });
    await exportLogs();
    const destination = join(mocks.root, 'export.txt');
    mocks.save.mockResolvedValue({ canceled: false, filePath: destination });
    diagnostic('policy-unknown', 2);
    await exportLogs();
    expect(await readFile(destination, 'utf8')).toContain('policy-unknown 2');
  });
  it('reports unreadable export destinations to the caller', async () => {
    mocks.save.mockResolvedValue({
      canceled: false,
      filePath: join(mocks.root, 'missing', 'export.txt'),
    });
    await expect(exportLogs()).rejects.toThrow();
  });
});
