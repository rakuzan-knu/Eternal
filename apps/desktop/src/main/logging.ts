import { open, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, dialog } from 'electron';
import log from 'electron-log/node';

export const logLimit = 2 * 1024 * 1024;
export type DiagnosticEvent =
  | 'startup'
  | 'ready'
  | 'shutdown'
  | 'startup-failed'
  | 'policy-unknown'
  | 'tray-unavailable'
  | 'renderer-gone'
  | 'child-process-gone'
  | 'minimum-check-failed'
  | 'update-check-failed'
  | 'update-download-failed'
  | 'telemetry-unavailable'
  | 'unhandled-error';

export function initializeLogging(): void {
  log.transports.console.level = false;
  log.transports.file.resolvePathFn = () => join(app.getPath('logs'), 'main.log');
  log.transports.file.maxSize = logLimit;
  log.transports.file.level = 'info';
}

export function diagnostic(event: DiagnosticEvent, count?: number): void {
  log.info(event, ...(Number.isSafeInteger(count) ? [count] : []));
}

export async function createLogExport(): Promise<string> {
  const sections = [`Eternal ${app.getVersion()} | ${process.platform} ${process.arch}`];
  for (const name of ['main.old.log', 'main.log']) {
    let handle;
    try {
      handle = await open(join(app.getPath('logs'), name), 'r');
      const size = (await handle.stat()).size;
      const buffer = Buffer.alloc(Math.min(size, logLimit));
      const { bytesRead } = await handle.read(
        buffer,
        0,
        buffer.length,
        Math.max(0, size - logLimit),
      );
      sections.push(`\n--- ${name} ---\n${buffer.subarray(0, bytesRead).toString('utf8')}`);
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    } finally {
      await handle?.close();
    }
  }
  return sections.join('\n');
}

export async function exportLogs(): Promise<void> {
  const result = await dialog.showSaveDialog({
    title: 'Export Eternal logs',
    defaultPath: 'Eternal-diagnostics.txt',
    filters: [{ name: 'Diagnostic logs', extensions: ['txt'] }],
  });
  if (result.canceled || !result.filePath) return;
  await writeFile(result.filePath, await createLogExport(), { mode: 0o600 });
}
