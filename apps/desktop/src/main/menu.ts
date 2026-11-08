import { app, dialog, Menu, type MenuItemConstructorOptions, type WebContents } from 'electron';
import { isTrustedUrl } from './security';
import type { DesktopUpdater } from './updater';
import { devToolsEnabled, getPolicies } from './policies';
import { exportLogs } from './logging';
import { openLicenseMaterials } from './licenses';

export function configureMenu(show: () => void, updater: DesktopUpdater): void {
  const reportError = () => {
    void dialog.showMessageBox({
      type: 'error',
      title: 'Eternal updates',
      message:
        'Unable to update Eternal. Check your connection, finish any active call and try again.',
    });
  };
  const checkUpdates = async () => {
    const state = await updater.check();
    if (state.mode === 'disabled' || state.mode === 'managed') {
      await dialog.showMessageBox({
        title: 'Eternal updates',
        message:
          state.mode === 'disabled'
            ? 'Updates are available in installed builds.'
            : 'Updates are managed by your administrator or application store.',
      });
      return;
    }
    const ready = state.status === 'downloaded';
    const available = state.status === 'available' || ready;
    const action =
      state.mode === 'manual'
        ? 'Open download page'
        : ready
          ? 'Restart and install'
          : 'Download update';
    const result = await dialog.showMessageBox({
      title: 'Eternal updates',
      message: available
        ? `Eternal ${state.latestVersion} is available`
        : state.status === 'error'
          ? 'Unable to check for updates. Try again later.'
          : state.status === 'downloading'
            ? 'Downloading update…'
            : 'Eternal is up to date',
      detail: state.minimumCheckFailed
        ? 'The minimum version policy could not be refreshed. The last known policy is retained.'
        : `Installed version: ${state.currentVersion}`,
      buttons: available ? [action, 'Later'] : ['Close'],
      cancelId: available ? 1 : 0,
      defaultId: available ? 1 : 0,
      noLink: true,
    });
    if (!available || result.response !== 0) return;
    if (state.mode === 'manual') await updater.openDownload();
    else if (ready) updater.install();
    else {
      const downloaded = await updater.download();
      if (downloaded.status === 'error') reportError();
      else await checkUpdates();
    }
  };
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [{ label: 'Open Eternal', click: show }, { role: 'close' }, { role: 'quit' }],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(devToolsEnabled()
          ? [{ role: 'reload' as const }, { role: 'toggleDevTools' as const }]
          : []),
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        {
          label: 'Check for updates…',
          click: () => {
            void checkUpdates().catch(reportError);
          },
        },
        {
          label: 'Update channel',
          enabled: !getPolicies().UpdateChannel && !getPolicies().DisableAutoUpdate,
          submenu: (['stable', 'beta'] as const).map((channel) => ({
            label: channel === 'stable' ? 'Stable' : 'Beta',
            type: 'radio' as const,
            checked: updater.getState().channel === channel,
            click: () => {
              void updater
                .setChannel(channel)
                .then(() => configureMenu(show, updater))
                .catch(() => {
                  configureMenu(show, updater);
                  reportError();
                });
            },
          })),
        },
        {
          label: 'Export logs…',
          click: () => {
            void exportLogs().catch(() =>
              dialog.showMessageBox({
                type: 'error',
                title: 'Eternal diagnostics',
                message: 'Unable to export logs. Choose a writable location and try again.',
              }),
            );
          },
        },
        {
          label: 'Third-party licenses and sources…',
          click: () => {
            void openLicenseMaterials();
          },
        },
        {
          label: 'About Eternal',
          click: () => {
            void dialog.showMessageBox({
              type: 'info',
              title: 'Eternal',
              message: `Eternal ${app.getVersion()}`,
              detail:
                'Close the window to keep Eternal running in the system tray. Use Quit Eternal to exit.\n\nIncludes libuiohook (LGPL-3.0-or-later). Copyright (C) 2006-2023 Alexander Barker. License copies and sources: Help → Third-party licenses and sources.',
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

export function configureContextMenu(contents: WebContents, origin: string): void {
  contents.on('context-menu', (_event, params) => {
    if (!isTrustedUrl(contents.mainFrame.url, origin)) return;
    const items: MenuItemConstructorOptions[] = [];
    if (params.isEditable && params.misspelledWord) {
      for (const suggestion of params.dictionarySuggestions.slice(0, 6)) {
        items.push({
          label: suggestion.replace(/&/g, '&&'),
          click: () => {
            if (!contents.isDestroyed() && isTrustedUrl(contents.mainFrame.url, origin))
              contents.replaceMisspelling(suggestion);
          },
        });
      }
      items.push(
        {
          label: 'Add to dictionary',
          click: () => {
            if (!contents.isDestroyed() && isTrustedUrl(contents.mainFrame.url, origin))
              contents.session.addWordToSpellCheckerDictionary(params.misspelledWord);
          },
        },
        { type: 'separator' },
      );
    }
    if (params.isEditable)
      items.push(
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      );
    else if (params.selectionText) items.push({ role: 'copy' }, { role: 'selectAll' });
    if (items.length) Menu.buildFromTemplate(items).popup();
  });
}
