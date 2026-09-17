/**
 * Document Picture-in-Picture (PiP) Manager
 *
 * Utilizes the Document Picture-in-Picture API (Chrome 111+) to open a floating
 * OS-level window containing an interactive DOM & React application hierarchy,
 * rather than just a passive <video> stream.
 */

export interface DocumentPiPManagerOptions {
  width?: number;
  height?: number;
}

export class DocumentPiPManager {
  private pipWindow: Window | null = null;
  private closeListeners = new Set<() => void>();

  /**
   * Checks whether the current browser environment supports the Document PiP API
   */
  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'documentPictureInPicture' in window &&
      typeof window.documentPictureInPicture?.requestWindow === 'function'
    );
  }

  /**
   * Clones all active document stylesheets and style rules into the PiP window
   * so that Tailwind CSS and custom stylesheets render identically.
   */
  public copyStylesToPiP(targetWindow: Window): void {
    if (typeof document === 'undefined') return;

    try {
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          if (sheet.href) {
            const link = targetWindow.document.createElement('link');
            link.rel = 'stylesheet';
            link.type = sheet.type || 'text/css';
            link.media = sheet.media.mediaText || 'all';
            link.href = sheet.href;
            targetWindow.document.head.appendChild(link);
          } else if (sheet.cssRules) {
            const style = targetWindow.document.createElement('style');
            Array.from(sheet.cssRules).forEach((rule) => {
              style.appendChild(targetWindow.document.createTextNode(rule.cssText));
            });
            targetWindow.document.head.appendChild(style);
          }
        } catch {
          // Cross-origin CSS rules access errors are safely handled
        }
      });
    } catch (err) {
      console.warn('[DocumentPiPManager] Failed to copy some stylesheets:', err);
    }
  }

  /**
   * Requests a new floating document PiP window and synchronizes styles
   */
  public async open(options: DocumentPiPManagerOptions = {}): Promise<Window | null> {
    if (!this.isSupported()) {
      return null;
    }

    if (this.pipWindow && !this.pipWindow.closed) {
      return this.pipWindow;
    }

    try {
      const width = options.width || 440;
      const height = options.height || 360;

      const pipWin = await window.documentPictureInPicture!.requestWindow({
        width,
        height,
      });

      this.pipWindow = pipWin;
      this.copyStylesToPiP(pipWin);

      pipWin.document.body.style.margin = '0';
      pipWin.document.body.style.padding = '0';
      pipWin.document.body.style.backgroundColor = '#09090b'; // zinc-950
      pipWin.document.body.style.overflow = 'hidden';

      pipWin.addEventListener('pagehide', () => {
        this.pipWindow = null;
        this.notifyClosed();
      });

      return pipWin;
    } catch (err) {
      console.error('[DocumentPiPManager] Failed to open document PiP window:', err);
      return null;
    }
  }

  /**
   * Closes the active document PiP window
   */
  public close(): void {
    if (this.pipWindow && !this.pipWindow.closed) {
      this.pipWindow.close();
    }
    this.pipWindow = null;
  }

  public getWindow(): Window | null {
    if (this.pipWindow && this.pipWindow.closed) {
      this.pipWindow = null;
    }
    return this.pipWindow;
  }

  public isOpen(): boolean {
    return this.getWindow() !== null;
  }

  public onClose(callback: () => void): () => void {
    this.closeListeners.add(callback);
    return () => {
      this.closeListeners.delete(callback);
    };
  }

  private notifyClosed(): void {
    this.closeListeners.forEach((cb) => {
      try {
        cb();
      } catch {
        // Listener error ignore
      }
    });
  }
}

export const globalDocumentPiPManager = new DocumentPiPManager();
