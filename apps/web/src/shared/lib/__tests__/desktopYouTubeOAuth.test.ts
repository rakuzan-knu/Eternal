import { webcrypto, createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectDesktopYouTube } from '../desktopYouTubeOAuth';

const { start, redeem, connect, cancel, bridge } = vi.hoisted(() => {
  const connect = vi.fn<(url: string, transaction: string) => Promise<string | null>>();
  const cancel = vi.fn<(transaction: string) => Promise<void>>();
  return {
    start:
      vi.fn<
        (challenge: string, signal?: AbortSignal) => Promise<{ url: string; transaction: string }>
      >(),
    redeem:
      vi.fn<
        (
          body: { code: string; transaction: string; verifier: string },
          signal?: AbortSignal,
        ) => Promise<{ success: boolean; data: Record<string, unknown> | null }>
      >(),
    connect,
    cancel,
    bridge: { available: true },
  };
});
vi.mock('@/shared/api/integrationsApi', () => ({
  integrationsApi: { startDesktopYouTube: start, redeemDesktopYouTube: redeem },
}));
vi.mock('../platform', () => ({
  getDesktopBridge: () =>
    bridge.available ? { connectYouTube: connect, cancelYouTube: cancel } : undefined,
}));

describe('desktop YouTube client handoff', () => {
  const transaction = 'a'.repeat(64);
  const code = 'b'.repeat(64);
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', webcrypto);
    bridge.available = true;
    start.mockResolvedValue({ url: 'https://music.example/launch', transaction });
    connect.mockResolvedValue(code);
    cancel.mockResolvedValue();
    redeem.mockResolvedValue({ success: true, data: { channelTitle: 'My YouTube' } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the verifier local until authenticated redemption and creates fresh proof for each attempt', async () => {
    const signal = new AbortController().signal;
    expect(await connectDesktopYouTube(signal)).toEqual({ channelTitle: 'My YouTube' });
    const body = redeem.mock.calls[0][0];
    expect(body).toMatchObject({ code, transaction });
    expect(body.verifier).toMatch(/^[a-f0-9]{64}$/);
    expect(start).toHaveBeenCalledWith(
      createHash('sha256').update(body.verifier).digest('hex'),
      signal,
    );
    expect(connect).toHaveBeenCalledWith('https://music.example/launch', transaction);
    expect(cancel).toHaveBeenCalledWith(transaction);
    await connectDesktopYouTube(signal);
    expect(redeem.mock.calls[1][0].verifier).not.toBe(body.verifier);
  });

  it('does not start an unsupported or already-aborted attempt', async () => {
    bridge.available = false;
    await expect(connectDesktopYouTube(new AbortController().signal)).rejects.toThrow(
      'Update Eternal',
    );
    bridge.available = true;
    const abort = new AbortController();
    abort.abort();
    await expect(connectDesktopYouTube(abort.signal)).rejects.toThrow();
    expect(start).not.toHaveBeenCalled();
  });

  it('cancels pending native completion on abort and never redeems a late response', async () => {
    let finish: ((value: string | null) => void) | undefined;
    connect.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const abort = new AbortController();
    const result = connectDesktopYouTube(abort.signal);
    await vi.waitFor(() => expect(connect).toHaveBeenCalled());
    abort.abort();
    expect(cancel).toHaveBeenCalledWith(transaction);
    finish?.(code);
    await expect(result).rejects.toThrow();
    expect(redeem).not.toHaveBeenCalled();
  });

  it('rejects cancellation, expired results, and failed redemption with cleanup', async () => {
    connect.mockResolvedValueOnce(null);
    await expect(connectDesktopYouTube(new AbortController().signal)).rejects.toThrow(
      'cancelled or expired',
    );
    expect(redeem).not.toHaveBeenCalled();
    redeem.mockResolvedValueOnce({ success: false, data: null });
    await expect(connectDesktopYouTube(new AbortController().signal)).rejects.toThrow(
      'Could not connect YouTube',
    );
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it('shows useful errors without exposing IPC or HTTP details', async () => {
    start.mockRejectedValueOnce(new Error('Request failed with status code 503'));
    await expect(connectDesktopYouTube(new AbortController().signal)).rejects.toThrow(
      'Could not start YouTube authentication. Try again.',
    );
    expect(connect).not.toHaveBeenCalled();
    connect.mockRejectedValueOnce(
      new Error("Error invoking remote method 'desktop:connect-youtube'"),
    );
    await expect(connectDesktopYouTube(new AbortController().signal)).rejects.toThrow(
      'Could not open YouTube authentication in your browser. Try again.',
    );
    expect(redeem).not.toHaveBeenCalled();
    redeem.mockRejectedValueOnce(new Error('Request failed with status code 400'));
    await expect(connectDesktopYouTube(new AbortController().signal)).rejects.toThrow(
      'Could not finish connecting YouTube. Try again.',
    );
    expect(cancel).toHaveBeenCalledTimes(2);
  });
});
