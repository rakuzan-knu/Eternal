import { chatApi } from '@/entities/chat';
import { encryptMessageForPeer, ensureMessageIdentityRegistered } from '../lib/e2ee/messageE2ee';
import { nextMessageSeq } from '../lib/e2ee/replayStore';

/** Send through the confirmed HTTP path while preserving the chat's E2EE protocol. */
export async function sendDirectMessage(
  conversationId: string,
  peerUserId: string,
  senderId: string,
  text: string,
  clientMessageId: string = crypto.randomUUID(),
) {
  await ensureMessageIdentityRegistered();
  const encrypted = await encryptMessageForPeer(text, peerUserId, {
    conversationId,
    senderId,
    seq: nextMessageSeq(conversationId),
  });
  const message = await chatApi.sendMessage(conversationId, {
    // Match the messenger's keyless-peer policy. Pin-change exceptions above propagate.
    text: encrypted ?? text,
    clientMessageId,
  });
  if (!message?.id) throw new Error('Message delivery was not confirmed.');
}
