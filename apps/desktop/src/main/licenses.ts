import { resolve } from 'node:path';
import { app, dialog, shell } from 'electron';

export async function openLicenseMaterials(): Promise<void> {
  const directory = app.isPackaged
    ? resolve(process.resourcesPath, 'licenses')
    : resolve(app.getAppPath(), 'build/licenses');
  try {
    if (await shell.openPath(directory)) throw new Error('Unable to open license materials');
  } catch {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Eternal licenses',
      message: 'Unable to open the bundled license materials.',
    });
  }
}
