import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNativeOptions } from '@sentry/react-native';

const { storage, init, getDsn, platform } = vi.hoisted(() => ({
  storage: {
    getItem: vi.fn<() => Promise<string | null>>(),
    setItem: vi.fn<() => Promise<void>>(),
    removeItem: vi.fn<() => Promise<void>>(),
  },
  init: vi.fn<(options: ReactNativeOptions) => void>(),
  getDsn: vi.fn<() => object | undefined>(),
  platform: { OS: 'android' },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '1.0.0' } } }));
vi.mock('react-native', () => ({ Platform: platform }));
vi.mock('@sentry/react-native', () => ({ init, getClient: () => ({ getDsn }) }));

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('__DEV__', false);
  vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', 'https://fixture@localhost/1');
  storage.getItem.mockResolvedValue(null);
  storage.setItem.mockResolvedValue(undefined);
  storage.removeItem.mockResolvedValue(undefined);
  getDsn.mockReturnValue({});
  platform.OS = 'android';
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('optional diagnostics', () => {
  it('stays off during startup with no saved consent', async () => {
    const { useDiagnostics, loadDiagnosticsPreference } = await import('./diagnostics');
    expect(useDiagnostics.getState()).toMatchObject({ busy: true, enabled: false });
    await loadDiagnosticsPreference();
    expect(useDiagnostics.getState()).toMatchObject({ busy: false, enabled: false });
    expect(init).not.toHaveBeenCalled();
  });

  it('allows scrubbed JavaScript errors after opt-in and blocks them on revocation', async () => {
    const { loadDiagnosticsPreference, setDiagnosticsPreference, useDiagnostics } =
      await import('./diagnostics');
    await loadDiagnosticsPreference();
    await setDiagnosticsPreference(true);
    const options = init.mock.calls[0]?.[0];
    expect(options).toMatchObject({
      enableNative: false,
      patchGlobalPromise: false,
      maxBreadcrumbs: 0,
      sendDefaultPii: false,
      sendClientReports: false,
      autoSessionTracking: false,
      tracesSampleRate: 0,
    });
    expect(useDiagnostics.getState().enabled).toBe(true);
    const event = {
      type: undefined,
      request: { data: { password: 'fixture-password' } },
      user: { email: 'fixture@example.com' },
      exception: {
        values: [
          {
            value: 'fixture-private-message',
            stacktrace: { frames: [{ filename: '/secret/path', lineno: 42 }] },
          },
        ],
      },
    };
    const hint = { attachments: [{ filename: 'private.log', data: 'private data' }] };
    const scrubbed = await options?.beforeSend?.(event, hint);
    expect(scrubbed).toMatchObject({
      tags: { runtime: 'android' },
      exception: { values: [{ stacktrace: { frames: [{ lineno: 42 }] } }] },
    });
    expect(JSON.stringify(scrubbed)).not.toMatch(/fixture|secret/);
    expect(hint.attachments).toEqual([]);

    const saving = setDiagnosticsPreference(false);
    expect(useDiagnostics.getState().enabled).toBe(false);
    expect(await options?.beforeSend?.(event, {})).toBeNull();
    await saving;
    expect(storage.removeItem).toHaveBeenCalledOnce();
  });

  it('keeps a failed revocation off in memory and can retry persistence', async () => {
    storage.getItem.mockResolvedValue('on');
    storage.removeItem.mockRejectedValueOnce(new Error('write failed'));
    const {
      loadDiagnosticsPreference,
      retryDiagnosticsPreference,
      setDiagnosticsPreference,
      useDiagnostics,
    } = await import('./diagnostics');
    await loadDiagnosticsPreference();
    expect(useDiagnostics.getState().enabled).toBe(true);
    await setDiagnosticsPreference(false);
    expect(useDiagnostics.getState()).toMatchObject({ enabled: false, failed: true, busy: false });
    await retryDiagnosticsPreference();
    expect(useDiagnostics.getState()).toMatchObject({ enabled: false, failed: false });
  });

  it('keeps diagnostics off when storage fails to load and retries the read', async () => {
    storage.getItem.mockRejectedValueOnce(new Error('read failed'));
    const { loadDiagnosticsPreference, retryDiagnosticsPreference, useDiagnostics } =
      await import('./diagnostics');
    await loadDiagnosticsPreference();
    expect(useDiagnostics.getState()).toMatchObject({ enabled: false, failed: true, busy: false });
    await retryDiagnosticsPreference();
    expect(storage.getItem).toHaveBeenCalledTimes(2);
    expect(init).not.toHaveBeenCalled();
  });

  it('never initializes without a configured destination', async () => {
    vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', '');
    storage.getItem.mockResolvedValue('on');
    const { diagnosticsAvailable, loadDiagnosticsPreference, setDiagnosticsPreference } =
      await import('./diagnostics');
    await loadDiagnosticsPreference();
    await setDiagnosticsPreference(true);
    expect(diagnosticsAvailable).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it('does not store consent or show success if the SDK rejects the destination', async () => {
    getDsn.mockReturnValue(undefined);
    const { loadDiagnosticsPreference, setDiagnosticsPreference, useDiagnostics } =
      await import('./diagnostics');
    await loadDiagnosticsPreference();
    await setDiagnosticsPreference(true);
    expect(useDiagnostics.getState()).toMatchObject({ enabled: false, failed: true, busy: false });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('blocks a web report after another tab removes consent', async () => {
    platform.OS = 'web';
    storage.getItem.mockResolvedValue('on');
    const { loadDiagnosticsPreference, useDiagnostics } = await import('./diagnostics');
    await loadDiagnosticsPreference();
    const options = init.mock.calls[0]?.[0];
    expect(await options?.beforeSend?.({ type: undefined }, {})).not.toBeNull();
    storage.getItem.mockResolvedValue(null);
    expect(await options?.beforeSend?.({ type: undefined }, {})).toBeNull();
    expect(useDiagnostics.getState().enabled).toBe(false);
  });
});
