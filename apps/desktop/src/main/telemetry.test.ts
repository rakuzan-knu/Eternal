import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  disabled: false,
  packaged: true,
  init: vi.fn(),
  start: vi.fn(),
  diagnostic: vi.fn(),
}));
vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return mocks.packaged;
    },
    getVersion: () => '1.0.0',
  },
  crashReporter: { start: mocks.start },
}));
vi.mock('@sentry/electron/main', () => ({
  init: mocks.init,
  IPCMode: { Protocol: 2 },
  onUncaughtExceptionIntegration: () => ({}),
  onUnhandledRejectionIntegration: () => ({}),
  makeElectronTransport: vi.fn(),
  captureMessage: vi.fn(),
}));
vi.mock('./policies', () => ({ getPolicies: () => ({ DisableTelemetry: mocks.disabled }) }));
vi.mock('./logging', () => ({ diagnostic: mocks.diagnostic }));
import { initializeTelemetry, sanitizeEvent, telemetryRequestBlocked } from './telemetry';

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mocks.disabled = false;
  mocks.packaged = true;
});

describe('desktop telemetry', () => {
  it('does not initialize either reporter under policy or in development', () => {
    vi.stubEnv('ETERNAL_DESKTOP_SENTRY_DSN', 'https://key@sentry.io/1');
    mocks.disabled = true;
    initializeTelemetry();
    mocks.disabled = false;
    mocks.packaged = false;
    initializeTelemetry();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.init).not.toHaveBeenCalled();
  });
  it('keeps native dumps local and enables main-only Sentry without IPC listeners or persistent queue', () => {
    vi.stubEnv('ETERNAL_DESKTOP_SENTRY_DSN', 'https://key@sentry.io/1');
    initializeTelemetry();
    expect(mocks.start).toHaveBeenCalledWith({ uploadToServer: false, compress: true });
    const options = mocks.init.mock.calls[0]?.[0];
    expect(options).toMatchObject({
      defaultIntegrations: false,
      tracesSampleRate: 0,
      maxBreadcrumbs: 0,
      ipcMode: 2,
      dataCollection: { userInfo: false },
    });
    expect(options.getSessions()).toEqual([]);
  });
  it('exports only safe event fields and app stack coordinates', () => {
    const safe = sanitizeEvent({
      type: undefined,
      message: 'token=secret',
      user: { email: 'private@example.org' },
      request: { url: 'https://host/invite/secret' },
      extra: { password: 'secret' },
      breadcrumbs: [{ message: 'private message' }],
      exception: {
        values: [
          {
            value: 'secret',
            stacktrace: {
              frames: [
                {
                  filename: 'C:\\Users\\Private\\app.asar\\out\\main\\index.cjs',
                  lineno: 3,
                  vars: { key: 'secret' },
                },
                { filename: 'https://host/invite/secret', function: 'secret' },
              ],
            },
          },
        ],
      },
    });
    expect(JSON.stringify(safe)).not.toMatch(
      /secret|Private|email|password|invite|private message/,
    );
    expect(safe.exception?.values?.[0]?.stacktrace?.frames?.[0]).toEqual({
      filename: 'index.cjs',
      lineno: 3,
      colno: undefined,
      in_app: undefined,
    });
  });
  it('blocks hosted Sentry and call telemetry under policy, keeps application traffic', () => {
    const urls = [
      'https://o1.ingest.us.sentry.io/api/1/envelope/',
      'https://errors.company.test/api/42/envelope/',
      'https://api.test/v1/calls/telemetry',
    ];
    expect(urls.some(telemetryRequestBlocked)).toBe(false);
    mocks.disabled = true;
    expect(urls.every(telemetryRequestBlocked)).toBe(true);
    expect(telemetryRequestBlocked('https://eternalnet.vercel.app/v1/messages')).toBe(false);
  });
});
