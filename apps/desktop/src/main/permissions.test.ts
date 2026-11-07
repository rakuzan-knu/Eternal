import type { Session } from 'electron';
import { afterEach, describe, expect, it, vi } from 'vitest';
const media = vi.hoisted(() => ({ askForMediaAccess: vi.fn() }));
vi.mock('electron', () => ({ systemPreferences: media, shell: {} }));
import { configurePermissions } from './permissions';

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('macOS media permissions', () => {
  it('requests only specified OS devices and denies when either device is refused', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
    let handler: Parameters<Session['setPermissionRequestHandler']>[0];
    const session = {
      setPermissionRequestHandler: (value: typeof handler) => {
        handler = value;
      },
      setPermissionCheckHandler: vi.fn(),
      setDevicePermissionHandler: vi.fn(),
    };
    configurePermissions(session, 'https://eternalnet.vercel.app');
    media.askForMediaAccess.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const callback = vi.fn();
    if (!handler!) throw new Error('Missing permission handler');
    handler(
      {
        getURL: () => 'https://eternalnet.vercel.app',
        isDestroyed: () => false,
      } as Electron.WebContents,
      'media',
      callback,
      {
        isMainFrame: true,
        requestingUrl: 'https://eternalnet.vercel.app',
        mediaTypes: ['audio', 'video'],
      },
    );
    await vi.waitFor(() => expect(callback).toHaveBeenCalledExactlyOnceWith(false));
    expect(media.askForMediaAccess.mock.calls).toEqual([['microphone'], ['camera']]);
  });

  it('does not prompt the OS for an untrusted frame', () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
    let handler: Parameters<Session['setPermissionRequestHandler']>[0];
    const session = {
      setPermissionRequestHandler: (value: typeof handler) => {
        handler = value;
      },
      setPermissionCheckHandler: vi.fn(),
      setDevicePermissionHandler: vi.fn(),
    };
    configurePermissions(session, 'https://eternalnet.vercel.app');
    const callback = vi.fn();
    if (!handler!) throw new Error('Missing permission handler');
    handler(
      { getURL: () => 'https://eternalnet.vercel.app' } as Electron.WebContents,
      'media',
      callback,
      { isMainFrame: false, requestingUrl: 'https://evil.test', mediaTypes: ['audio'] },
    );
    expect(callback).toHaveBeenCalledExactlyOnceWith(false);
    expect(media.askForMediaAccess).not.toHaveBeenCalled();
  });
});
