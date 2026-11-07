import { integrationsApi } from '@/shared/api/integrationsApi';
import { getDesktopBridge } from './platform';

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');

export async function connectDesktopYouTube(signal: AbortSignal) {
  const desktop = getDesktopBridge();
  if (!desktop?.connectYouTube || !desktop.cancelYouTube)
    throw new Error('Update Eternal to connect YouTube through your browser.');
  signal.throwIfAborted();
  const verifier = hex(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = hex(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))),
  );
  const start = await integrationsApi.startDesktopYouTube(challenge, signal).catch(() => {
    signal.throwIfAborted();
    throw new Error('Could not start YouTube authentication. Try again.');
  });
  signal.throwIfAborted();
  const cancel = () => {
    void desktop.cancelYouTube?.(start.transaction).catch(() => {});
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    const code = await desktop.connectYouTube(start.url, start.transaction).catch(() => {
      signal.throwIfAborted();
      throw new Error('Could not open YouTube authentication in your browser. Try again.');
    });
    signal.throwIfAborted();
    if (!code) throw new Error('YouTube authentication was cancelled or expired. Try again.');
    const result = await integrationsApi
      .redeemDesktopYouTube({ code, transaction: start.transaction, verifier }, signal)
      .catch(() => {
        signal.throwIfAborted();
        throw new Error('Could not finish connecting YouTube. Try again.');
      });
    signal.throwIfAborted();
    if (!result.success || !result.data) throw new Error('Could not connect YouTube. Try again.');
    return result.data;
  } finally {
    signal.removeEventListener('abort', cancel);
    cancel();
  }
}
