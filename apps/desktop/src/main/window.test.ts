import { describe, expect, it, vi } from 'vitest';
import { session } from 'electron';

vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events');
  return {
    app: { isPackaged: true },
    session: { defaultSession: {} },
    BrowserWindow: class extends EventEmitter {
      webContents = {};
      maximize = vi.fn();
      show = vi.fn();
    },
  };
});
vi.mock('./security', () => ({ secureWebContents: vi.fn() }));
vi.mock('./menu', () => ({ configureContextMenu: vi.fn() }));
vi.mock('./windowState', () => ({
  readWindowState: () => ({ width: 1000, height: 700, maximized: true }),
  trackWindowState: vi.fn(),
}));
import { createWindow } from './window';
import { APP_ORIGIN } from './constants';

describe('minimum version window gate', () => {
  it('rechecks the gate before displaying or maximizing a loaded window', () => {
    let permitted = true;
    const window = createWindow(session.defaultSession, APP_ORIGIN, () => permitted);
    permitted = false;
    window.emit('ready-to-show');
    expect(window.show).not.toHaveBeenCalled();
    expect(window.maximize).not.toHaveBeenCalled();
  });
  it('restores the normal maximized window when the version is allowed', () => {
    const window = createWindow(session.defaultSession, APP_ORIGIN, () => true);
    window.emit('ready-to-show');
    expect(window.maximize).toHaveBeenCalledTimes(1);
    expect(window.show).toHaveBeenCalledTimes(1);
  });
});
