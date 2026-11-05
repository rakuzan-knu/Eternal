import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { app } from 'electron';
import { getPolicies } from './policies';
import { isConfinedLinux } from '../shared/distribution';

function autostartPath(): string {
  const configured = process.env.XDG_CONFIG_HOME;
  const config = configured && isAbsolute(configured) ? configured : join(homedir(), '.config');
  return join(config, 'autostart', 'com.eternal.desktop.desktop');
}

export function createAutostartEntry(executable: string): string {
  if (
    [...executable].some((character) => character.charCodeAt(0) < 32) ||
    executable.includes('=') ||
    !isAbsolute(executable)
  )
    throw new Error('Invalid application path');
  const escaped = executable.replace(/[\\"`$%]/g, (character) => {
    if (character === '\\') return '\\\\\\\\';
    if (character === '%') return '%%';
    return `\\\\${character}`;
  });
  return `[Desktop Entry]\nType=Application\nName=Eternal\nExec="${escaped}"\nTerminal=false\nX-GNOME-Autostart-enabled=true\n`;
}

export async function getAutoLaunch(): Promise<boolean> {
  if (isConfinedLinux() || process.windowsStore) return false;
  if (!app.isPackaged) return false;
  if (process.platform !== 'linux') return app.getLoginItemSettings().openAtLogin;
  try {
    return (
      (await readFile(autostartPath(), 'utf8')) ===
      createAutostartEntry(process.env.APPIMAGE || process.execPath)
    );
  } catch {
    return false;
  }
}

export async function setAutoLaunch(enabled: boolean): Promise<void> {
  if (isConfinedLinux() || process.windowsStore) {
    if (enabled) throw new Error('Autostart is unavailable in this store package');
    return;
  }
  if (enabled && getPolicies().DisableAutoLaunch)
    throw new Error('Autostart is disabled by your administrator');
  if (!app.isPackaged) throw new Error('Autostart requires an installed application');
  if (process.platform !== 'linux') {
    app.setLoginItemSettings({ openAtLogin: enabled });
    if (app.getLoginItemSettings().openAtLogin !== enabled)
      throw new Error('Autostart setting was not applied');
    return;
  }
  const path = autostartPath();
  if (!enabled) {
    await rm(path, { force: true });
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, createAutostartEntry(process.env.APPIMAGE || process.execPath), {
    mode: 0o600,
  });
}
