import { afterEach, describe, expect, it, vi } from 'vitest';
import { createYouTubeOAuth, parseYouTubeDeepLink } from './youtubeOAuth';
import {
  youtubeConnectArgumentsSchema,
  youtubeCancelArgumentsSchema,
} from '../shared/youtubeOAuth';

const origin = 'https://eternalnet.vercel.app';
const serviceOrigin = 'https://music.example';
const transaction = 'a'.repeat(64);
const code = 'b'.repeat(64);
function launch(service = serviceOrigin, frontend = origin) {
  return `${service}/v1/integrations/youtube/desktop/launch#${new URLSearchParams({ ticket: 'c'.repeat(64), proof: 'd'.repeat(64), origin: frontend })}`;
}
const link = (id = transaction) => `eternal://oauth/youtube?transaction=${id}&code=${code}`;

afterEach(() => vi.useRealTimers());

describe('YouTube system browser boundary', () => {
  it('opens only the validated launch and accepts only the current transaction once', async () => {
    const open = vi.fn<(url: string) => Promise<void>>(async () => {});
    const oauth = createYouTubeOAuth(origin, serviceOrigin, open);
    const pending = oauth.connect(launch(), transaction);
    expect(open).toHaveBeenCalledWith(launch());
    expect(oauth.receive(link('e'.repeat(64)))).toBe(false);
    expect(oauth.receive(link())).toBe(true);
    expect(await pending).toBe(code);
    expect(oauth.receive(link())).toBe(false);
  });

  it.each([
    'https://evil.example/v1/integrations/youtube/desktop/launch',
    'https://music.example.evil.example/v1/integrations/youtube/desktop/launch',
    'https://user:secret@music.example/v1/integrations/youtube/desktop/launch',
    'https://accounts.google.com/o/oauth2/v2/auth',
    'https://music.example/v1/integrations/oauth/launch',
    'https://music.example/v1/integrations/youtube/desktop/launch?redirect=evil',
  ])('rejects an invalid launch %s before opening a browser', async (url) => {
    const open = vi.fn(async () => {});
    const oauth = createYouTubeOAuth(origin, serviceOrigin, open);
    await expect(oauth.connect(`${url}#${launch().split('#')[1]}`, transaction)).rejects.toThrow();
    expect(open).not.toHaveBeenCalled();
  });

  it('rejects missing/duplicate/foreign launch proofs and malformed IPC tuples', async () => {
    const open = vi.fn(async () => {});
    const oauth = createYouTubeOAuth(origin, serviceOrigin, open);
    for (const url of [
      launch().split('#')[0],
      launch(serviceOrigin, 'https://evil.example'),
      `${launch()}&proof=${'f'.repeat(64)}`,
    ]) {
      await expect(oauth.connect(url, transaction)).rejects.toThrow();
    }
    expect(open).not.toHaveBeenCalled();
    expect(youtubeConnectArgumentsSchema.safeParse([launch(), transaction, 'extra']).success).toBe(
      false,
    );
    expect(youtubeCancelArgumentsSchema.safeParse(['wrong']).success).toBe(false);
  });

  it.each([
    `https://oauth/youtube?transaction=${transaction}&code=${code}`,
    `eternal://user:secret@oauth/youtube?transaction=${transaction}&code=${code}`,
    `eternal://oauth:42/youtube?transaction=${transaction}&code=${code}`,
    `eternal://oauth/youtube?transaction=${transaction}&code=${code}&code=${code}`,
    `eternal://oauth/youtube?transaction=${transaction}&code=${code}&redirect=/feed`,
    `eternal://oauth/youtube?transaction=${transaction}&code=${code}#extra`,
    `eternal://oauth/youtube?transaction=${transaction}&code=google-code`,
    `eternal://oauth/youtube?transaction=${transaction}&code=${code}\n`,
  ])('rejects an unsafe or malformed deep link %s', (url) => {
    expect(parseYouTubeDeepLink(url)).toBeNull();
  });

  it('supports a validated localhost browser launch in development', async () => {
    const open = vi.fn(async () => {});
    const oauth = createYouTubeOAuth('http://localhost:5173', 'http://localhost:3000', open);
    const pending = oauth.connect(
      launch('http://localhost:3000', 'http://localhost:5173'),
      transaction,
    );
    oauth.receive(link());
    expect(await pending).toBe(code);
    expect(open).toHaveBeenCalledOnce();
  });

  it('bounds waiting, replaces old attempts, and cancels only the requested transaction', async () => {
    vi.useFakeTimers();
    const oauth = createYouTubeOAuth(origin, serviceOrigin, async () => {});
    const first = oauth.connect(launch(), transaction);
    const next = 'e'.repeat(64);
    const second = oauth.connect(launch(), next);
    expect(await first).toBeNull();
    oauth.cancel(transaction);
    expect(oauth.receive(link(next))).toBe(true);
    expect(await second).toBe(code);
    const timeout = oauth.connect(launch(), transaction);
    await vi.advanceTimersByTimeAsync(600000);
    expect(await timeout).toBeNull();
    const cancelled = oauth.connect(launch(), transaction);
    oauth.cancel();
    expect(await cancelled).toBeNull();
    expect(oauth.receive(link())).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports browser launch failure and removes pending completion', async () => {
    const oauth = createYouTubeOAuth(origin, serviceOrigin, async () => {
      throw new Error('OS failure');
    });
    await expect(oauth.connect(launch(), transaction)).rejects.toThrow(
      'Could not open the system browser',
    );
    expect(oauth.receive(link())).toBe(false);
  });
});
