import { systemPreferences, type Session } from 'electron';
import { isTrustedUrl } from './security';

const allowedPermissions = new Set([
  'media',
  'display-capture',
  'notifications',
  'clipboard-sanitized-write',
  'fullscreen',
]);

export function isPermissionAllowed(
  permission: string,
  requestingUrl: string,
  topLevelUrl: string,
  origin: string,
): boolean {
  return (
    allowedPermissions.has(permission) &&
    isTrustedUrl(requestingUrl, origin) &&
    isTrustedUrl(topLevelUrl, origin)
  );
}

export function configurePermissions(
  session: Pick<
    Session,
    'setPermissionRequestHandler' | 'setPermissionCheckHandler' | 'setDevicePermissionHandler'
  >,
  origin: string,
): void {
  session.setPermissionRequestHandler((contents, permission, callback, details) => {
    const allowed =
      contents !== null &&
      details.isMainFrame &&
      isPermissionAllowed(permission, details.requestingUrl, contents.getURL(), origin);
    if (!allowed || permission !== 'media' || process.platform !== 'darwin') {
      callback(allowed);
      return;
    }
    const types = 'mediaTypes' in details ? details.mediaTypes : undefined;
    if (!types?.length) {
      callback(false);
      return;
    }
    void Promise.all(
      types.map((type) =>
        systemPreferences.askForMediaAccess(type === 'audio' ? 'microphone' : 'camera'),
      ),
    )
      .then((grants) =>
        callback(
          grants.every(Boolean) &&
            !contents.isDestroyed() &&
            isTrustedUrl(contents.getURL(), origin),
        ),
      )
      .catch(() => callback(false));
  });
  session.setPermissionCheckHandler(
    (contents, permission, requestingOrigin) =>
      contents !== null &&
      isPermissionAllowed(permission, requestingOrigin, contents.getURL(), origin),
  );
  session.setDevicePermissionHandler(() => false);
}
