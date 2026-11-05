import { app, session } from 'electron';
import { SESSION_PARTITION } from './constants';
import { configurePermissions } from './permissions';
import { telemetryRequestBlocked } from './telemetry';

export async function createAppSession(origin: string) {
  const appSession = session.fromPartition(SESSION_PARTITION);
  configurePermissions(appSession, origin);
  if (process.platform !== 'darwin') {
    const available = appSession.availableSpellCheckerLanguages;
    const preferred = app.getPreferredSystemLanguages().flatMap((language) => {
      const match =
        available.find((candidate) => candidate === language) ??
        available.find((candidate) => candidate.split('-')[0] === language.split('-')[0]);
      return match ? [match] : [];
    });
    if (preferred.length) appSession.setSpellCheckerLanguages([...new Set(preferred)]);
  }
  await appSession.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });
  appSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*'] },
    (details, callback) =>
      callback({
        cancel: details.url.startsWith(`${origin}/sw.js`) || telemetryRequestBlocked(details.url),
      }),
  );
  return appSession;
}
