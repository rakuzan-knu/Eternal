import { MessageView } from '@/entities/chat';
import { e2eeManager } from '@/shared/lib/crypto/e2ee';

export function getMessageToastPreview(message: MessageView) {
  if (message.isDeleted) return 'This message was deleted';
  if (message.body?.trim()) {
    const trimmed = message.body.trim();
    // Never leak ciphertext JSON into notifications — the envelope is opaque
    // by design; toasts stay generic until the conversation is opened.
    if (e2eeManager.isEncrypted(trimmed)) return 'New encrypted message';
    return trimmed;
  }

  const attachment = message.attachments?.[0];
  if (!attachment) {
    if (message.messageType === 'AUDIO') return 'Sent a voice message';
    if (message.messageType === 'VIDEO') return 'Sent a video message';
    return 'New message';
  }

  const isVideoNote =
    attachment.type === 'VIDEO' &&
    (attachment.fileName?.includes('video_note') ||
      attachment.mimeType?.includes('video_note') ||
      (attachment.width && attachment.height && attachment.width === attachment.height));

  if (isVideoNote) return 'Sent a video message';
  if (attachment.type === 'AUDIO') return 'Sent a voice message';
  if (attachment.type === 'IMAGE') return 'Sent a photo';
  if (attachment.type === 'VIDEO') return 'Sent a video';
  if (attachment.type === 'GIF') return 'Sent a GIF';
  if (attachment.type === 'LINK') return 'Sent a link';
  if (attachment.type === 'FILE') return `Sent a file: ${attachment.fileName || 'file'}`;
  return 'Sent an attachment';
}
