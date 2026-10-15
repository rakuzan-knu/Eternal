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
  private styleObserver: MutationObserver | null = null;

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
   * so that Tailwind CSS, custom stylesheets, and fonts render identically.
   */
  public copyStylesToPiP(targetWindow: Window): void {
    if (typeof document === 'undefined') return;

    try {
      const targetDoc = targetWindow.document;

      // 1. Copy document title
      targetDoc.title = document.title ? `${document.title} - Popout` : 'Voice Call - Popout';

      // 2. Clone all <link rel="stylesheet"> elements from parent head
      document.querySelectorAll('link[rel="stylesheet"]').forEach((linkEl) => {
        try {
          targetDoc.head.appendChild(linkEl.cloneNode(true));
        } catch {}
      });

      // 3. Clone all <style> elements (includes Tailwind & Vite injected CSS)
      document.querySelectorAll('style').forEach((styleEl) => {
        try {
          targetDoc.head.appendChild(styleEl.cloneNode(true));
        } catch {}
      });

      // 4. Fallback for CSSStyleSheet rules
      try {
        Array.from(document.styleSheets).forEach((sheet) => {
          try {
            if (sheet.cssRules && sheet.cssRules.length > 0 && !sheet.href) {
              const style = targetDoc.createElement('style');
              Array.from(sheet.cssRules).forEach((rule) => {
                style.appendChild(targetDoc.createTextNode(rule.cssText));
              });
              targetDoc.head.appendChild(style);
            }
          } catch {
            // Ignore CORS-protected stylesheets
          }
        });
      } catch {}

      // 5. Watch parent head for newly injected styles (e.g. Vite HMR) and sync to PiP
      if (!this.styleObserver && typeof MutationObserver !== 'undefined') {
        this.styleObserver = new MutationObserver((mutations) => {
          if (!this.pipWindow || this.pipWindow.closed) {
            this.styleObserver?.disconnect();
            this.styleObserver = null;
            return;
          }
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (
                node.nodeType === Node.ELEMENT_NODE &&
                ((node as HTMLElement).tagName === 'STYLE' ||
                  ((node as HTMLElement).tagName === 'LINK' &&
                    (node as HTMLLinkElement).rel === 'stylesheet'))
              ) {
                try {
                  this.pipWindow?.document.head.appendChild(node.cloneNode(true));
                } catch {}
              }
            });
          });
        });
        this.styleObserver.observe(document.head, { childList: true });
      }

      // 6. Set critical viewport and flex layout styles on html and body
      const html = targetDoc.documentElement;
      const body = targetDoc.body;

      if (html) {
        html.style.width = '100%';
        html.style.height = '100%';
        html.style.margin = '0';
        html.style.padding = '0';
        html.style.overflow = 'hidden';
        html.style.backgroundColor = '#111214';
        html.style.colorScheme = 'dark';
      }

      if (body) {
        body.style.width = '100%';
        body.style.height = '100%';
        body.style.margin = '0';
        body.style.padding = '0';
        body.style.overflow = 'hidden';
        body.style.backgroundColor = '#111214';
        body.style.color = '#f4f4f5';
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        if (typeof document !== 'undefined' && document.body) {
          body.style.fontFamily = getComputedStyle(document.body).fontFamily || 'Inter, sans-serif';
        }
      }
    } catch (err) {
      console.warn('[DocumentPiPManager] Failed to copy stylesheets:', err);
    }
  }

  /**
   * Requests a new floating document PiP window and synchronizes styles
   */
  public async open(options: DocumentPiPManagerOptions = {}): Promise<Window | null> {
    const width = options.width || 960;
    const height = options.height || 600;

    if (this.pipWindow && !this.pipWindow.closed) {
      this.pipWindow.focus();
      return this.pipWindow;
    }

    try {
      let pipWin: Window | null = null;

      // 1. Try native Document Picture-in-Picture API
      if (this.isSupported()) {
        try {
          pipWin = await window.documentPictureInPicture!.requestWindow({
            width,
            height,
          });
        } catch (err) {
          console.warn(
            '[DocumentPiPManager] requestWindow failed, falling back to window.open:',
            err,
          );
        }
      }

      // 2. Fallback to standard window.open popout
      if (!pipWin) {
        const left = Math.max(0, Math.round((window.screen.width - width) / 2));
        const top = Math.max(0, Math.round((window.screen.height - height) / 2));
        pipWin = window.open(
          '',
          'VoicePopoutWindow',
          `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`,
        );
      }

      if (!pipWin) {
        return null;
      }

      this.pipWindow = pipWin;
      this.copyStylesToPiP(pipWin);

      const handleClose = () => {
        if (this.styleObserver) {
          this.styleObserver.disconnect();
          this.styleObserver = null;
        }
        this.pipWindow = null;
        this.notifyClosed();
      };

      pipWin.addEventListener('pagehide', handleClose);
      pipWin.addEventListener('beforeunload', handleClose);

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
    if (this.styleObserver) {
      this.styleObserver.disconnect();
      this.styleObserver = null;
    }
    if (this.pipWindow && !this.pipWindow.closed) {
      this.pipWindow.close();
    }
    this.pipWindow = null;
    this.notifyClosed();
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
