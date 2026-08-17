import { describe, it, expect } from 'vitest';
import { getMessageToastPreview } from '../getMessageToastPreview';
import type { MessageView, AttachmentView } from '@/entities/chat/model/types';

describe('getMessageToastPreview', () => {
  it('returns deleted message string when isDeleted is true', () => {
    const msg: Partial<MessageView> = { isDeleted: true, body: 'Deleted text', attachments: [] };
    expect(getMessageToastPreview(msg as MessageView)).toBe('This message was deleted');
  });

  it('returns trimmed body when present', () => {
    const msg: Partial<MessageView> = {
      isDeleted: false,
      body: '  Hello world!  ',
      attachments: [],
    };
    expect(getMessageToastPreview(msg as MessageView)).toBe('Hello world!');
  });

  it('returns attachment type description when body is empty', () => {
    const imageMsg: Partial<MessageView> = {
      isDeleted: false,
      body: '',
      attachments: [{ id: 'a1', url: '', type: 'IMAGE' } as unknown as AttachmentView],
    };
    expect(getMessageToastPreview(imageMsg as MessageView)).toBe('Sent a photo');

    const videoMsg: Partial<MessageView> = {
      isDeleted: false,
      body: '',
      attachments: [{ id: 'a2', url: '', type: 'VIDEO' } as unknown as AttachmentView],
    };
    expect(getMessageToastPreview(videoMsg as MessageView)).toBe('Sent a video');
  });
});
