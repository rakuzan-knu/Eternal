import { BrowserWindow, type Session, type WebContents } from 'electron';
import { pickDisplaySource } from './displayPicker';
import { isTrustedUrl } from './security';

export function configureDisplayMedia(
  session: Session,
  getContents: () => WebContents | undefined,
  origin: string,
): void {
  let pending = false;
  session.setDisplayMediaRequestHandler((request, callback) => {
    const contents = getContents();
    const frame = request.frame;
    const authorized = () =>
      contents !== undefined &&
      !contents.isDestroyed() &&
      frame !== null &&
      !frame.isDestroyed() &&
      frame === contents.mainFrame &&
      isTrustedUrl(frame.url, origin) &&
      isTrustedUrl(request.securityOrigin, origin);
    if (!authorized() || !contents || !request.videoRequested || !request.userGesture || pending) {
      callback(null);
      return;
    }
    const parent = BrowserWindow.fromWebContents(contents);
    if (!parent) {
      callback(null);
      return;
    }
    pending = true;
    void pickDisplaySource(parent, request.audioRequested)
      .then((selection) => {
        callback(
          selection && authorized()
            ? {
                video: selection.source,
                ...(selection.audio ? { audio: 'loopback' as const } : {}),
              }
            : null,
        );
      })
      .catch(() => callback(null))
      .finally(() => {
        pending = false;
      });
  });
}
