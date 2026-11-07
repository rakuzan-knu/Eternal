/// <reference types="vite/client" />

interface Window {
  readonly desktop?: import('../../desktop/src/shared/ipcContract').DesktopBridge;
}
