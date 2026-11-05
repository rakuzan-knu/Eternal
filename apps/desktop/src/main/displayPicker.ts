import { resolve } from 'node:path';
import { app, BrowserWindow, desktopCapturer, ipcMain, type DesktopCapturerSource } from 'electron';
import { noArgumentsSchema } from '../shared/ipcContract';
import { pickerChannels, pickerChoiceSchema } from '../shared/displayPicker';
import { devToolsEnabled } from './policies';

const html = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Eternal</title><style>
:root { color-scheme: light dark; --app-bg-color: Canvas; --app-text-primary: CanvasText; --app-accent-color: Highlight; }
* { box-sizing: border-box; } body { margin: 0; background: var(--app-bg-color); color: var(--app-text-primary); font-family: system-ui, sans-serif; font-size: 14px; }
main { height: 100vh; display: flex; flex-direction: column; padding: 24px; gap: 16px; }
h1 { margin: 0; font-size: 22px; } p { margin: 0; line-height: 1.5; }
#sources { overflow: auto; flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(auto-fit,minmax(min(220px,100%),1fr)); gap: 12px; align-content: start; scrollbar-gutter: stable; scrollbar-color: var(--app-accent-color) var(--app-bg-color); scrollbar-width: thin; }
button { font: inherit; color: inherit; cursor: pointer; border: 1px solid color-mix(in srgb, currentColor 30%, transparent); border-radius: 12px; padding: 10px 16px; background: transparent; }
button:hover { background: color-mix(in srgb, currentColor 8%, transparent); }
button:focus-visible, input:focus-visible { outline: 3px solid var(--app-accent-color); outline-offset: 3px; }
button:disabled { opacity: .5; cursor: default; } .source { padding: 8px; text-align: left; min-width: 0; }
.source[aria-pressed=true] { border: 2px solid var(--app-accent-color); padding: 7px; }
.preview { display: flex; align-items: center; justify-content: center; aspect-ratio: 16/9; background: color-mix(in srgb, currentColor 8%, transparent); border-radius: 8px; width: 100%; object-fit: contain; }
.name { display: block; margin-top: 8px; overflow-wrap: anywhere; } #audio-hint { font-size: 12px; margin-top: 8px; }
footer { display: flex; gap: 12px; justify-content: flex-end; } #share { background: var(--app-accent-color); color: var(--app-accent-text, HighlightText); }
[hidden] { display: none !important; } label { display: flex; gap: 8px; align-items: center; } input { accent-color: var(--app-accent-color); }
</style></head><body><main aria-labelledby="title"><h1 id="title"></h1><p id="intro"></p>
<p id="status" role="status" aria-live="polite"></p><button id="retry" hidden></button>
<section id="sources" aria-labelledby="intro" aria-busy="true"></section>
<div><label><input id="audio" type="checkbox" aria-describedby="audio-hint"><span id="audio-label"></span></label><p id="audio-hint"></p></div>
<footer><button id="cancel"></button><button id="share" disabled></button></footer></main></body></html>`;

export interface DisplaySelection {
  source: DesktopCapturerSource;
  audio: boolean;
}

export function pickDisplaySource(
  parent: BrowserWindow,
  audioRequested: boolean,
): Promise<DisplaySelection | null> {
  const picker = new BrowserWindow({
    parent,
    modal: true,
    width: 760,
    height: 620,
    minWidth: 360,
    minHeight: 420,
    show: false,
    autoHideMenuBar: true,
    title: 'Eternal',
    webPreferences: {
      preload: resolve(__dirname, '../preload/index.cjs'),
      additionalArguments: ['--eternal-display-picker'],
      partition: 'eternal-display-picker',
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: false,
      devTools: devToolsEnabled(),
    },
  });
  picker.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );
  picker.webContents.session.setPermissionCheckHandler(() => false);
  picker.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  picker.webContents.on('will-navigate', (event) => event.preventDefault());
  picker.webContents.on('will-attach-webview', (event) => event.preventDefault());
  let sources: DesktopCapturerSource[] = [];
  let loading = false;
  return new Promise((resolveSelection) => {
    let settled = false;
    const finish = (selection: DisplaySelection | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      ipcMain.removeHandler(pickerChannels.load);
      ipcMain.removeHandler(pickerChannels.choose);
      parent.webContents.removeListener('did-start-navigation', navigated);
      parent.webContents.removeListener('render-process-gone', cancel);
      parent.removeListener('closed', cancel);
      resolveSelection(selection);
      if (!picker.isDestroyed()) picker.close();
      if (!parent.isDestroyed()) parent.focus();
    };
    const cancel = () => finish(null);
    const navigated = (
      _event: Electron.Event,
      _url: string,
      inPlace: boolean,
      mainFrame: boolean,
    ) => {
      if (mainFrame && !inPlace) cancel();
    };
    const timeout = setTimeout(cancel, 120000);
    const authorize = (event: Electron.IpcMainInvokeEvent) => {
      if (
        settled ||
        picker.isDestroyed() ||
        event.sender !== picker.webContents ||
        event.senderFrame !== picker.webContents.mainFrame
      )
        throw new Error('Unauthorized picker sender');
    };
    ipcMain.handle(pickerChannels.load, async (event, ...args: unknown[]) => {
      authorize(event);
      noArgumentsSchema.parse(args);
      if (loading) throw new Error('Picker already loading');
      loading = true;
      try {
        sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { width: 320, height: 180 },
        });
        authorize(event);
        sources = sources.filter((source) => source.id !== picker.getMediaSourceId());
        const theme: Record<string, string> = {};
        let locale = app.getLocale();
        try {
          const appearance: unknown = await parent.webContents.executeJavaScript(
            `({locale: document.documentElement.lang, theme: Object.fromEntries(['--app-bg-color','--app-text-primary','--app-accent-color'].map(key => [key, getComputedStyle(document.documentElement).getPropertyValue(key)]))})`,
          );
          if (
            appearance &&
            typeof appearance === 'object' &&
            'theme' in appearance &&
            'locale' in appearance
          ) {
            if (typeof appearance.locale === 'string' && appearance.locale)
              locale = appearance.locale.slice(0, 32);
            if (appearance.theme && typeof appearance.theme === 'object') {
              for (const [key, value] of Object.entries(appearance.theme)) {
                if (typeof value === 'string' && value.length <= 256) theme[key] = value;
              }
            }
          }
        } catch {
          locale = app.getLocale();
        }
        return {
          sources: sources.map((source) => ({
            id: source.id,
            name: source.name,
            thumbnail: source.thumbnail.isEmpty() ? '' : source.thumbnail.toDataURL(),
          })),
          audioAvailable: audioRequested && process.platform === 'win32',
          locale,
          theme,
        };
      } finally {
        loading = false;
      }
    });
    ipcMain.handle(pickerChannels.choose, (event, ...args: unknown[]) => {
      authorize(event);
      const [choice] = pickerChoiceSchema.parse(args);
      if (!choice) return finish(null);
      const source = sources.find((source) => source.id === choice.id);
      if (!source || loading) throw new Error('Unknown display source');
      finish({ source, audio: choice.audio && audioRequested && process.platform === 'win32' });
    });
    picker.once('closed', cancel);
    picker.webContents.once('render-process-gone', cancel);
    parent.on('closed', cancel);
    parent.webContents.on('did-start-navigation', navigated);
    parent.webContents.on('render-process-gone', cancel);
    picker.once('ready-to-show', () => {
      if (!picker.isDestroyed()) picker.show();
    });
    void picker.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch(cancel);
  });
}
