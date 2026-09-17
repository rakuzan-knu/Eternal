import { useEffect, useState } from 'react';
import { e2eeManager } from '@/shared/lib/crypto/e2ee';
import { decryptMessageForDisplay, extractPlainPreview } from '../lib/e2ee/messageE2ee';

const LOCKED_LABEL = 'End-to-End Encrypted message';

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
  const [decrypted, setDecrypted] = useState<string>(() =>
    isEnvelope ? LOCKED_LABEL : extractPlainPreview(raw),
  );

  useEffect(() => {
    if (!isEnvelope) return;
    let cancelled = false;
    setDecrypted(LOCKED_LABEL);
    void decryptMessageForDisplay(body, { peerUserId, conversationId, senderId }).then((res) => {
      if (!cancelled) setDecrypted(res.text);
    });
    return () => {
      cancelled = true;
    };
  }, [body, peerUserId, conversationId, senderId, isEnvelope]);

  if (!isEnvelope) return extractPlainPreview(raw);
  return decrypted;
}
