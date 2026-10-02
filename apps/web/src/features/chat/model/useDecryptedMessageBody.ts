import { useEffect, useState } from 'react';
import { e2eeManager } from '@/shared/lib/crypto/e2ee';
import { decryptMessageForDisplay, extractPlainPreview } from '../lib/e2ee/messageE2ee';

const LOCKED_LABEL = 'End-to-End Encrypted message';

const decryptedBodyCache = new Map<string, string>();

/** Primes the cache with known plaintext (e.g. immediately after encrypting on send) */
export function cacheDecryptedBody(body: string, text: string): void {
  if (body && text) {
    decryptedBodyCache.set(body, text);
  }
}

/**
 * Resolves the display text for a message body. Plaintext (and the legacy
 * dev-preview `{e2ee:true,text}` shape, which was never encrypted) renders
 * synchronously; real envelopes decrypt asynchronously with the 1:1 peer
 * key, showing the locked label until then (or permanently when the
 * peer key is unavailable / decryption fails / a replay is rejected).
 */
export function useDecryptedMessageBody(
  body: string | null | undefined,
  peerUserId: string | null | undefined,
  conversationId: string | null | undefined,
  senderId: string | null | undefined,
): string {
  const raw = body ?? '';
  const isEnvelope = e2eeManager.isEncrypted(body);

  const [decrypted, setDecrypted] = useState<string>(() => {
    if (!isEnvelope) return extractPlainPreview(raw);
    if (body && decryptedBodyCache.has(body)) {
      return decryptedBodyCache.get(body)!;
    }
    return LOCKED_LABEL;
  });

  useEffect(() => {
    if (!isEnvelope || !body) return;
    if (decryptedBodyCache.has(body)) {
      setDecrypted(decryptedBodyCache.get(body)!);
      return;
    }

    let cancelled = false;
    setDecrypted(LOCKED_LABEL);
    void decryptMessageForDisplay(body, { peerUserId, conversationId, senderId }).then(
      async (res) => {
        if (cancelled) return;
        if (res.status === 'decrypted') {
          decryptedBodyCache.set(body, res.text);
          setDecrypted(res.text);
        } else if (res.status === 'replay' && decryptedBodyCache.has(body)) {
          setDecrypted(decryptedBodyCache.get(body)!);
        } else {
          // If first attempt returned locked/error, retry once after short delay
          // in case peer identity key registration just completed
          try {
            await new Promise((r) => setTimeout(r, 600));
            if (cancelled) return;
            const retryRes = await decryptMessageForDisplay(body, {
              peerUserId,
              conversationId,
              senderId,
            });
            if (cancelled) return;
            if (retryRes.status === 'decrypted') {
              decryptedBodyCache.set(body, retryRes.text);
              setDecrypted(retryRes.text);
              return;
            }
          } catch {
            // ignore retry error
          }
          setDecrypted(res.text);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [body, peerUserId, conversationId, senderId, isEnvelope]);

  if (!isEnvelope) return extractPlainPreview(raw);
  if (body && decryptedBodyCache.has(body)) {
    return decryptedBodyCache.get(body)!;
  }
  return decrypted;
}
