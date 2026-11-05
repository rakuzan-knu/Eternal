import { resolve } from 'node:path';
import { BrowserWindow, type Session } from 'electron';
import { secureWebContents } from './security';
import { readWindowState, trackWindowState } from './windowState';
import { configureContextMenu } from './menu';
import { devToolsEnabled, getPolicies } from './policies';

export function createWindow(
  session: Session,
  origin: string,
  canShow: () => boolean = () => true,
): BrowserWindow {
  const state = readWindowState();
  const window = new BrowserWindow({
    title: 'Eternal',
    width: 1280,
    height: 840,
    ...state,
    minWidth: state ? Math.min(800, state.width) : 800,
    minHeight: state ? Math.min(600, state.height) : 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      session,
      preload: resolve(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      webSecurity: true,
      webviewTag: false,
      allowRunningInsecureContent: false,
      navigateOnDragDrop: false,
      devTools: devToolsEnabled(),
      additionalArguments: getPolicies().DisableTelemetry ? ['--eternal-disable-telemetry'] : [],
      spellcheck: true,
    },
  });
  secureWebContents(window.webContents, origin);
  configureContextMenu(window.webContents, origin);
  trackWindowState(window);
  window.once('ready-to-show', () => {
    if (!canShow()) return;
    if (state?.maximized) window.maximize();
    window.show();
  });
  return window;
}
