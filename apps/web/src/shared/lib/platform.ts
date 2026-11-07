import type { DesktopBridge } from '../../../../desktop/src/shared/ipcContract';

export function getDesktopBridge(): DesktopBridge | undefined {
  return typeof window === 'undefined' ? undefined : window.desktop;
}

export function isDesktop(): boolean {
  return getDesktopBridge() !== undefined;
}
