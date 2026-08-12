import { MessageView } from '../../../entities/chat/model/types';

export function getMessageToastPreview(message: MessageView) {
  if (message.isDeleted) return 'This message was deleted';
  if (message.body?.trim()) return message.body.trim();

  const attachment = message.attachments[0];
  if (!attachment) return 'New message';

  if (attachment.type === 'IMAGE') return 'Sent a photo';
  if (attachment.type === 'VIDEO') return 'Sent a video';
  if (attachment.type === 'AUDIO') return 'Sent an audio message';
  if (attachment.type === 'GIF') return 'Sent a GIF';
  if (attachment.type === 'LINK') return 'Sent a link';
  return 'Sent an attachment';
}
