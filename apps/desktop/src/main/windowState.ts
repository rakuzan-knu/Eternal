import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app, screen, type BrowserWindow, type Rectangle } from 'electron';
import { z } from 'zod';

const boundsSchema = z.object({
  x: z.number().int().min(-100000).max(100000),
  y: z.number().int().min(-100000).max(100000),
  width: z.number().int().min(320).max(16000),
  height: z.number().int().min(240).max(16000),
  maximized: z.boolean(),
});

export function fitWindowBounds(bounds: Rectangle, areas: Rectangle[]): Rectangle | undefined {
  const area = areas.find(
    (area) =>
      bounds.x < area.x + area.width &&
      bounds.x + bounds.width > area.x &&
      bounds.y < area.y + area.height &&
      bounds.y + bounds.height > area.y,
  );
  if (!area) return undefined;
  const width = Math.min(bounds.width, area.width);
  const height = Math.min(bounds.height, area.height);
  return {
    x: Math.max(area.x, Math.min(bounds.x, area.x + area.width - width)),
    y: Math.max(area.y, Math.min(bounds.y, area.y + area.height - height)),
    width,
    height,
  };
}

export function readWindowState() {
  try {
    const state = boundsSchema.parse(
      JSON.parse(readFileSync(join(app.getPath('userData'), 'window-state.json'), 'utf8')),
    );
    const bounds = fitWindowBounds(
      state,
      screen.getAllDisplays().map((display) => display.workArea),
    );
    return bounds ? { ...bounds, maximized: state.maximized } : undefined;
  } catch {
    return undefined;
  }
}

export function trackWindowState(window: BrowserWindow): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    clearTimeout(timer);
    if (window.isDestroyed() || window.isMinimized() || window.isFullScreen()) return;
    try {
      const state = { ...window.getNormalBounds(), maximized: window.isMaximized() };
      writeFileSync(join(app.getPath('userData'), 'window-state.json'), JSON.stringify(state), {
        mode: 0o600,
      });
    } catch {
      console.warn('Unable to save desktop window state');
    }
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(save, 300);
  };
  window.on('move', schedule);
  window.on('resize', schedule);
  window.on('maximize', schedule);
  window.on('unmaximize', schedule);
  window.on('close', save);
  window.on('closed', () => clearTimeout(timer));
}
