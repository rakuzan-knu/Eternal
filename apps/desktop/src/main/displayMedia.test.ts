import type {
  DisplayMediaRequestHandlerHandlerRequest,
  Session,
  Streams,
  WebContents,
} from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ pick: vi.fn(), parent: {}, fromContents: vi.fn() }));
vi.mock('electron', () => ({ BrowserWindow: { fromWebContents: mocks.fromContents }, shell: {} }));
vi.mock('./displayPicker', () => ({ pickDisplaySource: mocks.pick }));
import { configureDisplayMedia } from './displayMedia';

const origin = 'https://eternalnet.vercel.app';
let handle: (
  request: DisplayMediaRequestHandlerHandlerRequest,
  callback: (streams: Streams | null) => void,
) => void;
const frame = { url: origin, isDestroyed: () => false };
const contents = { mainFrame: frame, isDestroyed: () => false };
function request(
  overrides: Partial<DisplayMediaRequestHandlerHandlerRequest> = {},
): DisplayMediaRequestHandlerHandlerRequest {
  return {
    frame: frame as Electron.WebFrameMain,
    securityOrigin: origin,
    videoRequested: true,
    audioRequested: true,
    userGesture: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  frame.url = origin;
  mocks.fromContents.mockReturnValue(mocks.parent);
  const session = {
    setDisplayMediaRequestHandler: (handler: typeof handle) => {
      handle = handler;
    },
  };
  configureDisplayMedia(session as Session, () => contents as WebContents, origin);
});

describe('display capture consent', () => {
  it.each([
    { securityOrigin: 'https://evil.test' },
    { frame: null },
    { frame: { ...frame } as Electron.WebFrameMain },
    { userGesture: false },
    { videoRequested: false },
  ])('rejects an unauthorized or unprompted request: %o', (overrides) => {
    const callback = vi.fn();
    handle(request(overrides), callback);
    expect(callback).toHaveBeenCalledExactlyOnceWith(null);
    expect(mocks.pick).not.toHaveBeenCalled();
  });

  it('grants only the selected source and explicitly selected audio', async () => {
    const source = { id: 'screen:2', name: 'Screen 2' };
    mocks.pick.mockResolvedValue({ source, audio: true });
    const callback = vi.fn();
    handle(request(), callback);
    await vi.waitFor(() =>
      expect(callback).toHaveBeenCalledExactlyOnceWith({ video: source, audio: 'loopback' }),
    );
  });

  it('does not include system audio without consent', async () => {
    const source = { id: 'window:3', name: 'Editor' };
    mocks.pick.mockResolvedValue({ source, audio: false });
    const callback = vi.fn();
    handle(request(), callback);
    await vi.waitFor(() => expect(callback).toHaveBeenCalledExactlyOnceWith({ video: source }));
  });

  it('rejects concurrent prompts and rechecks origin after asynchronous selection', async () => {
    let select!: (value: unknown) => void;
    mocks.pick.mockReturnValue(
      new Promise((resolve) => {
        select = resolve;
      }),
    );
    const first = vi.fn();
    const second = vi.fn();
    handle(request(), first);
    handle(request(), second);
    expect(second).toHaveBeenCalledExactlyOnceWith(null);
    frame.url = 'https://evil.test';
    select({ source: { id: 'screen:1', name: 'Screen' }, audio: false });
    await vi.waitFor(() => expect(first).toHaveBeenCalledExactlyOnceWith(null));
  });

  it.each(['cancel', 'failure'])('denies capture after %s', async (action) => {
    if (action === 'cancel') mocks.pick.mockResolvedValue(null);
    else mocks.pick.mockRejectedValue(new Error('Unavailable'));
    const callback = vi.fn();
    handle(request(), callback);
    await vi.waitFor(() => expect(callback).toHaveBeenCalledExactlyOnceWith(null));
  });
});
