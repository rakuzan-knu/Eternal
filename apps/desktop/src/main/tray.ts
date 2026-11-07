import { app, dialog, Menu, Tray, type NativeImage } from 'electron';
import { getAutoLaunch, setAutoLaunch } from './autoLaunch';
import type { DesktopIdleState } from '../shared/ipcContract';
import { getPolicies } from './policies';

export async function createTray(icon: NativeImage, show: () => void) {
  const tray = new Tray(icon);
  tray.setToolTip('Eternal');
  const menu = Menu.buildFromTemplate([
    { label: 'Open Eternal', click: show },
    { id: 'presence', label: 'Status: Active', enabled: false },
    { type: 'separator' },
    {
      label: 'Open at login',
      type: 'checkbox',
      checked: await getAutoLaunch(),
      enabled: app.isPackaged && !getPolicies().DisableAutoLaunch,
      click: (item) => {
        const requested = item.checked;
        item.enabled = false;
        void setAutoLaunch(requested)
          .catch(() => {
            item.checked = !requested;
            void dialog.showMessageBox({
              type: 'error',
              title: 'Eternal',
              message: 'Unable to change Open at login. Check your system settings.',
            });
          })
          .finally(() => {
            item.enabled = app.isPackaged && !getPolicies().DisableAutoLaunch;
            if (!tray.isDestroyed()) tray.setContextMenu(menu);
          });
      },
    },
    { type: 'separator' },
    { role: 'quit', label: 'Quit Eternal' },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', show);
  tray.on('double-click', show);
  return {
    setIdle(state: DesktopIdleState) {
      const status =
        state === 'idle' || state === 'locked' ? 'Away' : state === 'active' ? 'Active' : 'Unknown';
      tray.setToolTip(`Eternal — ${status}`);
      const item = menu.getMenuItemById('presence');
      if (item) item.label = `Status: ${status}`;
      tray.setContextMenu(menu);
    },
    destroy: () => tray.destroy(),
  };
}
